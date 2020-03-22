const StructBase = require('./struct-base');
const utils = require('./utils');
const AvoidStructure = utils.AvoidStructure;
const AVOID_LIST = utils.AVOID_LIST;
const Cache = require('./cache');

Cache.addEnergyProperties(StructureStorage.prototype);

class StructStorage extends StructBase {
  constructor() {
    super(STRUCTURE_STORAGE, {
      howmanyAtEachPoi: 1,
      minFreeAdjSpaces: 7,
      minPlacementDistance: 7,
      avoidList: [
        AVOID_LIST[LOOK_SOURCES],
        AVOID_LIST[STRUCTURE_ROAD],
        new AvoidStructure(STRUCTURE_SPAWN, { range: 3 }),
        new AvoidStructure(STRUCTURE_CONTROLLER, { range: 3 }),
      ],
    });
  }
  buildInRoom(room) {
    super.buildInRoom(room);

    let storageId = room.memory.storageId;
    let storage;
    if (storageId) {
      storage = Game.getObjectById(storageId);
    }
    if (storage !== undefined) {
      return; // the id we saved still resolves! Means it was not destroyed!
    }
    // find the Storage and save it to the room's storageId
    // building in rooms creates constructionSites, so this method
    // will only set the storageId once creeps are finished building it.
    let res = room.find(FIND_MY_STRUCTURES, {
      filter: {
        structureType: STRUCTURE_STORAGE,
      },
    });

    room.memory.storageId = res && res.length ? res[0].id : undefined;
  }

  *getBuildingPointsOfInterests(room) {
    if (room.controller) {
      yield room.controller;
    }
    let s = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.type === STRUCTURE_SPAWN });
    for (let i = 0; i < s.length; i++) {
      yield s[i];
    }
  }
}

module.exports = new StructStorage();
