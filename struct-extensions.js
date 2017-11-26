const StructBase = require('struct-base');
const Roads = require('roads');
const Errors = require('errors');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;

class StructExtensions extends StructBase {
    constructor() {
        super(STRUCTURE_EXTENSION);
        this.minFreeAdjSpaces = 3;
        this.minPlacementDistance = 2;
        this.avoidList = [AVOID_LIST[STRUCTURE_EXTENSION], AVOID_LIST[LOOK_SOURCES]];
    }
    * getBuildingPointsOfInterests (room) {
        let s = room.find(FIND_SOURCES);
        console.log('generating controller')
        for (let i=0;i<s.length;i++) {
            console.log(`yielding ${s}`)
            yield s[i];
        }
    }
};
module.exports = new StructExtensions();
