const Errors = require('errors');
const Constants = require('constants');
const Roads = require('roads');

module.exports = {
    roleName: "Harvester",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },

    harvest: function(creep) {
        creep.busy = 1;
        let sourceId = creep.memory[Constants.MemoryKey[LOOK_SOURCES]],
            source = undefined;
        if (sourceId) {
            source = Game.getObjectById(sourceId);
        } else {
            source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        if (source) {
            creep.memory[Constants.MemoryKey[LOOK_SOURCES]] = source.id;
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                let code = creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                //Errors.check(creep, 'moveTo', code);
            }
        } else {
            console.log(`${creep} at ${creep.pos} could not find any available sources`);
            creep.say('😰 No Srcs');
        }
        
    },

    run: function(creep) {

        if (creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            creep.memory.full = 1;
            creep.say('🔋charging');
        }

        if (!creep.memory.full) {
            creep.busy = 1;
            this.harvest(creep);
            if (this.is(creep)) {
                Roads.shouldBuildAt(creep)
            }
        } else {
            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                        structure.energy < structure.energyCapacity;
                }
            });
            if(targets.length > 0) {
                creep.busy = 1;
                if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};