const Errors = require('errors');
const Constants = require('constants');
const Roads = require('roads');
const CreepAction = require('creeps');
const GIVEUP_SOURCE_AFTER_BLOCK_COUNT = 10;

let _lowEnergyStructs = {};

module.exports = {
    roleName: "Harvester",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    findLowEnergyStructures: function (room) {
        if (!Memory.recharge) Memory.recharge = {};
        if (!_lowEnergyStructs[room.id]) {
            _lowEnergyStructs[room.id] = room.find(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION
                            || structure.structureType == STRUCTURE_SPAWN
                            || structure.structureType == STRUCTURE_TOWER) &&
                        structure.energy < structure.energyCapacity;
                }
            });
            _lowEnergyStructs[room.id].forEach(x => {
                x.harvesterCount = Memory.recharge[x.id] || 0;
                if (x.harvesterCount === 0) Memory.recharge[x.id] = 0; // ensure the Memory location is allocated
                return x;
            })
        }
        return _lowEnergyStructs[room.id];
    },

    harvest: function(creep) {
        
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
                let code = CreepAction.moveTo(creep, source, '#ffaa00'); //orange
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
    },

    run: function(creep) {

        if (creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            creep.memory.full = 1;
            creep.say('🔋charging');
        }

        if (!creep.memory.full) {
            this.harvest(creep);
        } else {
            this.recharge(creep);
        }
    },
    recharge: function (creep) {
        let structure;
        if (creep.memory.rechargeId) {
            structure = Game.getObjectById(creep.memory.rechargeId);
            if(structure.energy === structure.energyCapacity) {
                delete Memory.recharge[structure.id];
                structure = undefined;
                delete creep.memory.rechargeId;
                
            }
        }
        if (!structure) {
            let targets = this.findLowEnergyStructures(creep.room);

            if (!targets.length) return;

            targets.sort((a, b) => a.harvesterCount - b.harvesterCount);
            structure = targets[0];
            Memory.recharge[structure.id]++;
            structure.harvesterCount++;
        }
        if (structure) {
            creep.memory.rechargeId = structure.id;
            let code = creep.transfer(structure, RESOURCE_ENERGY)
            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NO_BODYPART) {
                // unable to energize?
                this.suicide(creep);
            } else if (code === ERR_NOT_IN_RANGE) {
                CreepAction.moveTo(creep, structure,'#00FF3C'); // green
            }
        }
    }, 
    gc: function() {
        _lowEnergyStructs = {};
    }
};
