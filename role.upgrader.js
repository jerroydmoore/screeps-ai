const Roads = require('roads');
const roleHarvester = require('role.harvester');

module.exports = {
    roleName: "Upgrader",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    /** @param {Creep} creep **/
    run: function(creep) {

        if (creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            creep.memory.full = 1;
            creep.say('⚡ upgrade');
        }

        if(creep.memory.full) {
            creep.busy = 1;
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
            if (this.is(creep)) {
                Roads.shouldBuildAt(creep)
            }
        } else {
            roleHarvester.harvest(creep);
        }

        
    }
};