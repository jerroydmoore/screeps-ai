const roleHarvester = require('./role.harvester');
const CreepsBase = require('./creeps');
const RoomsUtils = require('./rooms');

class RoleBuilder extends CreepsBase {
  constructor(role = 'Builder') {
    super(role);
  }

  repair(creep, repairThreshold = 0.2, fixedThreshold = 0.95) {
    let repairId = creep.memory.repairId,
      structure = undefined;

    if (repairId) {
      structure = Game.getObjectById(repairId);
      let ratio = RoomsUtils.healthRatio.call(structure);

      if (ratio > fixedThreshold) {
        structure = undefined;
        delete creep.memory.repairId;
      }
    }

    if (!structure) {
      structure = RoomsUtils.findLowHealthStructures(creep.room, repairThreshold);
    }

    if (structure) {
      creep.memory.repairId = structure.id;

      let code = creep.repair(structure);
      this.emote(creep, '🔧 repair', code);
      if (code === OK || code === ERR_NOT_ENOUGH_RESOURCES) {
        creep.busy = 1;
      }
      if (code == ERR_NOT_IN_RANGE) {
        this.travelTo(creep, structure, '#FF0000'); // red
      } else if (code === ERR_INVALID_TARGET) {
        console.log(`${creep} cannot repair ${structure}`);
        delete creep.memory.repairId;
      } else if (code === ERR_NO_BODYPART) {
        // unable to move?
        this.suicide(creep);
      }

      if (!creep.busy) {
        console.log('find another repair ' + code);
        this.repair(creep, repairThreshold, fixedThreshold); // try again with a valid target
      }
    }
  }

  run(creep, { hasTowers }) {
    if (creep.busy || !this.is(creep)) return false;

    const skipRepair = hasTowers[creep.room.name];

    if (creep.memory.full) {
      this.fortify(creep);

      if (!creep.busy && !skipRepair) {
        this.repair(creep);
      }

      if (!creep.busy) {
        this.build(creep);
      }
    }
    if (!creep.memory.full | !creep.busy) {
      roleHarvester.harvest(creep);
    }
  }
}

module.exports = new RoleBuilder();
