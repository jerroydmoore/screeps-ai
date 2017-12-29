
if(! Structure.prototype.isRampart) {
    Structure.prototype.isRampart = function () {
        return this.structureType === STRUCTURE_RAMPART;
    };
}
