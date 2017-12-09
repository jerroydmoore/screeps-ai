function findStructureAndSiteByType (desiredStructureType) {
    return function (o) {
        return (o.type === LOOK_STRUCTURES && o.structure.structureType === desiredStructureType)
            || (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === desiredStructureType);
    };
}

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
    findStructureAndSiteByType: findStructureAndSiteByType,
    AVOID_LIST: {
        [STRUCTURE_EXTENSION]: { range: 2, filter: findStructureAndSiteByType(STRUCTURE_EXTENSION) },
        [STRUCTURE_TOWER]: { range: 7, filter: findStructureAndSiteByType(STRUCTURE_TOWER) },
        [LOOK_SOURCES]: { range : 1, filter: (o) => o.type === LOOK_SOURCES }
    },
    findFreePosNearby: function* (target, _range, numOfFreeAdjecentSpaces=3, avoidEachOtherRange=2, avoidList=[]) {
        let pos = target.pos || target,
            room = target.room,
            range = _range+1;

        //console.log('findFreePosNearby(' + target + pos + _range);

        const FREE = 0, FREE_BUT_DISQUALIFIED = 1, OCCUPIED = 2, AVOID_AREA = 3;
        const FREE_ENTRY = {type: FREE, range: 0};
        const DISQUALIFIED_ENTRY = {type: FREE_BUT_DISQUALIFIED, range: 0};
        const OCCUPIED_ENTRY = {type: OCCUPIED, range: 0};
        avoidList.forEach(x => x.type = AVOID_AREA);

        // start in a corner and work across
        let matrix = this.getNearby(room, pos, range, false),
            // we want to mark the border as a DISQUALIFIED_ENTRY
            iKeys = Object.keys(matrix),
            iLimit = [iKeys[0], iKeys[iKeys.length-1]],
            jKeys = Object.keys(matrix[iKeys[0]]),
            jLimit = [jKeys[0], jKeys[jKeys.length-1]];

        for (let i in matrix) {
            for (let j in matrix[i]) {
                let initialValue = FREE_ENTRY;
                if (iLimit.find(x => x === i) || jLimit.find(x => x === j)) {
                    initialValue = DISQUALIFIED_ENTRY;
                }
                matrix[i][j] = matrix[i][j].reduce((res, o) => {
                    if (res.type !== AVOID_AREA) {
                        if (o.type === 'terrain' && o.terrain === 'wall') {
                            res = OCCUPIED_ENTRY;
                        } else if (o.type === 'structure' && o.structure.structureType !== STRUCTURE_ROAD) {
                            res = OCCUPIED_ENTRY;
                        } else if (o.type === 'constructionSite'  && o.constructionSite.structureType !== STRUCTURE_ROAD) {
                            res = OCCUPIED_ENTRY;
                        }
                    }
                    avoidList.forEach((avoidEntry) => {
                        // Check for range, bc if two avoids match, take the bigger of the two
                        if (avoidEntry.filter(o) && avoidEntry.range > res.range) {
                            res = avoidEntry;
                        }
                    });
                    return res;
                }, initialValue);
            }
        }

        // now that we'e reduced. find the avoided areas, e.g. extensions, and tight spaces
        for (let i in matrix) {
            i = parseInt(i);
            for (let j in matrix[i]) {
                j = parseInt(j);
                if (matrix[i][j].type === AVOID_AREA) {
                    this.markNearby(matrix, i, j, [FREE_ENTRY], DISQUALIFIED_ENTRY, matrix[i][j].range);
                } else if (matrix[i][j].type === FREE) {

                    // check candidate for tight spaces
                    let x = this.correctInvalidCoord(i-1);
                    let xlen = this.correctInvalidCoord(i+1);
                    let yLower = this.correctInvalidCoord(j-1);
                    let yUpper = this.correctInvalidCoord(j+1);
                    let freeSpace = 8;
                    for(;x<=xlen;x++) {
                        for(let y=yLower;y<=yUpper;y++) {
                            if (x === i && y === j) continue;
                            if (! matrix[x] || !matrix[x][y]) {
                                continue;
                            }

                            if (matrix[x][y].type === OCCUPIED || matrix[x][y].type === AVOID_AREA) {
                                freeSpace--;
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
        
        // yield free spaces
        for (let i in matrix) {
            i = parseInt(i);
            for (let j in matrix[i]) {
                j = parseInt(j);
                if (matrix[i][j] !== FREE_ENTRY) continue;

                // Swap i and j to be compatible with Screep convention
                let freePos = new RoomPosition(j, i, room.name),
                    pathFinder = PathFinder.search(freePos, {pos, range: 1}),
                    path = pathFinder.path,
                    distance = path.length;

                // Check path's distance < desired range, e.g. a wall between us, forcing us to go the long way
                if (distance > range) continue;

                yield freePos;

                // Update the matrix with the newly placed "thing"
                this.markNearby(matrix, i, j, [FREE_ENTRY], DISQUALIFIED_ENTRY, avoidEachOtherRange);
            }
        }
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
        for(let name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
                //console.log('Clearing non-existing creep memory:', name);
            }
        }
    }
};
