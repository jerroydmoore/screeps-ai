const Errors = require('./errors');
const roleHarvester = require('./role.harvester');
const CreepsBase = require('./creeps');

class RoleUpgrader extends CreepsBase {
  constructor() {
    super('Upgrader');
  }

  run(creep) {
    if (creep.busy) return false;

    if (creep.memory.full) {
      let controller = creep.room.controller;
      if (controller.room.name !== creep.memory.origin) {
        controller = Game.rooms[creep.memory.origin].controller;
      }
      if (!controller) {
        console.log(`${creep} cannot find its controller. Assigned to ${creep.memory.origin}.`);
        return;
      }
      if (!controller.my) {
        console.log(`${creep} attempting to upgrade at a ${controller} not owned by us!`);
      }
      let code = creep.upgradeController(controller);
      this.emote(creep, '⚡ upgrade');
      if (code === OK) {
        creep.busy = 1;
      } else if (code === ERR_NOT_IN_RANGE) {
        this.travelTo(creep, controller, '#4800FF'); //blue
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
