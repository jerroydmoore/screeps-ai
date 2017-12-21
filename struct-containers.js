const StructBase = require('struct-base');
const utils = require('utils');
const AvoidStructure = utils.AvoidStructure;
const AVOID_LIST = utils.AVOID_LIST;

function findStorageAndContainers(s) {
    let type = s.structureType;
    return type === STRUCTURE_CONTAINER || type === STRUCTURE_STORAGE;
}

class StructContainer extends StructBase {
    constructor() {
        let modifiedContainer = new AvoidStructure(STRUCTURE_CONTAINER, {range: 7});
        let modifiedStorage = new AvoidStructure(STRUCTURE_STORAGE, {range: 7});
        super(STRUCTURE_CONTAINER, {
            howmanyAtEachPoi: 1,
            minFreeAdjSpaces: 7,
            minPlacementDistance: 7,
            structureFilter: findStorageAndContainers,
            avoidList: [
                AVOID_LIST[LOOK_SOURCES],
                modifiedContainer,
                modifiedStorage
            ]
        });
    }
    getDesiredNumberOfStructs (room) {
        let res = room.find(FIND_SOURCES);
        if (res && res.length) {
            return res.length;
        }
        console.log('Containers.getDesiredNum failed: ' + JSON.stringify(res));
        return 0;
    }
}

module.exports = new StructContainer();
