const CreepsBase = require('creeps');

let _lowEnergyStructs = {};

const role = 'Harvester';
class RoleHarvester extends CreepsBase {
    constructor() {
        super(role);
    }
    /* static */ findLowEnergyStructures (room) {
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
            });
        }
        return _lowEnergyStructs[room.id];
    }

    run (creep) {
        if (!creep.memory.full) {
            this.harvest(creep);
        } else {
            this.recharge(creep);
        }
    }
    recharge (creep) {
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
            // let targets = this.findLowEnergyStructures(creep.room);

            // if (!targets.length) return;

            // targets.sort((a, b) => a.harvesterCount - b.harvesterCount);
            // structure = targets[0];
            structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION
                            || structure.structureType == STRUCTURE_SPAWN
                            || structure.structureType == STRUCTURE_TOWER) &&
                        structure.energy < structure.energyCapacity;
                }
            });
            if (structure) {
                Memory.recharge[structure.id]++;
                structure.harvesterCount++;
            }
        }
        if (structure) {
            creep.memory.rechargeId = structure.id;
            let code = creep.transfer(structure, RESOURCE_ENERGY);

            this.emote(creep, '🔋charging', code);

            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NO_BODYPART) {
                // unable to energize?
                this.suicide(creep);
            } else if (code === ERR_NOT_IN_RANGE) {
                this.travelTo(creep, structure,'#00FF3C'); // green
            }
        }
    }
    gc () {
        _lowEnergyStructs = {};
    }
}

module.exports = new RoleHarvester();
