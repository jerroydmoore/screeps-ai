const Errors = require('errors');
const Roads = require('roads');
const utils = require('utils');
const Phases = require('phases');
const Constants = require('constants');

const BODYPART_COST = {
    [MOVE]: 50,
    [WORK]: 100,
    [ATTACK]: 80,
    [CARRY]: 50,
    [HEAL]: 250,
    [RANGED_ATTACK]: 150,
    [TOUGH]: 10,
    [CLAIM]: 600
};

class CreepsBase {
    constructor(role) {
        this.roleName = role
    }
    is (creep) {
        return creep.name.startsWith(this.roleName);
    }
    suicide(creep) {
        // unable to move?
        creep.say('suicide');
        console.log(`${creep}${creep.pos} is suiciding`);
        creep.busy = 1;
        creep.suicide();
    }
    moveTo(creep, target, color, reusePath) {
        let opts = {}, code;

        if (creep.busy) {
            return;
        }
        if (color) {
            opts.visualizePathStyle = { stroke: color, opacity: 1, lineStyle: 'dotted' }
        }
        if (reusePath) {
            opts.reusePath = reusePath;
        }

        code = creep.moveTo(target, opts);
        if (code === ERR_NO_PATH) {
            // ignore these. We can't cound blocked, because they re-path after 5 turns.
            creep.say(Errors.errorEmoji[ERR_NO_PATH]);
            return OK; 
        }
        Errors.check(creep, `moveTo ${target}`, code);
        if (code === OK || code === ERR_TIRED) {
            creep.busy = 1;
            if(code === OK && creep.memory.blocked && --creep.memory.blocked >= 0) {
                delete creep.memory.blocked;
            }
            Roads.shouldBuildAt(creep)
            return OK;
        } else if (code === ERR_NO_BODYPART) {
            // unable to move?
            this.suicide(creep);
        }
        return code;
    }
    harvest (creep) {
        let sourceId = creep.memory[Constants.MemoryKey[LOOK_SOURCES]],
            source = undefined;
        if (sourceId) {
            source = Game.getObjectById(sourceId);
        } else {
            source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        if (source) {
            creep.memory[Constants.MemoryKey[LOOK_SOURCES]] = source.id;
            let code = creep.harvest(source);
            if (code === ERR_NOT_IN_RANGE) {
                let code = this.moveTo(creep, source, '#ffaa00'); //orange
                // What about using Storage???
            } else if (code === ERR_NOT_ENOUGH_RESOURCES) {
                delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            } else if (code === ERR_NO_BODYPART) {
                // unable to harvest?
                this.suicide(creep);
            }
        } else {
            console.log(`${creep} at ${creep.pos} could not find any available sources`);
            creep.say('😰 No Srcs');
        }
        creep.busy = 1;
    }
    spawn (spawner) {
        let phase = Phases.getCurrentPhaseInfo(spawner),
            availableBodyParts = phase[this.roleName].parts,
            bodyParts = [],
            action = 'spawnCreep',
            cost = 0;
        for(let i=0;i<availableBodyParts.length;i++) {
            bodyParts.push(availableBodyParts[i]);
            cost = this.bodyPartCost(bodyParts);
            if(cost > spawner.room.energyAvailable) {
                // we found our limit, remove the excess body part and spawn.
                cost -= BODYPART_COST[bodyParts.pop()];
                break;
            }
        }
        
        let label = this.roleName + Game.time;
        console.log(`Spawning ${label} ` + JSON.stringify(bodyParts) + ` cost ${cost}/${spawner.room.energyAvailable}`);
        let code = spawner[action](bodyParts, label);
        Errors.check(spawner, action, code);
        utils.gc(); // garbage collect the recently deseased creep
        return code;
    }
    /* static */ bodyPartCost (bodyParts) {
        return bodyParts.reduce((acc, part) => {
            return acc + BODYPART_COST[part];
        }, 0);
    }
    /* static */ bodyPartRenewCost (bodyParts) {
        let cost = this.bodyPartCost(bodyParts);
        let body_size = bodyParts.length;
        return Math.ceil(cost/2.5/body_size)
    }

    run (creep) {
        this.shouldRenew(creep);
    }
    shouldRenew(creep) {
        // Check if we need to heal.
        if (!creep.memory.renew && creep.ticksToLive < 200 && creep.room.energyAvailable >= 600) {
            let capacity = creep.room.energyCapacityAvailable,
                energy = creep.room.energyAvailable,
                parts = creep.body.map(x => x.type),
                cost = this.bodyPartCost(parts),
                renewCost = this.bodyPartRenewCost(parts)
            
            if (capacity > 700) capacity = 700; // cap it
            let ratio = cost / capacity;
            if (ratio > 0.8) {
                // we want to keep this!
                let spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_SPAWN })
                if (spawn) {
                    creep.memory.renew = spawn.id;
                    creep.say('⛑ Healing');
                    //console.log(`Renewing ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${ratio}`)
                } else {
                    creep.memory.renew = -1;
                    console.log('cannot renew ${creep} in room ${creep.room}: no spawner found')
                }
            }
        }
        if (creep.memory.renew && creep.memory.renew !== -1) {
            let spawn = Game.getObjectById(creep.memory.renew)
            let code = spawn.renewCreep(creep);
            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NOT_IN_RANGE || code === ERR_BUSY) {
                this.moveTo(creep, spawn, '#FFFFFF');
            } else if (code === ERR_FULL || code === ERR_NOT_ENOUGH_ENERGY) {
                delete creep.memory.renew
            } else {
                Errors.check(spawn, `renewCreep(${creep})`, code);
                creep.memory.renew = -1;
            }
            return code;
        }
        return false;

    }
    moveToNextRoom (creep, hostiles=false) {
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
                    return false;
                }
            }
            target = dest.exit;
            return true;
        }
        
        if (! target && hostiles) {
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

            let code = this.moveTo(creep, dest, '#5d80b2', 50);
            Errors.check(creep, `moveTo(${dest})`, code);
            if (code === ERR_INVALID_TARGET) {
                delete creep.memory.roomOrders
            }
            
        } else {
            console.log(`${creep} could not find an exit/target`);
        }
    }
}

module.exports = CreepsBase;
