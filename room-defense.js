const utils = require('utils');
const BuildOrders = require('build-orders');

const protectionList = [ STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TOWER ];
const protectionFilter = (s) => protectionList.includes(s.structureType);

class RoomDefense {

    buildInRoom(room) {
        let mem = Memory.rooms[room.name];
        if (! mem || mem.phase < 3) {
            // Check if room is ready for defense
            return;
        }

        this.barricadeRoomController(room);
        let res = room.find(FIND_MY_STRUCTURES, { filter: protectionFilter });
        res.forEach((s) => {
            this.buildPerimeter(s.pos);
        });
        
        res = room.find(FIND_CONSTRUCTION_SITES, { filter: protectionFilter });
        res.forEach((s) => {
            this.buildPerimeter(s.pos);
        });
        
        res = BuildOrders.getAllScheduled(room).filter(protectionFilter);
        res.forEach((s) => {
            this.buildPerimeter(s.pos);
        });
    }
    buildPerimeter(pos, withStructure) {
        // Other classes can tell RoomDefense to defend a structure

        withStructure = withStructure || STRUCTURE_RAMPART;
        // console.log(`${pos} Fortifying with ${withStructure}`);
        pos = pos.pos || pos; // Accept either a RoomPosition or a Structure;

        let room = Game.rooms[pos.roomName],
            range = 1;

        if (! room) {
            console.log('Defense: cannot build rampart perimeter because room name not found for ' + pos);
        }
        let matrix = utils.getNearby(room, pos, range, false);
        // console.log(JSON.stringify(matrix));
        // utils.printMatrix(matrix, `${pos} Build Rampart Perimeter`, a => {
        //     let res = a.find(x => x.type === 'terrain');
        //     return res.terrain === 'wall' ? 1 : 0;
        // });

        for(let [j,i] of utils.getCoordsWithinRange(pos, range)) {
            let res = matrix[i][j].find(o => {
                if (o.type === LOOK_TERRAIN && o.terrain === 'wall') {
                    return true;
                } else if (o.type === LOOK_STRUCTURES && o.structure.structureType !== STRUCTURE_ROAD) {
                    return true;
                } else if (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType !== STRUCTURE_ROAD) {
                    return true;
                }
                let order = BuildOrders.getScheduledAt(room, pos);
                return order && order.type !== STRUCTURE_ROAD;
            });
            let targetPos = new RoomPosition(j, i, room.name);
            if (! res) {
                console.log(`${targetPos} Building Rampart`);
                // no wall nor blocking structures in the way nor planned build orders
                BuildOrders.schedule(room, withStructure, targetPos);
            // } else {
            //     console.log(`${targetPos} Not Building ${withStructure}: something in the way`);
            }
        }
    }
    barricadeRoomController(room) {
        this.buildPerimeter(room.controller, STRUCTURE_WALL);
    }
    fortifyExits(room) {
        // Detect where exits are and build a wall.
        console.log(room);
    }
}

module.exports = new RoomDefense();
