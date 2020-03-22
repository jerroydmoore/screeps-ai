const CreepsBase = require('./creeps');

class RemoteHarvester extends CreepsBase {
  constructor() {
    super('Harvester');
  }

  harvest(creep) {
    let sourceId = creep.memory.sId,
      source = undefined;
    if (sourceId) {
      source = Game.getObjectById(sourceId);
    } else {
      source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    }
    if (source) {
      creep.memory.sId = source.id;
      let code = creep.harvest(source);
      if (code === ERR_NOT_IN_RANGE) {
        code = this.travelTo(creep, source, '#ffaa00'); //orange
        // What about using Storage???
      } else if (code === ERR_NOT_ENOUGH_RESOURCES) {
        delete creep.memory.sId;
      } else if (code === ERR_NO_BODYPART) {
        // unable to harvest?
        this.suicide(creep);
      }
    } else {
      console.log(`${creep} at ${creep.pos} could not find any available sources`);
      creep.say('😰 No Srcs');
    }
    creep.busy = 1;
  }

  run(creep) {
    if (creep.busy || !this.is(creep)) return false;

    if (!creep.memory.full) {
      this.harvest(creep);
    } else {
      this.recharge(creep);
    }
  }

  recharge(creep) {
    let structure;
    if (creep.memory.rechargeId) {
      structure = Game.getObjectById(creep.memory.rechargeId);
      if (structure.energy === structure.energyCapacity) {
        structure = undefined;
        delete creep.memory.rechargeId;
      }
    }
    if (!structure) {
      structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_TOWER) &&
            structure.projectedEnergy < structure.energyCapacity
          );
        },
      });
    }
    if (structure) {
      creep.memory.rechargeId = structure.id;
      let code = creep.transfer(structure, RESOURCE_ENERGY);
      this.emote(creep, '🔋charging', code);
      if (code === OK) {
        creep.busy = 1;
      } else if (code === ERR_NO_BODYPART) {
        // unable to energize?
        this.suicide(creep);
      } else if (code === ERR_NOT_IN_RANGE) {
        this.travelTo(creep, structure, '#00FF3C'); // green
      }
    }
  }
}

module.exports = new RemoteHarvester();
