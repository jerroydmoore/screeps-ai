const StructBase = require('struct-base');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;

class StructExtensions extends StructBase {
    constructor() {
        super(STRUCTURE_EXTENSION, {
            minFreeAdjSpaces: 3,
            minPlacementDistance: 2,
            avoidList: [ AVOID_LIST[STRUCTURE_EXTENSION], AVOID_LIST[LOOK_SOURCES] ]
        });
    }
}
module.exports = new StructExtensions();
