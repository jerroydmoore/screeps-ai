const Errors = require('errors');
const Constants = require('constants');
const Roads = require('roads');
const RoomUtils = require('rooms');
const CreepsBase = require('creeps');

const role = "Scout";
class RoleScout extends CreepsBase {
    constructor() {
        super(role);
    }
    attack (creep) {
        let closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
        if (closestHostile) {
            Memory.rooms[creep.pos.roomName].hasEnemy = 1;
            let code = creep.attack(closestHostile);
            if (code === OK) {
                creep.busy = 1;
                creep.say('😡 attack!')
                return code;
            } else if (code === ERR_NOT_IN_RANGE) {
                this.moveTo(creep, closestHostile);
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
                this.moveTo(creep, closestHostile);
                creep.busy = 1;
                return code;
            } else {
                Errors.check(creep, `attack(${closestHostile})`, code);
            }
        }
        Memory.rooms[creep.pos.roomName].hasEnemy = 0;
    }
    run (creep) {
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
    }
    regularOrders(creep) {
        // attack something in this room.
        this.attack(creep);

        // then pick a direction, and exit that way.
        if (! creep.busy) {
            if (! this.moveToNextRoom(creep, true)) {
                this.regularOrders(creep);
            }
        }
    }
}

module.exports = new RoleScout();
