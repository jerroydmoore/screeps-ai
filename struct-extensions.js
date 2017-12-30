const StructBase = require('struct-base');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;
const Cache = require('cache');

// Utils.addMemoryProperty(StructureTower.prototype, 'ext');
Cache.addEnergyProperties(StructureExtension.prototype);

class StructExtensions extends StructBase {
    constructor() {
        super(STRUCTURE_EXTENSION, {
            minFreeAdjSpaces: 3,
            minPlacementDistance: 1,
            avoidList: [
                //avoid roads as they represent high traffic
                // areas and will get in the creeps' way.
                AVOID_LIST[STRUCTURE_ROAD],
                AVOID_LIST[STRUCTURE_SPAWN],
                AVOID_LIST[STRUCTURE_CONTROLLER],
                AVOID_LIST[STRUCTURE_EXTENSION],
                AVOID_LIST[STRUCTURE_CONTAINER],
                AVOID_LIST[STRUCTURE_STORAGE],
                AVOID_LIST[LOOK_SOURCES]
            ],
            avoidIsCheckered: true
        });
    }
    * getBuildingPointsOfInterests (room) {
        let res = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_STORAGE }
        });
        if (res.length > 0) {
            yield res[0];
        }
        yield* super.getBuildingPointsOfInterests(room);
    }
}
module.exports = new StructExtensions();
