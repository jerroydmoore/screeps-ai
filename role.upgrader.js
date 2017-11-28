const Constants = require('constants');
const Errors = require('errors');
const Roads = require('roads');
const roleHarvester = require('role.harvester');
const CreepAction = require('creeps');
const utils = require('utils');

module.exports = {
    roleName: "Upgrader",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    /** @param {Creep} creep **/
    run: function(creep) {

        // if we just spawned. Find the closest source to the controller and remember it.
        if (! creep.memory[Constants.MemoryKey[LOOK_SOURCES]] && !creep.memory.full) {
            let pos = utils.findFreeAdjecentPos(creep.room.controller),
                source = pos.findClosestByPath(FIND_SOURCES);
            if (!source) {
                creep.say('🚦 stuck');
                console.log(`${creep} cannot find a source`)
            } else {
                creep.memory[Constants.MemoryKey[LOOK_SOURCES]] = source.id;
            }
        }
        if (creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            creep.memory.full = 1;
            creep.say('⚡ upgrade');
        }

        if(creep.memory.full) {
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];

            let controller = creep.room.controller;
            if (controller.id !== creep.memory.origin) {
                controller = Game.getObjectById(creep.memory.origin);
            }
            if (!controller.my) {
                console.log(`${creep} attempting to upgrade at a ${controller} not owned by us!`)
            }
            let code = creep.upgradeController(controller);
            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NOT_IN_RANGE) {
                CreepAction.moveTo(creep, controller, '#4800FF'); //blue
            } else if (code === ERR_NOT_OWNER) {
                console.log(`${creep} is lost in ${creep.room}`)
            } else if (code === ERR_NO_BODYPART) {
                // unable to upgrade?
                this.suicide(creep);
            } else {
                Errors.check(creep, 'upgradeController', code)
            }
        } else {
            roleHarvester.harvest(creep);
        }

        
    }
};