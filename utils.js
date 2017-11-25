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
    findFreePosNearby: function (roomObj, range, howmany = 3, filter) {
        let pos = roomObj.pos,
            room = roomObj.room;

        if (this.isWallTerrain(pos)) {
            pos = this.findFreeAdjecentPos(roomObj);
        }

        // start in a corner and work across
        let matrix = this.getNearby(room, pos, range, false);
        for (let i in matrix) {
            for (let j in matrix[i]) {
                let res = matrix[i][j].reduce((acc, o) => {

                    if (acc < 2 && o.type === 'terrain' && o.terrain === 'wall') {
                        return 2;
                    } else if (o.type === 'structure' && o.structure.structureType === STRUCTURE_EXTENSION) {
                        return 3;
                    } else if (o.type === 'constructionSite' && o.constructionSite.structureType === STRUCTURE_EXTENSION) {
                        return 3;
                    }
                    return acc;
                }, 0);
                matrix[i][j] = res;
            }
        }

        // guide:
        // 0 = free
        // 1 = free for movement but not placement
        // 2 = wall
        // 3 = extension

        // now that we'e reduced. find the extensions and tight spaces
        function markAsExtension(i, j, print=false) {
            if(print) console.log(`out ${x}..${xlen}. ${yLower}..${yUpper}`)
            let x = module.exports.correctInvalidCoord(i-2);
            let xlen = module.exports.correctInvalidCoord(i+2);
            let yLower = module.exports.correctInvalidCoord(j-2);
            let yUpper = module.exports.correctInvalidCoord(j+2);
            // let x = i-2; 
            // let xlen = i+2;           
            // let yLower = j-2;
            // let yUpper = j+2;
            // if(print) console.log(`out ${x}..${xlen}. ${yLower}..${yUpper}`)
            // x = module.exports.correctInvalidCoord(x);
            // xlen = module.exports.correctInvalidCoord(xlen);
            // yLower = module.exports.correctInvalidCoord(yLower);
            // yUpper = module.exports.correctInvalidCoord(yUpper);
            if(print) console.log(`cer ${x}..${xlen}. ${yLower}..${yUpper}`)
            for(;x<=xlen;x++) {
                for(let y=yLower;y<=yUpper;y++) {
                    if (!matrix[x]) continue;
                    if (matrix[x][y] === 0) {
                        matrix[x][y] = 1;
                    }
                }
            }
        }
        for (let i in matrix) {
            i = parseInt(i);
            for (let j in matrix[i]) {
                j = parseInt(j);
                if (matrix[i][j] === 3) { //extension
                    markAsExtension(i, j)
                }
                if (matrix[i][j] === 0) {
                    // check candidate for tight spaces
                    let x = this.correctInvalidCoord(i-1);
                    let xlen = this.correctInvalidCoord(i+1);
                    let yLower = this.correctInvalidCoord(j-1);
                    let yUpper = this.correctInvalidCoord(j+1);
                    let freeSpace = -1; //don't count the candidate
                    for(;x<=xlen;x++) {
                        for(let y=yLower;y<=yUpper;y++) {
                            if (!matrix[x] || matrix[x][y] <= 1) {
                                freeSpace++;
                            }
                            if (freeSpace >= 3) break;
                        }
                        if (freeSpace >= 3) break;
                    }
                    if (freeSpace < 3) { 
                        matrix[i][j] = 1;
                    }
                }
            }
        }
        let arr = [];
        for (let i in matrix) {
            i = parseInt(i);
            for (let j in matrix[i]) {
                j = parseInt(j);
                if (matrix[i][j] === 0) {
                    arr.push([j, i]);
                    markAsExtension(i, j);
                }
            }
        }
        
        //check path, make sure there isn't a wall between us
        arr = arr.map(x => new RoomPosition(x[0], x[1], room.name))
            .filter(target => {
                if (howmany == 0) return false; //we have enough

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
    gc: function () {
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
                //console.log('Clearing non-existing creep memory:', name);
            }
        }
    }
}