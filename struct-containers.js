const StructBase = require('struct-base');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;

class StructContainer extends StructBase {
    constructor() {
        super(STRUCTURE_CONTAINER, {
            howmanyAtEachPoi: 1,
            minFreeAdjSpaces: 7,
            minPlacementDistance: 7,
            avoidList: [ AVOID_LIST[LOOK_SOURCES] ]
        });
    }
}

module.exports = new StructContainer();
