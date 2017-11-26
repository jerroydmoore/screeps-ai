module.exports = {
    getNearby: function(room, pos, range, asArray=true) {
        return room.lookAtArea(
            this.correctInvalidCoord(pos.y-range),
            this.correctInvalidCoord(pos.x-range),
            this.correctInvalidCoord(pos.y+range),
            this.correctInvalidCoord(pos.x+range), asArray);
    },
    findNearby: function (room, pos, range, filter) {
        let adjacenctPoints = this.getNearby(room, pos, range),
            obj = adjacenctPoints.find(filter);
        return obj;
    },
    //isFreeTerrain: (pos) => !this.isWallTerrain(pos),
    isWallTerrain: function (pos) {
        return Game.map.getTerrainAt(pos) === 'wall';
    },
    correctInvalidCoord: function (x) {
        if (x < 2) return 2;
        if (x > 47) return 47;
        return x;
    },
    isPosValid: function (x, y) {
        return this.correctInvalidCoord(x) === x && this.correctInvalidCoord(y) === y;
    },
    findFreeAdjecentPos: function (target) {
        let pos = target.pos || target,
            room = target.room || Game.rooms[pos.roomName],
            obj = this.findNearby(room, pos, 1, (p) => p.type === 'terrain' && p.terrain !== 'wall' && p.x !== pos.x && p.y !== pos.y);

        if (!obj) {
            console.log(`findFreeAdjecentPos(${target}) could not find any free adjecent pos`);
            return;
        }
        return new RoomPosition(obj.x, obj.y, room.name);
    },
    AVOID_LIST: {
        [STRUCTURE_EXTENSION]: { range: 2, filter: (o) => (o.type === LOOK_STRUCTURES && o.structure.structureType === STRUCTURE_EXTENSION) || (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === STRUCTURE_EXTENSION)},
        [STRUCTURE_TOWER]: { range: 7, filter: (o) => (o.type === LOOK_STRUCTURES && o.structure.structureType === STRUCTURE_EXTENSION) || (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === STRUCTURE_EXTENSION)},
        [LOOK_SOURCES]: {range : 1, filter: (o) => o.type === LOOK_SOURCES }
    },
    findFreePosNearby: function (roomObj, range, howmany, numOfFreeAdjecentSpaces=3, avoidEachOtherRange=2, avoidList=[]) {
        let pos = roomObj.pos,
            room = roomObj.room;

        const FREE = 0, FREE_BUT_DISQUALIFIED = 1, OCCUPIED = 2, AVOID_AREA = 3;
        const FREE_ENTRY = {type: FREE, range: 0}
        const DISQUALIFIED_ENTRY = {type: FREE_BUT_DISQUALIFIED, range: 0}
        const OCCUPIED_ENTRY = {type: OCCUPIED, range: 0}
        avoidList.forEach(x => x.type = AVOID_AREA)

        // We can't use findPath* functions if pos is not free
        if (this.isWallTerrain(pos)) {
            pos = this.findFreeAdjecentPos(roomObj);
        }

        // start in a corner and work across
        let matrix = this.getNearby(room, pos, range, false);
        for (let i in matrix) {
            for (let j in matrix[i]) {
                matrix[i][j] = matrix[i][j].reduce((res, o) => {
                    if (res.type !== AVOID_AREA && ((o.type === 'terrain' && o.terrain === 'wall') || o.type === 'structure' || o.type === 'constructionSite')) {
                        res = OCCUPIED_ENTRY;
                    }
                    avoidList.forEach((avoidEntry) => {
                        // Check for range, bc if two avoids match, take the bigger of the two
                        if (avoidEntry.filter(o) && avoidEntry.range > res.range) {
                            res = avoidEntry;
                        }
                    })
                    return res;
                }, FREE_ENTRY);
            }
        }

        // now that we'e reduced. find the avoided areas, e.g. extensions, and tight spaces
        for (let i in matrix) {
            i = parseInt(i);
            for (let j in matrix[i]) {
                j = parseInt(j);
                if (matrix[i][j].type === AVOID_AREA) {
                    this.markNearby(matrix, i, j, [FREE_ENTRY], DISQUALIFIED_ENTRY, matrix[i][j].range)
                } else if (matrix[i][j] === FREE_ENTRY) {
                    // check candidate for tight spaces
                    let x = this.correctInvalidCoord(i-1);
                    let xlen = this.correctInvalidCoord(i+1);
                    let yLower = this.correctInvalidCoord(j-1);
                    let yUpper = this.correctInvalidCoord(j+1);
                    let freeSpace = -1; //don't count the candidate
                    for(;x<=xlen;x++) {
                        for(let y=yLower;y<=yUpper;y++) {
                            if (x === i && y === j) continue;
                            if (!matrix[x] || matrix[x][y] === FREE_ENTRY || matrix[x][y] === DISQUALIFIED_ENTRY) {
                                freeSpace++;
                            }
                            if (freeSpace >= numOfFreeAdjecentSpaces) break;
                        }
                        if (freeSpace >= numOfFreeAdjecentSpaces) break;
                    }
                    if (freeSpace < numOfFreeAdjecentSpaces) { 
                        matrix[i][j] = DISQUALIFIED_ENTRY;
                    }
                }
            }
        }
        let arr = [];
        for (let i in matrix) {
            i = parseInt(i);
            for (let j in matrix[i]) {
                j = parseInt(j);
                if (matrix[i][j] === FREE_ENTRY) {
                    arr.push([j, i]); // swap i and j to be compatible with Screep convention
                    // update the matrix with the newly placed "thing"
                    this.markNearby(matrix, i, j, [FREE_ENTRY], DISQUALIFIED_ENTRY, avoidEachOtherRange);
                }
            }
        }
        
        //check path's distance < desired range, e.g. a wall between us, forcing us to go the long way
        arr = arr.map(x => new RoomPosition(x[0], x[1], room.name))
            .filter(target => {
                if (howmany == 0) return false; //we have enough confirmed free spaces

                let path = target.findPathTo(pos),
                    distance = path.length;
                if (distance <= range) {
                    howmany--;
                    return true;
                }
                return false;
            });
        return arr;
    },
    markNearby: function(matrix, i, j, replacementMembers, newValue, range) {
        let x = this.correctInvalidCoord(i-range),
            xlen = this.correctInvalidCoord(i+range),
            yLower = this.correctInvalidCoord(j-range),
            yUpper = this.correctInvalidCoord(j+range);

        for(;x<=xlen;x++) {
            for(let y=yLower;y<=yUpper;y++) {
                if (!matrix[x] || !matrix[x][y] || (x === i && y === j)) continue;
                if (replacementMembers.find(o => o === matrix[x][y])) {
                    matrix[x][y] = newValue;
                }
            }
        }
    },
    gc: function () {
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
                //console.log('Clearing non-existing creep memory:', name);
            }
        }
    }
}