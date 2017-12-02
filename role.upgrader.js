const Constants = require('constants');
const Errors = require('errors');
const roleHarvester = require('role.harvester');
const CreepsBase = require('creeps');
const utils = require('utils');

const role = 'Upgrader';
class RoleUpgrader extends CreepsBase {
    constructor() {
        super(role);
    }
    
    run (creep) {

        this.preRun(creep);

        // if we just spawned. Find the closest source to the controller and remember it.
        if (! creep.memory[Constants.MemoryKey[LOOK_SOURCES]] && !creep.memory.full) {
            let pos = utils.findFreeAdjecentPos(creep.room.controller),
                source = pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                creep.memory[Constants.MemoryKey[LOOK_SOURCES]] = source.id;
            } else if (this.emote(creep, '🚦 stuck')) {
                console.log(`${creep} cannot find a source`);
            }
        }

        if(creep.memory.full) {
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];

            let controller = creep.room.controller;
            if (controller.id !== creep.memory.origin) {
                controller = Game.getObjectById(creep.memory.origin);
            }
            if (!controller.my) {
                console.log(`${creep} attempting to upgrade at a ${controller} not owned by us!`);
            }
            let code = creep.upgradeController(controller);
            this.emote(creep, '⚡ upgrade');
            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NOT_IN_RANGE) {
                this.moveTo(creep, controller, '#4800FF'); //blue
            } else if (code === ERR_NOT_OWNER) {
                console.log(`${creep} is lost in ${creep.room}`);
            } else if (code === ERR_NO_BODYPART) {
                // unable to upgrade?
                this.suicide(creep);
            } else {
                Errors.check(creep, 'upgradeController', code);
            }
        } else {
            roleHarvester.harvest(creep);
        }
    }
}

module.exports = new RoleUpgrader();
