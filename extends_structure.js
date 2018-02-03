const utils = require('utils');

if(! Structure.prototype.isRampart) {
    Structure.prototype.isRampart = function () {
        return this.structureType === STRUCTURE_RAMPART;
    };
}

utils.addMemoryProperty(Source.prototype, 'sources');
if (! Source.prototype.hasOwnProperty('rangeFromController')) {
    Object.defineProperty(Source.prototype, 'rangeFromController', {
        get() {
            if(! this.room.controller) {
                return -1;
            }
            if(! this.memory._rangeFromController) {
                let res = PathFinder.search(this.pos, {pos: this.room.controller});
                this.memory._rangeFromController = res.path ? res.path.length : -1;
            }
            return this.memory._rangeFromController;
        }
    });  
}