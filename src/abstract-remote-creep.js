const CreepsBase = require('./creeps');

class AbstractRemoteCreep extends CreepsBase {
  constructor(roleName, flagColor, flagSecondColor, ttlFieldName, flagClaimGracePeriod, creepIdFieldName) {
    super(roleName);
    this.flagColor = flagColor;
    this.flagSecondColor = flagSecondColor;
    this.claimTtl = flagClaimGracePeriod;
    this.ttlFieldName = ttlFieldName;
    this.creepIdFieldName = creepIdFieldName;
  }

  shouldSpawn(spawner) {
    let flag = this.findFreeFlag([spawner.pos.roomName]);
    // console.log(this.roleName + ' should spawn for flag: ' + flag);
    // return false;
    return flag !== undefined;
  }

  findFreeFlag(roomExclusions = [], ignoreTtl = false) {
    for (let flagName in Game.flags) {
      let flag = Game.flags[flagName];
      if (flag.color !== this.flagColor || flag.secondaryColor !== this.flagSecondColor) {
        // console.log(this.roleName + ' disqualified. not '+this.primaryColor+'/'+this.secondaryColor);
        continue;
      }
      if (
        this.creepIdFieldName &&
        flag.memory[this.creepIdFieldName] &&
        Game.getObjectById(flag.memory[this.creepIdFieldName])
      ) {
        // Only look at flags without an assigned creep
        console.log(this.roleName + ' disqualified. ' + this.creepIdFieldName + ' exists already.');
        continue;
      }
      if (roomExclusions.includes(flag.pos.roomName)) {
        // Only look at flags not in the room exclusion list
        console.log(this.roleName + ' disqualified. spawning in exclusion room.');
        continue;
      }
      if (!ignoreTtl && flag.memory[this.ttlFieldName] && flag.memory[this.ttlFieldName] > Game.time) {
        // We need to wait for the remote settler to spawn before
        // it can claim it. Wait some num of ticks to allow a remote builder
        // to spawn and claime it.
        console.log(
          this.roleName +
            ' disqualified. TTL. ' +
            `${flag.memory[this.ttlFieldName]} > ${Game.time} = ${flag.memory[this.ttlFieldName] > Game.time}`
        );
        continue;
      }
      console.log(this.roleName + ' spawning for flag ' + flag);
      flag.memory[this.ttlFieldName] = Game.time + this.claimTtl;
      return flag;
    }
  }
  getMyFlag(creep) {
    let destflag;
    if (!creep.memory.flag) {
      destflag = this.findFreeFlag([creep.pos.roomName], true);
      creep.memory.flag = destflag.name;

      if (!creep.memory.flag) {
        console.log(`${creep} does not have a destination flag!`);
        return;
      }

      creep.memory.flag = destflag.name;
      if (this.creepIdFieldName) {
        destflag.memory[this.creepIdFieldName] = creep.id;
      }
    }
    if (!destflag) {
      destflag = Game.flags[creep.memory.flag];
    }
    return destflag;
  }
}

module.exports = AbstractRemoteCreep;
