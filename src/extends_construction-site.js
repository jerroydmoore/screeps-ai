if (!ConstructionSite.prototype.isRampart) {
  ConstructionSite.prototype.isRampart = function () {
    return this.structureType === STRUCTURE_RAMPART;
  };
}
