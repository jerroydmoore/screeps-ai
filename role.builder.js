const roleHarvester = require('role.harvester');

module.exports = {
    roleName: "Builder",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    /** @param {Creep} creep **/
    run: function(creep) {

        if(creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            creep.memory.full = 1;
            creep.say('🚧 build');
        }

        if(creep.memory.full) {
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                creep.busy = 1;
                if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        } else {
            roleHarvester.harvest(creep);
        }
    }
};