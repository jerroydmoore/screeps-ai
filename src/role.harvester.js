const CreepsBase = require('./creeps');

const LOW_STRUCT_THRESHOLD = 0.9;
const role = 'Harvester';
class RoleHarvester extends CreepsBase {
  constructor() {
    super(role);
  }

  run(creep) {
    if (creep.busy || !this.is(creep)) return false;

    if (!creep.memory.full) {
      this.harvest(creep, { ignore: creep.memory.ignore });
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
            structure.projectedEnergy < structure.energyCapacity * LOW_STRUCT_THRESHOLD
          );
        },
      });
      if (!structure && creep.room.memory.storageId) {
        // if things do not need to be recharged, fill up storage.
        structure = Game.getObjectById(creep.room.memory.storageId);
        creep.memory.ignore = [STRUCTURE_STORAGE];
      } else {
        delete creep.memory.ignore;
      }
      if (structure) {
        structure.projectedEnergy += creep.carryCapacity;
        // console.log(`${structure}=energy(${structure.energy}) < projected(${structure.projectedEnergy}) < capacity(${structure.energyCapacity}). Diff=${structure.projectedEnergy-structure.energy}`);
      }
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

module.exports = new RoleHarvester();
