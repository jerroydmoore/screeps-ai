const Errors = require('errors');
const Constants = require('constants');
const Roads = require('roads');
const CreepAction = require('creeps');
const RoomUtils = require('rooms');
const CreepUtils = require('creeps');

module.exports = {
    roleName: "Scout",
    
    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    attack: function (creep) {
        let closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
        if(closestHostile) {
            Memory.rooms[creep.pos.roomName].hasEnemy = 1;
            let code = creep.attack(closestHostile);
            if (code === OK) {
                creep.busy = 1;
                creep.say('😡 attack!')
                return code;
            } else if (code === ERR_NOT_IN_RANGE) {
                CreepUtils.moveTo(creep, closestHostile);
                creep.busy = 1;
                return code;
            } else {
                Errors.check(creep, `attack(${closestHostile})`, code);
            }
        }

        closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(closestHostile) {
            Memory.rooms[creep.pos.roomName].hasEnemy = 1;
            let code = creep.attack(closestHostile);
            if (code === OK) {
                creep.busy = 1;
                creep.say('😡 attack!')
                return code;
            } else if (code === ERR_NOT_IN_RANGE) {
                CreepUtils.moveTo(creep, closestHostile);
                creep.busy = 1;
                return code;
            } else {
                Errors.check(creep, `attack(${closestHostile})`, code);
            }
        }
        Memory.rooms[creep.pos.roomName].hasEnemy = 0;
    },
    moveToNextRoom: function (creep) {
        let target,
            roomName = creep.pos.roomName;
        
        if (creep.memory.roomOrders && creep.memory.roomOrders.length) {
            let dest = creep.memory.roomOrders[0];
            if (dest.roomName !== roomName) {
                // we've entered the next room, update orders
                creep.memory.roomOrders.shift();
                if (creep.memory.roomOrders.length) {
                    console.log(`${creep} ${creep.pos} room changed ${dest.roomName} -> ${roomName} ` + JSON.stringify(creep.memory.roomOrders));
                    dest = creep.memory.roomOrders[0];
                } else {
                    // we've entered our destination room, attack!
                    delete creep.memory.roomorders;
                    return this.regularOrders(creep);
                }
            }
            target = dest.exit;
        }
        
        if (! target) {
            // no orders, find a room with an enemy and go there.
            for(let roomName in Memory.rooms) {
                if (Memory.rooms[roomName].hasEnemy !== 1) continue;
                
                creep.memory.roomOrders = Game.map.findRoute(creep.room, roomName).map(x => { return {exit: x.exit, roomName: x.room}})
                console.log('Game orders');
                console.log(JSON.stringify(creep.memory.roomOrders))
                target = creep.memory.roomOrders[0].exit;
            }
        }
        if (target === undefined) {
            // otherwise, find the closest unknown room, and go there.
            let ref = Memory.rooms[roomName];
            // console.log(creep + 'about to execute bfs')
            
            let path = RoomUtils.bfs(ref);
            
            let displayPath = path.map(x => { return {exit: RoomUtils.EXIT_NAME[x.exit], roomName: x.roomName} });
            console.log(creep + ' bfs Path ' + JSON.stringify(displayPath));

            creep.memory.roomOrders = path;
            target = target = creep.memory.roomOrders[0].exit;
        }
        if (target) {
            let dest = creep.pos.findClosestByPath(target);
            // console.log(`${creep} ${creep.pos} scouting to ${dest} ${RoomUtils.EXIT_NAME[target]}(${target})`)

            let code = CreepUtils.moveTo(creep, dest, '#5d80b2', 50);
            Errors.check(creep, `moveTo(${dest})`, code);
            if (code === ERR_INVALID_TARGET) {
                delete creep.memory.roomOrders
            }
            
        } else {
            console.log(`${creep} could not find an exit/target`);
        }
    },
    run: function (creep) {
// return;

        let roomName = creep.pos.roomName;
        if (! Memory.rooms) Memory.rooms = {}
        if (! creep.memory.prevRoom) {
            creep.memory.prevRoom = roomName;
        }
        
        //console.log(`${roomName} ` + JSON.stringify(Memory.rooms[roomName]));
        if (! Memory.rooms[roomName]) {
            let defaultObj = {roomName: roomName, exits: {} };
            Memory.rooms[roomName] = defaultObj;
            let exits = Game.map.describeExits(roomName)
            RoomUtils.EXITS.forEach(exitDir => {
                let isConnected = !!exits[exitDir];
                 
                if (isConnected) {
                    let name = exits[exitDir];
                    if (Memory.rooms[name]) {
                        defaultObj.exits[exitDir] = name;
                    } else {
                        defaultObj.exits[exitDir] = true;
                    }
                } else {
                    defaultObj.exits[exitDir] = false;
                }
            });
            // TODO determine if it's neutral. Say/Mark it on the world map.
            // creep.signController(controller, text)
        }
        Memory.rooms[roomName].lastChecked = Game.time;

        // if we changed rooms, update the Exits
        if (creep.memory.prevRoom !== roomName && creep.memory.roomOrders && creep.memory.roomOrders.length) {
            let lastExitDir = creep.memory.roomOrders[0].exit,
                lastRoom = Memory.rooms[creep.memory.prevRoom];
            lastRoom.exits[lastExitDir] = roomName;
            console.log(`${creep} updated room ${creep.memory.prevRoom} exit ${RoomUtils.EXIT_NAME[lastExitDir]}(${lastExitDir}) to ${roomName} - ${JSON.stringify(lastRoom)}`)

            // update this room with last room info
            let oppositeExitDir;
            if (lastExitDir === FIND_EXIT_TOP) oppositeExitDir = FIND_EXIT_BOTTOM;
            if (lastExitDir === FIND_EXIT_BOTTOM) oppositeExitDir = FIND_EXIT_TOP;
            if (lastExitDir === FIND_EXIT_LEFT) oppositeExitDir = FIND_EXIT_RIGHT;
            if (lastExitDir === FIND_EXIT_RIGHT) oppositeExitDir = FIND_EXIT_LEFT;
            lastRoom = Memory.rooms[roomName];
            lastRoom.exits[oppositeExitDir] = creep.memory.prevRoom;
            console.log(`${creep} updated room ${roomName} exit ${RoomUtils.EXIT_NAME[oppositeExitDir]}(${oppositeExitDir}) to ${creep.memory.prevRoom} - ${JSON.stringify(lastRoom)}`)
            creep.memory.prevRoom = roomName;
        }
        this.regularOrders(creep);
    },
    regularOrders(creep) {
        // attack something in this room.
        this.attack(creep);

        // then pick a direction, and exit that way.
        if (! creep.busy) {
            this.moveToNextRoom(creep);
        }
    }
}