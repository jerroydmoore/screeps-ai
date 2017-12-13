const Errors = require('errors');
const RoomUtils = require('rooms');
const CreepsBase = require('creeps');
const roleBuilder = require('role.builder');

const role = 'Pilgrim';
class RolePilgrim extends CreepsBase {
    constructor() {
        super(role);
    }
    run (creep) {
        // this.preRun()

        let roomName = creep.pos.roomName;
        if (! creep.memory.prevRoom) {
            creep.memory.prevRoom = roomName;
        }
        
        Memory.rooms[roomName].lastChecked = Game.time;

        // if we changed rooms, update the Exits
        if (creep.memory.prevRoom !== roomName && creep.memory.roomOrders && creep.memory.roomOrders.length) {
            let lastExitDir = creep.memory.roomOrders[0].exit,
                lastRoom = Memory.rooms[creep.memory.prevRoom];
            lastRoom.exits[lastExitDir] = roomName;
            console.log(`${creep} updated room ${creep.memory.prevRoom} exit ${RoomUtils.EXIT_NAME[lastExitDir]}(${lastExitDir}) to ${roomName} - ${JSON.stringify(lastRoom)}`);

            // update this room with last room info
            let oppositeExitDir;
            if (lastExitDir === FIND_EXIT_TOP) oppositeExitDir = FIND_EXIT_BOTTOM;
            if (lastExitDir === FIND_EXIT_BOTTOM) oppositeExitDir = FIND_EXIT_TOP;
            if (lastExitDir === FIND_EXIT_LEFT) oppositeExitDir = FIND_EXIT_RIGHT;
            if (lastExitDir === FIND_EXIT_RIGHT) oppositeExitDir = FIND_EXIT_LEFT;
            lastRoom = Memory.rooms[roomName];
            lastRoom.exits[oppositeExitDir] = creep.memory.prevRoom;
            console.log(`${creep} updated room ${roomName} exit ${RoomUtils.EXIT_NAME[oppositeExitDir]}(${oppositeExitDir}) to ${creep.memory.prevRoom} - ${JSON.stringify(lastRoom)}`);
            creep.memory.prevRoom = roomName;
        }
        this.regularOrders(creep);
    }
    regularOrders(creep) {
        if (creep.memory.claimed === 2) {
            // spawner built, now become a builder and build it
            roleBuilder.run(creep);
        } else if (creep.room.controller && !creep.room.controller.my) {
            let controller = creep.room.controller;
            if (!controller.owner || !controller.owner.username) {
                //claim it!
                let code = creep.claimController(controller);
                if (code === OK) {
                    creep.busy = 1;
                    creep.memory.claimed = 1;
                    
                } else if (code === ERR_NOT_IN_RANGE) {
                    this.moveTo(creep, controller, '#b99cfb');
                    creep.busy = 1;
                } else if (code === ERR_GCL_NOT_ENOUGH) {
                    console.log('Not enough GCL to claim a room');
                    this.suicide(creep);
                } else {
                    Errors.check(creep, 'claimController', code);
                }
            }
        } else if (! creep.busy) {
            // then pick a direction, and exit that way.
            if (! this.moveToNextRoom(creep, false)) {
                this.regularOrders(creep);
            }
        }
    }
}

module.exports = new RolePilgrim();
