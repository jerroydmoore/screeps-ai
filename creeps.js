const Errors = require('errors');
const RoomUtils = require('rooms');
const Roads = require('roads');
const utils = require('utils');
const Phases = require('phases');

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
    travelTo(creep, target, color, disableRoadCheck) {
        let opts = {}, code;

        if (creep.busy) {
            return;
        }
        if (color) {
            opts.visualizePathStyle = { stroke: color, opacity: 1, lineStyle: 'dotted' };
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
            if (! disableRoadCheck) {
                Roads.shouldBuildAt(creep);
            }
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
            try {
                console.log(`${creep} ${creep.pos} pick up ${resource.amount} ${resource.resourceType} at ${resource.pos}`);
            } catch(ex) {
                // ignore errors thrown
            }
        }
        if (code === ERR_NOT_IN_RANGE) {
            this.travelTo(creep, resource.pos, '#ffaa00', true);
        } else if (code === OK) {
            delete creep.memory.fallenResourceId;
            creep.busy = 1;
        } else {
            delete creep.memory.fallenResourceId;
            try {
                // If the resource no longer exists, this will throw an error
                Errors.check(creep, `pickup(${resource} ${resource.pos})`, code);
            } catch(ex) {
                // ignore error
            }
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

    harvest (creep, sourceId, ignoreContainers) {
        // sourceId is optional.
        // Gives you the option to override the "find Closest" logic
        let source = undefined;

        if (creep.busy) return;
        
        if(! sourceId && creep.memory.sId) {
            sourceId = creep.memory.sId;
        }
        if (sourceId) {
            source = Game.getObjectById(sourceId);
        } else if (! this.pickupFallenResource(creep)) {
            if (! ignoreContainers) {
                source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => {
                        if (s.structureType === 'storage' || s.structureType === 'container') {
                            return s.store[RESOURCE_ENERGY] >= creep.carryCapacity;
                        }
                        return false;
                    }
                });
                // console.log(`${creep} withdraw ${source}`);
            }
            if (! source) {
                source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            }
        }
        if (source) {
            creep.memory.sId = source.id;
            let code;

            if (source instanceof Source || source instanceof Mineral) {
                // is a Source or Mineral
                if (source.ticksToRegeneration === 1 && source.energy !== 0) {
                    console.log(source + ' wasted energy: ' + source.energy);
                }
                code = creep.harvest(source);
            } else {
                code = creep.withdraw(source, RESOURCE_ENERGY);
                // Don't build roads when going to / coming from picking up energy
                // "noRoads" is deleted after energy is drained in preRun method
                creep.memory.noRoads = 1;
            }

            this.emote(creep, '🔄 harvest', code);

            if (code === ERR_NOT_IN_RANGE) {
                code = this.travelTo(creep, source, '#ffaa00', creep.memory.noRoads); //orange
                // What about using Storage???
            } else if (code === ERR_NOT_ENOUGH_RESOURCES) {
                delete creep.memory.sId;
            } else if (code === ERR_NO_BODYPART) {
                // unable to harvest?
                this.suicide(creep);
            }
        } else if (! creep.busy && this.emote(creep, '😰 No Srcs')) {
            console.log(`${creep} at ${creep.pos} could not find any available sources`);
        }
        creep.busy = 1;
    }

    shouldSpawn(spawner) {
        let roomName = spawner.room.name,
            creeps = _.filter(Game.creeps, creep => roomName === creep.room.name && this.is(creep)),
            count = creeps.length,
            phase = Phases.getCurrentPhaseInfo(spawner.room),
            phaseRole = phase[this.roleName];

        if (! phaseRole) {
            console.log(`No entry for role ${this.roleName} in Phase ${phase.level}`);
            return false;
        }

        let desiredCount = 0;
        if (typeof phaseRole.count === 'number') {
            desiredCount = phaseRole.count;
        } else if(phaseRole.count === LOOK_SOURCES) {
            let objs = spawner.room.find(FIND_SOURCES) || [];
            desiredCount = objs.length || 0;
        } else {
            console.log(`count for role ${this.roleName} in Phase ${phase.level} needs to be a string or number: ${typeof phaseRole.count}`);
        }


        let hasEnoughEnergy = true;
        if (phase[this.roleName].minimumEnergyToSpawn) {
            // optional field, if set will overwrite the phase minimumEnergyToSpawn
            hasEnoughEnergy = phase[this.roleName].minimumEnergyToSpawn < spawner.room.energyAvailable;
        }
        return count < desiredCount && hasEnoughEnergy;
    }

    spawn (spawner) {
        let phase = Phases.getCurrentPhaseInfo(spawner.room),
            availableBodyParts = phase[this.roleName].parts,
            bodyParts = [],
            action = 'spawnCreep',
            cost = 0;
        
        // console.log(`${phase.level} parts ` +JSON.stringify(availableBodyParts));

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

        if (!creep.memory.origin) {
            creep.memory.origin = creep.room.controller.id;
        }

        if ( creep.ticksToLive === 1) {
            creep.say('☠️ dying');
            // console.log(`${creep} ${creep.pos} died naturally.`);
            for(const resourceType in creep.carry) {
                creep.drop(resourceType);
            }
        }

        if(creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            delete creep.memory.rechargeId;
            delete creep.memory.noRoads;
            delete creep.memory.repairPos;
            // this.checkRenewOrRecycle(creep);
        }
        // this.tryRenewOrRecycle(creep);

        if(!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            delete creep.memory.sId;
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
                this.travelTo(creep, spawn, '#FFFFFF');
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

            let code = this.travelTo(creep, dest, '#5d80b2', true);
            Errors.check(creep, `travelTo(${dest})`, code);
            if (code === ERR_INVALID_TARGET) {
                delete creep.memory.roomOrders;
            }
            
        } else {
            console.log(`${creep} could not find an exit/target`);
        }
    }
}

module.exports = CreepsBase;
