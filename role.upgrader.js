const Errors = require('errors');
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
            let controller = creep.room.controller;
            if (controller.id !== creep.memory.origin) {
                controller = Game.getObjectById(creep.memory.origin);
            }
            if (!controller.my) {
                console.log(`${creep} attempting to upgrade at a ${controller} not owned by us!`)
            }
            let code = creep.upgradeController(controller);
            if (code == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
            } else if (code === ERR_NOT_OWNER) {
                console.log(`${creep} is lost in ${creep.room}`)
            } else {
                Errors.check(creep, 'upgradeController', code)
            }
            if (this.is(creep)) {
                Roads.shouldBuildAt(creep)
            }
        } else {
            roleHarvester.harvest(creep);
        }

        
    }
};