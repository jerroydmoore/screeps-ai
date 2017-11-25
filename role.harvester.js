const Errors = require('errors');
const Constants = require('constants');
const Roads = require('roads');

const GIVEUP_SOURCE_AFTER_BLOCK_COUNT = 50;
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
                let code = creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}}); //orange
                if (code === OK) {
                    if(creep.memory.blocked && --creep.memory.blocked >= 0) {
                        delete creep.memory.blocked;
                    }
                    Roads.shouldBuildAt(creep)
                }
                if(code === ERR_NO_PATH) {
                    if (!creep.memory.blocked) {
                        creep.memory.blocked = 1;
                    } else {
                        console.log(`${creep} blocked ` + creep.memory.blocked)
                        if(++creep.memory.blocked > GIVEUP_SOURCE_AFTER_BLOCK_COUNT) {
                            // this is too busy. try a different source
                            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
                            this.harvest(creep);
                        }
                    }
                }
                //Errors.check(creep, 'moveTo', code);
                // TODO if ERR_NO_PATH create more accessible Storage
                // and have havesters grab from there.
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
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            creep.memory.full = 1;
            creep.say('🔋charging');
        }

        if (!creep.memory.full) {
            creep.busy = 1;
            this.harvest(creep);
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
                    let code = creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#00FF3C'}}); // green
                    if(code === OK) {
                        Roads.shouldBuildAt(creep)
                    }
                }
            }
        }
    }
};