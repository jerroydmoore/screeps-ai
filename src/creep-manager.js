// screeps' roles are assessed in ascending order
const roleNames = [
  'role.miner',
  'role.settler',
  'role.remote-builder',
  'role.builder',
  'role.harvester',
  'role.upgrader', // upgrading is the default "catch-all"
];

const roles = roleNames.map((role) => require(role));

module.exports = {
  runAll(creeps, opts) {
    Object.values(creeps).forEach((creep) => this.runSingeCreep(creep, opts));
  },
  runSingeCreep(creep, opts) {
    if (creep.spawning || !this.preRun(creep)) {
      return;
    }

    for (const role of roles) {
      role.run(creep, opts);
    }
  },
  preRun(creep) {
    if (creep.ticksToLive === 1) {
      creep.say('☠️ dying');
      // console.log(`${creep} ${creep.pos} died naturally.`);
      for (const resourceType in creep.carry) {
        creep.drop(resourceType);
      }
      // TODO Inform a Spawner to replace the creep.
      delete Memory.creeps[creep.name];
      return false;
    }

    if (!creep.memory.origin) {
      creep.memory.origin = creep.room.name;
    }

    if (creep.memory.full && creep.carry.energy == 0) {
      delete creep.memory.full;
      delete creep.memory.rechargeId;
      delete creep.memory.noRoads;
      delete creep.memory.repairPos;
      // this.checkRenewOrRecycle(creep);
    }
    // this.tryRenewOrRecycle(creep);

    if (!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
      delete creep.memory.sId;
      delete creep.memory.repairId;
      creep.memory.full = 1;
    }
    return true;
  },
};
