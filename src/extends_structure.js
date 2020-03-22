const utils = require('./utils');

if (!Structure.prototype.isRampart) {
  Structure.prototype.isRampart = function () {
    return this.structureType === STRUCTURE_RAMPART;
  };
}

utils.addMemoryProperty(Source.prototype, 'sources');
if (!Object.prototype.hasOwnProperty.call(Source.prototype, 'rangeFromController')) {
  Object.defineProperty(Source.prototype, 'rangeFromController', {
    get() {
      if (!this.room.controller) {
        return -1;
      }
      if (!this.memory._rangeFromController) {
        this.memory._rangeFromController = -1;
        let res;
        try {
          res = PathFinder.search(this.pos, { pos: this.room.controller });
        } catch (ex) {
          console.log('addMemoryProperty failed for Source[' + this + ']: ' + ex.message + '. ' + ex.stack);
        }
        if (res && res.path && res.path.length !== undefined) {
          this.memory._rangeFromController = res.path.length;
        }
      }
      return this.memory._rangeFromController;
    },
  });
}
