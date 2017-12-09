const Errors = require('errors');
const RoomUtils = require('rooms');
const Roads = require('roads');
const utils = require('utils');
const Phases = require('phases');
const Constants = require('constants');
const BuildOrders = require('build-orders');

// already declared
// const BODYPART_COST = {
//     [MOVE]: 50,
//     [WORK]: 100,
//     [ATTACK]: 80,
//     [CARRY]: 50,
//     [HEAL]: 250,
//     [RANGED_ATTACK]: 150,
//     [TOUGH]: 10,
//     [CLAIM]: 600
// };

class CreepsBase {
    constructor(role) {
        this.roleName = role;
    }
    is (creep) {
        return creep.name.startsWith(this.roleName);
    }
    suicide(creep) {
        // unable to move?
        creep.say('💀 suicide');
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
            opts.visualizePathStyle = { stroke: color, opacity: 1, lineStyle: 'dotted' };
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
            Roads.shouldBuildAt(creep);
            return OK;
        } else if (code === ERR_NO_BODYPART) {
            // unable to move?
            this.suicide(creep);
        }
        return code;
    }

    pickupFallenResource(creep) {

        let resource;
        if (!creep.memory.fallenResourceId) {
            resource = RoomUtils.findFallenResource(creep.pos.roomName);
        } else {
            try {
                resource = Game.getObjectById(creep.memory.fallenResourceId);
            } catch (err) {
                // Object was already picked up.
            }
        }
        if (!resource) {
            delete creep.memory.fallenResourceId;
            return false;
        }

        creep.memory.fallenResourceId = resource.id;
        let code = creep.pickup(resource);
        if (this.emote(creep, '👏️ pickup')) {
            console.log(`${creep} ${creep.pos} pick up resource at ${resource.pos}`);
        }
        if (code === ERR_NOT_IN_RANGE) {
            this.moveTo(creep, resource.pos, '#ffaa00');
        } else if (code === OK) {
            delete creep.memory.fallenResourceId;
            creep.busy = 1;
        } else {
            delete creep.memory.fallenResourceId;
            Errors.check(creep, `pickup(${resource} ${resource.pos})`, code);
            return false;
        }
        return true;
    }
    emote (creep, phrase, code=OK, errorList=[OK, ERR_NOT_IN_RANGE]) {
        if ( !phrase || creep.memory._say === phrase) return false;
        if (undefined ===errorList.find(c => c === code) ) return false;

        if (OK === creep.say(phrase)) {
            creep.memory._say = phrase;
            return true;
        }
        return false;
    }

    harvest (creep) {

        if (creep.busy) return;
        
        let sourceId = creep.memory[Constants.MemoryKey[LOOK_SOURCES]],
            source = undefined;
        if (sourceId) {
            source = Game.getObjectById(sourceId);
        } else if (! this.pickupFallenResource(creep)) {
            source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        if (source) {
            creep.memory[Constants.MemoryKey[LOOK_SOURCES]] = source.id;

            let code = creep.harvest(source);

            this.emote(creep, '🔄 harvest', code);

            if (code === ERR_NOT_IN_RANGE) {
                code = this.moveTo(creep, source, '#ffaa00'); //orange
                // What about using Storage???
            } else if (code === ERR_NOT_ENOUGH_RESOURCES) {
                delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            } else if (code === ERR_NO_BODYPART) {
                // unable to harvest?
                this.suicide(creep);
            }
        } else if (! creep.busy && this.emote(creep, '😰 No Srcs')) {
            console.log(`${creep} at ${creep.pos} could not find any available sources`);
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
        return Math.ceil(cost/2.5/body_size);
    }

    preRun (creep) {

        if(creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            delete creep.memory.rechargeId;
            this.checkRenewOrRecycle(creep);
        }
        this.tryRenewOrRecycle(creep);

        if(!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            delete creep.memory.repairId;
            creep.memory.full = 1;
        }
    }

    run (creep) {
        console.log(creep + ': ' + this.roleName + ' does not have a run action defined');
    }

    checkRenewOrRecycle(creep) {
        // Check if we need to be renewed or recycled
        let capacity = creep.room.energyCapacityAvailable,
            energy = creep.room.energyAvailable,
            energyRatio = energy / capacity;

        // if (creep.ticksToLive < 200)
        //     console.log(`${creep} ${creep.pos} - ${creep.ticksToLive} ratio: ${energyRatio} avail. energy: ${energy} ${creep.memory.recycle} ${creep.memory.renew}`);

        if (!creep.memory.recycle && !creep.memory.renew && creep.ticksToLive < 200 && (energyRatio >= 0.8 || energy > 600)) {
            let parts = creep.body.map(x => x.type),
                cost = this.bodyPartCost(parts);
            // let renewCost = this.bodyPartRenewCost(parts);
            
            if (capacity > 700) capacity = 700; // cap it
            let costRatio = cost / capacity;

            let spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_SPAWN });

            if ( !spawn) {
                creep.memory.renew = -1;
                creep.memory.recycle = -1;
                console.log('cannot renew ${creep} in room ${creep.room}: no spawner found');
            }

            if (costRatio > 0.8) {
                // we want to keep this!
                creep.memory.renew = spawn.id;
                // console.log(`Renewing ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${costRatio}`);
            } else {
                // Recycle the creep
                creep.memory.recycle = spawn.id;
                // console.log(`Recycling ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${costRatio}`);
            }
        }
    }

    tryRenewOrRecycle(creep) {
        let isRenew = (!creep.memory.renew || creep.memory.renew === -1);
        let isRecycle = (!creep.memory.recycle || creep.memory.recycle === -1);
        
        if (isRenew && isRecycle) {
            return;
        }
        
        let actions = ['recycle', 'renew'];
        let phrases = ['♻️ Recycling', '⛑ Healing'];
        for(let i=0;i<actions.length;i++) {
            let ret = this.checkSpawnCreeperAction(creep, actions[i], phrases[i]);
            if (ret !== false) {
                return ret;
            }
        }

        return false;
    }
    checkSpawnCreeperAction(creep, action, phrase) {
        if (creep.memory[action] && creep.memory[action] !== -1) {
            
            let spawn = Game.getObjectById(creep.memory[action]);
            let code = spawn[action +'Creep'](creep);
            this.emote(creep, phrase, code);

            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NOT_IN_RANGE || code === ERR_BUSY) {
                this.moveTo(creep, spawn, '#FFFFFF');
            } else if (code === ERR_FULL || code === ERR_NOT_ENOUGH_ENERGY) {
                delete creep.memory[action];
            } else {
                Errors.check(spawn, `${action}(${creep})`, code);
                creep.memory[action] = -1;
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
                
                creep.memory.roomOrders = Game.map.findRoute(creep.room, roomName).map(x => { return {exit: x.exit, roomName: x.room};});
                console.log('Game orders');
                console.log(JSON.stringify(creep.memory.roomOrders));
                target = creep.memory.roomOrders[0].exit;
            }
        }
        if (target === undefined) {
            // otherwise, find the closest unknown room, and go there.
            let ref = Memory.rooms[roomName];
            // console.log(creep + 'about to execute bfs')
            
            let path = RoomUtils.bfs(ref);
            
            let displayPath = path.map(x => { return {exit: RoomUtils.EXIT_NAME[x.exit], roomName: x.roomName}; });
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
                delete creep.memory.roomOrders;
            }
            
        } else {
            console.log(`${creep} could not find an exit/target`);
        }
    }
}

module.exports = CreepsBase;
