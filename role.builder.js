const roleHarvester = require('role.harvester');
const Constants = require('constants');

module.exports = {
    roleName: "Builder",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    build: function (creep) {

        let targetId = creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]],
            target = undefined;
        
        if (targetId) {
            target = Game.getObjectById(targetId);
        } else {
            target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
            //target = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
        }

        if (target) {
            creep.busy = 1;
            creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]] = target.id;
            
            let buildCode = creep.build(target); 
            if(buildCode == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#FF0000'}}); // red

            } else if(buildCode === ERR_INVALID_TARGET) {
                delete creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]]
            }
        } else if(targetId) {
            delete creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]]
        }
    },
    /** @param {Creep} creep **/
    run: function(creep) {

        if(creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            creep.memory.full = 1;
            creep.say('🚧 build');
        }

        if(creep.memory.full) {
            this.build(creep);
        } else {
            roleHarvester.harvest(creep);
        }
    }
};