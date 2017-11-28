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
};
module.exports = new StructExtensions();
