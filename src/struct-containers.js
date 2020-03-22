const StructBase = require('./struct-base');
const utils = require('./utils');
const AvoidStructure = utils.AvoidStructure;
const Cache = require('./cache');

Cache.addEnergyProperties(StructureContainer.prototype);

function findStorageAndContainers(s) {
  let type = s.structureType;
  return type === STRUCTURE_CONTAINER || type === STRUCTURE_STORAGE;
}

class StructContainer extends StructBase {
  constructor() {
    super(STRUCTURE_CONTAINER, {
      howmanyAtEachPoi: 1,
      minFreeAdjSpaces: 4,
      minPlacementDistance: 7,
      structureFilter: findStorageAndContainers,
      avoidList: [
        new AvoidStructure(STRUCTURE_CONTAINER, { range: 7 }),
        // new AvoidStructure(STRUCTURE_STORAGE, {range: 7})
      ],
    });
  }
  getDesiredNumberOfStructs(room) {
    let res = room.find(FIND_SOURCES);
    if (res && res.length) {
      return res.length;
    }
    console.log('Containers.getDesiredNum failed: ' + JSON.stringify(res));
    return 0;
  }
}

module.exports = new StructContainer();
