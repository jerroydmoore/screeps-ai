const StructBase = require('./struct-base');
const Errors = require('./errors');
const utils = require('./utils');
const AVOID_LIST = utils.AVOID_LIST;
const RoomsUtils = require('./rooms');
const Phases = require('./phases');
const Cache = require('./cache');
const Utils = require('./utils');
const AvoidStructure = Utils.AvoidStructure;

Utils.addMemoryProperty(StructureTower.prototype, 'towers');
Cache.addEnergyProperties(StructureTower.prototype);

class StructTowers extends StructBase {
  constructor() {
    super(STRUCTURE_TOWER, {
      howmanyAtEachPoi: 1,
      minFreeAdjSpaces: 3,
      minPlacementDistance: 7,
      avoidList: [
        AVOID_LIST[STRUCTURE_TOWER],
        new AvoidStructure(STRUCTURE_EXTENSION, { range: 1 }),
        AVOID_LIST[STRUCTURE_ROAD],
        AVOID_LIST[STRUCTURE_SPAWN],
        AVOID_LIST[STRUCTURE_CONTROLLER],
        AVOID_LIST[STRUCTURE_EXTENSION],
        AVOID_LIST[STRUCTURE_CONTAINER],
        AVOID_LIST[STRUCTURE_STORAGE],
        AVOID_LIST[LOOK_SOURCES],
      ],
    });
  }
  *getBuildingPointsOfInterests(room) {
    // build next to Source to be able to charge quickly
    let s = room.find(FIND_SOURCES);
    for (let i = 0; i < s.length; i++) {
      yield s[i];
    }

    // then controller
    yield room.controller;

    // then the spawners get a tower
    s = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.type === STRUCTURE_SPAWN });
    for (let i = 0; i < s.length; i++) {
      yield s[i];
    }
    // then spawn at entrances
    // check each separately, to make sure at least each entrances gets one spawned.
    // this doesn't exactly work. because it will places as many towers in one area before checking the next
    // TODO generator should return dered number of things in a place
    let searchParam = [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT];
    for (let j = 0; j < searchParam.length; j++) {
      s = room.find(searchParam[j]);
      for (let i = 0; i < s.length; i++) {
        yield s[i];
      }
    }
  }
  run(tower) {
    let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    // console.log(`${tower} - ${closestHostile}`);
    if (closestHostile) {
      if (OK === tower.attack(closestHostile)) {
        tower.busy = 1;
      }
    }

    let ratio = tower.energy / tower.energyCapacity;
    if (ratio >= 0.5 && !tower.busy) {
      let threshold = this.getThreshold(ratio);
      this.repair(tower, threshold);

      if (!tower.busy) {
        this.fortify(tower, threshold);
      }
    }
  }

  getThreshold(ratio, minRatio = 0.75, min = 0.2, max = 0.8) {
    // if ratio is below min, cofficient is zero.
    let coefficient = Math.max(0, 4 * (ratio - minRatio)),
      threshold = min + coefficient * (max - min);

    return Math.max(0, threshold);
  }

  repair(tower, repairThreshold = 0.2, desiredHealthPercent = 0.95) {
    if (!Memory.towers[tower.id]) Memory.towers[tower.id] = {};

    let repairId = Memory.towers[tower.id].repairId,
      structure;

    if (!repairId) {
      structure = RoomsUtils.findLowHealthStructures(tower.room, repairThreshold);
      if (!structure) return;
      Memory.towers[tower.id].repairId = structure.id;
    }
    if (repairId) {
      if (!structure) {
        structure = Game.getObjectById(repairId);

        let ratio = RoomsUtils.healthRatio.call(structure);
        if (!structure || ratio > desiredHealthPercent) {
          structure = undefined;
          delete Memory.towers[tower.id].repairId;
        }
      }

      if (structure) {
        let code = tower.repair(structure);
        //this.emote(tower, '🔧 repair', code)
        Errors.check(tower, `repair(${structure})`, code);
        if (code === ERR_INVALID_TARGET) {
          delete Memory.towers[tower.id].repairId;
        } else if (code === OK) {
          tower.busy = 1;
        }
      }
    }
  }
  fortify(tower) {
    // find walls/ramparts to build up
    let phases = Phases.getCurrentPhaseInfo(tower.room);
    let desiredHealth = phases.RampartDesiredHealth;
    if (!desiredHealth) {
      return;
    }

    let wallId = Memory.towers[tower.id].wallId,
      structure = undefined;

    if (wallId) {
      structure = Game.getObjectById(wallId);

      if (!structure || structure.hits > desiredHealth) {
        structure = undefined;
        delete Memory.towers[tower.id].wallId;
      }
    }

    if (!structure) {
      let healthThreshold = desiredHealth * 0.8;
      structure = RoomsUtils.findUnhealthyWallsAndRamparts(tower.room, healthThreshold);
    }
    if (structure) {
      Memory.towers[tower.id].wallId = structure.id;

      let code = tower.repair(structure);
      // this.emote(creep, '👾 fortify', code);
      if (code === OK || code === ERR_NOT_ENOUGH_RESOURCES) {
        tower.busy = 1;
      } else if (code === ERR_INVALID_TARGET) {
        console.log(`${tower} cannot fortify ${structure}`);
        delete Memory.towers[tower.id].wallId;
      }

      if (!tower.busy) {
        this.fortify(tower);
      }
    }
  }
}

module.exports = new StructTowers();
