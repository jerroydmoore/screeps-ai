const Errors = require('./errors');
const RoomUtils = require('./rooms');
const Roads = require('./roads');
const Phases = require('./phases');

class CreepsBase {
  constructor(role) {
    this.roleName = role;
  }
  is(creep) {
    return creep.name.startsWith(this.roleName);
  }
  suicide(creep) {
    // unable to move?
    creep.say('💀 suicide');
    console.log(`${creep}${creep.pos} is suiciding`);
    creep.busy = 1;
    creep.suicide();
  }
  travelTo(creep, target, color, disableRoadCheck) {
    let opts = {},
      code;

    if (creep.busy) {
      return;
    }
    if (color) {
      opts.visualizePathStyle = { stroke: color, opacity: 1, lineStyle: 'dotted' };
    }

    code = creep.moveTo(target, opts);
    if (code === ERR_NO_PATH) {
      // ignore these. We can't cound blocked, because they re-path after 5 turns.
      creep.say(Errors.errorEmoji[ERR_NO_PATH]);
      return OK;
    }
    Errors.check(creep, `moveTo ${target}`, code);
    if (code === OK || code === ERR_TIRED) {
      creep.busy = 1;
      if (code === OK && creep.memory.blocked && --creep.memory.blocked >= 0) {
        delete creep.memory.blocked;
      }
      if (!disableRoadCheck) {
        Roads.shouldBuildAt(creep);
      }
      return OK;
    } else if (code === ERR_NO_BODYPART) {
      // unable to move?
      this.suicide(creep);
    }
    return code;
  }

  // travelToRoom (creep, roomName, buildRoads=true) {
  //     let buildRoadNetwork = false;

  //     // When entering a new room, find the next exit, build a road to the exit
  //     if (! creep.memory.currRoom) {
  //         creep.memory.currRoom = creep.pos.roomName;
  //     }
  //     if (creep.memory.currRoom !== creep.pos.roomName) {
  //         console.log(creep + ' room changed!');
  //         delete creep.memory.destPos;
  //         buildRoadNetwork = buildRoads;
  //         creep.memory.currRoom = creep.pos.roomName;
  //     }

  //     let dest;
  //     if(! creep.memory.destPos) {
  //         let route = Game.map.findRoute(creep.room, roomName);
  //         if (! route || !route.length) {
  //             console.log(`${creep} cannot travel to room ${roomName}. No Route found`);
  //             return;
  //         }
  //         console.log(creep + ' route ' + JSON.stringify(route));
  //         dest = creep.pos.findClosestByPath(route[0].exit);
  //         creep.memory.destPos = dest.serialize();
  //     }
  //     if (! creep.memory.destPos) {
  //         console.log(`${creep} unable to find position/route to ${roomName}`);
  //         return;
  //     }
  //     if (! dest) {
  //         dest = RoomPosition.deserialize(creep.memory.destPos);
  //     }

  //     let code = this.travelTo(creep, dest, '#5d80b2', true);
  //     console.log(`${creep} travelTo(${dest}) code: ${code}`);
  //     Errors.check(creep, `travelTo(${dest})`, code);
  //     if (code === ERR_INVALID_TARGET) {
  //         delete creep.memory.destPos;
  //     }

  //     if (buildRoadNetwork) {
  //         // Build Road Network
  //         console.log('building road network');
  //         Roads.connect(creep, [dest]);
  //         BuildOrders.execute(creep.room);
  //     }
  // }

  pickupFallenResource(creep) {
    let resource;
    if (!creep.memory.fallenResourceId) {
      resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: (s) => s.resourceType === RESOURCE_ENERGY && s.projectedEnergy > 25,
      });
      if (resource) {
        resource.projectedEnergy -= creep.carryCapacity;
      }
    } else {
      try {
        resource = Game.getObjectById(creep.memory.fallenResourceId);
      } catch (err) {
        // Object was already picked up.
      }
    }
    if (!resource) {
      delete creep.memory.fallenResourceId;
      return false;
    }

    creep.memory.fallenResourceId = resource.id;
    let code = creep.pickup(resource);
    if (this.emote(creep, '👏️ pickup')) {
      try {
        // console.log(`${creep} ${creep.pos} pick up ${creep.carryCapacity}/${resource.amount} ${resource.resourceType} at ${resource.pos}`);
      } catch (ex) {
        // ignore errors thrown
      }
    }
    if (code === ERR_NOT_IN_RANGE) {
      this.travelTo(creep, resource.pos, '#ffaa00', true);
    } else if (code === OK) {
      delete creep.memory.fallenResourceId;
      creep.busy = 1;
    } else {
      delete creep.memory.fallenResourceId;
      try {
        // If the resource no longer exists, this will throw an error
        Errors.check(creep, `pickup(${resource} ${resource.pos})`, code);
      } catch (ex) {
        // ignore error
      }
      return false;
    }
    return true;
  }
  emote(creep, phrase, code = OK, errorList = [OK, ERR_NOT_IN_RANGE]) {
    if (!phrase || creep.memory._say === phrase) return false;
    if (undefined === errorList.find((c) => c === code)) return false;

    if (OK === creep.say(phrase)) {
      creep.memory._say = phrase;
      return true;
    }
    return false;
  }

  harvest(creep, opts = {}) {
    // opts.sourceId is optional.
    // Gives you the option to override the "find Closest" logic
    let source = undefined;

    if (creep.busy) return;

    if (opts.alwaysPickupEnergy && this.pickupFallenResource(creep)) {
      return;
    }
    if (!opts.sourceId && creep.memory.sId) {
      opts.sourceId = creep.memory.sId;
    }
    if (opts.sourceId) {
      source = Game.getObjectById(opts.sourceId);
    }
    opts.ignore = opts.ignore || [];
    if (!source) {
      if (this.pickupFallenResource(creep)) {
        return;
      } else {
        source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) => {
            if (opts.ignore.includes(s.structureType)) {
              return false;
            }
            if (s.structureType === 'storage' || s.structureType === 'container') {
              // return s.store[RESOURCE_ENERGY] >= creep.carryCapacity;
              // console.log(`${s} energy: ${s.store[RESOURCE_ENERGY]}=${s.energy}. Projected=${s.projectedEnergy}. Diff=${s.projectedEnergy-s.energy}`);
              return s.projectedEnergy >= creep.carryCapacity;
            }
            return false;
          },
        });
        // console.log(`${creep} withdraw ${source}`);
      }
      if (!source) {
        source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {
          filter: (s) => s.projectedEnergy >= creep.carryCapacity,
        });
      }
      if (source) {
        // only subtract if looking up creep.memory.sId failed
        // Source from creep.memory.sId already counted in cache.js
        // E.g. do not move below near harvest/withdraw invocations
        source.projectedEnergy -= creep.carryCapacity;
      }
    }
    if (source) {
      creep.memory.sId = source.id;
      let code;

      if (source instanceof Source || source instanceof Mineral) {
        // is a Source or Mineral
        if (source.ticksToRegeneration === 1 && source.energy !== 0) {
          console.log(source + ' wasted energy: ' + source.energy);
        }
        // console.log(`${source.pos}: ${source.energy}  ${source.projectedEnergy}.   ${creep} `);
        code = creep.harvest(source);
      } else {
        code = creep.withdraw(source, RESOURCE_ENERGY);
        // Don't build roads when going to / coming from picking up energy
        // "noRoads" is deleted after energy is drained in preRun method
        creep.memory.noRoads = 1;
      }

      this.emote(creep, '🔄 harvest', code);

      if (code === ERR_NOT_IN_RANGE) {
        code = this.travelTo(creep, source, '#ffaa00', creep.memory.noRoads || opts.notBuildRoads); //orange
        // What about using Storage???
      } else if (code === ERR_NOT_ENOUGH_RESOURCES) {
        delete creep.memory.sId;
      } else if (code === ERR_NO_BODYPART) {
        // unable to harvest?
        this.suicide(creep);
      }
    } else if (!creep.busy && this.emote(creep, '😰 No Srcs')) {
      console.log(`${creep} at ${creep.pos} could not find any available sources`);
    }
    creep.busy = 1;
    return source;
  }

  shouldSpawn(spawner) {
    let roomName = spawner.room.name,
      phase = Phases.getCurrentPhaseInfo(spawner.room),
      phaseRole = phase[this.roleName],
      creeps = _.filter(
        Game.creeps,
        (creep) => (roomName === creep.room.name || phaseRole.shardwide) && this.is(creep)
      ),
      count = creeps.length;

    if (!phaseRole) {
      console.log(`No entry for role ${this.roleName} in Phase ${phase.level}`);
      return false;
    }

    let desiredCount = 0;
    if (typeof phaseRole.count === 'number') {
      desiredCount = phaseRole.count;
    } else if (phaseRole.count === LOOK_SOURCES) {
      let objs = spawner.room.find(FIND_SOURCES) || [];
      desiredCount = objs.length || 0;
    } else {
      console.log(
        `count for role ${this.roleName} in Phase ${
          phase.level
        } needs to be a string or number: ${typeof phaseRole.count}`
      );
    }

    let hasEnoughEnergy = true;
    if (phase[this.roleName].minimumEnergyToSpawn) {
      // optional field
      hasEnoughEnergy = phase[this.roleName].minimumEnergyToSpawn < spawner.room.energyAvailable;
    }
    return count < desiredCount && hasEnoughEnergy;
  }

  spawn(spawner) {
    let phase = Phases.getCurrentPhaseInfo(spawner.room),
      availableBodyParts = phase[this.roleName].parts,
      bodyParts = [],
      action = 'spawnCreep',
      cost = 0;

    // console.log(`${phase.level} parts ` +JSON.stringify(availableBodyParts));

    for (let i = 0; i < availableBodyParts.length; i++) {
      bodyParts.push(availableBodyParts[i]);
      cost = this.bodyPartCost(bodyParts);
      if (cost > spawner.room.energyAvailable) {
        // we found our limit, remove the excess body part and spawn.
        cost -= BODYPART_COST[bodyParts.pop()];
        break;
      }
    }

    let label = this.roleName + Game.time;
    console.log(`Spawning ${label} ` + JSON.stringify(bodyParts) + ` cost ${cost}/${spawner.room.energyAvailable}`);
    let code = spawner[action](bodyParts, label);

    Errors.check(spawner, action, code);
    return code;
  }
  /* static */ bodyPartCost(bodyParts) {
    return bodyParts.reduce((acc, part) => {
      return acc + BODYPART_COST[part];
    }, 0);
  }
  /* static */ bodyPartRenewCost(bodyParts) {
    let cost = this.bodyPartCost(bodyParts);
    let body_size = bodyParts.length;
    return Math.ceil(cost / 2.5 / body_size);
  }

  run() {
    return true;
  }

  build(creep) {
    let targetId = creep.memory.cId,
      target = undefined;

    if (targetId) {
      target = Game.getObjectById(targetId);
      if (!target) {
        // the thing we were building is done. Find something else to do on this tick.

        if (creep.memory.repairPos) {
          // fortify walls & ramparts immediately after built.
          let structure;
          if (!creep.memory.wallId) {
            // find the thing first
            let pos = RoomPosition.deserialize(creep.memory.repairPos);
            structure = creep.room.lookForAt(LOOK_STRUCTURES, pos).find((s) => s.isRampart());
            creep.memory.wallId = structure.id;
          }
          if (creep.memory.wallId) {
            return this.fortify(creep, structure);
          } else {
            // unable to find wall, give up trying to repair it.
            delete creep.memory.repairPos;
          }
        }

        if (!creep.memory.repairPos) {
          // Try to build another thing
          delete creep.memory.cId;
          return this.build(creep);
        }
      }
    }
    if (!target) {
      target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
    }

    if (target) {
      creep.memory.cId = target.id;

      if (target.isRampart() && !creep.memory.repairPos) {
        // after we build, repair it immediately.
        creep.memory.repairPos = target.pos.serialize();
      }

      let code = creep.build(target);
      this.emote(creep, '🚧 build', code);
      if (code === OK) {
        creep.busy = 1;
      } else if (code == ERR_NOT_IN_RANGE) {
        this.travelTo(creep, target, '#ffe56d');
      } else if (code === ERR_INVALID_TARGET) {
        delete creep.memory.cId;
      } else if (code === ERR_NO_BODYPART) {
        // unable to build?
        this.suicide(creep);
      }
    } else if (targetId) {
      delete creep.memory.cId;
    }
  }

  fortify(creep, structure) {
    // find walls/ramparts to build up
    let phases = Phases.getCurrentPhaseInfo(creep.room);
    let desiredHealth = phases.RampartDesiredHealth;
    if (!desiredHealth) {
      return;
    }

    let wallId = creep.memory.wallId;
    if (wallId && !structure) {
      structure = Game.getObjectById(wallId);

      if (!structure || structure.hits > desiredHealth) {
        structure = undefined;
        delete creep.memory.wallId;
        delete creep.memory.repairPos;
        // If remembered thing not found, find another thing to do
        // as to not waste this tick.
        return this.fortify(creep);
      }
    }

    if (!structure) {
      let healthThreshold = desiredHealth * 0.8;
      structure = RoomUtils.findUnhealthyWallsAndRamparts(creep.room, healthThreshold);
    }
    if (structure) {
      creep.memory.wallId = structure.id;

      let code = creep.repair(structure);
      // this.emote(creep, '👾 fortify', code);
      if (code === OK || code === ERR_NOT_ENOUGH_RESOURCES) {
        creep.busy = 1;
      }
      if (code == ERR_NOT_IN_RANGE) {
        this.travelTo(creep, structure, '#FF0000'); // red
      } else if (code === ERR_INVALID_TARGET) {
        console.log(`${creep} cannot fortify ${structure}`);
        delete creep.memory.wallId;
      } else if (code === ERR_NO_BODYPART) {
        // unable to move?
        this.suicide(creep);
      }
    }
  }

  checkRenewOrRecycle(creep) {
    // Check if we need to be renewed or recycled
    let capacity = creep.room.energyCapacityAvailable,
      energy = creep.room.energyAvailable,
      energyRatio = energy / capacity;

    // if (creep.ticksToLive < 200)
    //     console.log(`${creep} ${creep.pos} - ${creep.ticksToLive} ratio: ${energyRatio} avail. energy: ${energy} ${creep.memory.recycle} ${creep.memory.renew}`);

    if (
      !creep.memory.recycle &&
      !creep.memory.renew &&
      creep.ticksToLive < 200 &&
      (energyRatio >= 0.8 || energy > 600)
    ) {
      let parts = creep.body.map((x) => x.type),
        cost = this.bodyPartCost(parts);
      // let renewCost = this.bodyPartRenewCost(parts);

      if (capacity > 700) capacity = 700; // cap it
      let costRatio = cost / capacity;

      let spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_SPAWN,
      });

      if (!spawn) {
        creep.memory.renew = -1;
        creep.memory.recycle = -1;
        console.log('cannot renew ${creep} in room ${creep.room}: no spawner found');
      }

      if (costRatio > 0.8) {
        // we want to keep this!
        creep.memory.renew = spawn.id;
        // console.log(`Renewing ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${costRatio}`);
      } else {
        // Recycle the creep
        creep.memory.recycle = spawn.id;
        // console.log(`Recycling ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${costRatio}`);
      }
    }
  }

  tryRenewOrRecycle(creep) {
    let isRenew = !creep.memory.renew || creep.memory.renew === -1;
    let isRecycle = !creep.memory.recycle || creep.memory.recycle === -1;

    if (isRenew && isRecycle) {
      return;
    }

    let actions = ['recycle', 'renew'];
    let phrases = ['♻️ Recycling', '⛑ Healing'];
    for (let i = 0; i < actions.length; i++) {
      let ret = this.checkSpawnCreeperAction(creep, actions[i], phrases[i]);
      if (ret !== false) {
        return ret;
      }
    }

    return false;
  }
  checkSpawnCreeperAction(creep, action, phrase) {
    if (creep.memory[action] && creep.memory[action] !== -1) {
      let spawn = Game.getObjectById(creep.memory[action]);
      let code = spawn[action + 'Creep'](creep);
      this.emote(creep, phrase, code);

      if (code === OK) {
        creep.busy = 1;
      } else if (code === ERR_NOT_IN_RANGE || code === ERR_BUSY) {
        this.travelTo(creep, spawn, '#FFFFFF');
      } else if (code === ERR_FULL || code === ERR_NOT_ENOUGH_ENERGY) {
        delete creep.memory[action];
      } else {
        Errors.check(spawn, `${action}(${creep})`, code);
        creep.memory[action] = -1;
      }
      return code;
    }
    return false;
  }
}

module.exports = CreepsBase;
