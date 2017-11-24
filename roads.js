Road = {
    shouldBuildAt: function(target) {

        if (this.needsRoad(target)) {
            target.say('🏗 road')
            target.room.createConstructionSite(target, STRUCTURE_ROAD)
        }
    },
    needsRoad: function(target) {
        let objects = target.room.lookAt(target);
        //let objects = target.pos.look();
        
        // look for a road. if we find one, when we don't need to build one.
        let res = objects.find(o => {
            return (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === STRUCTURE_ROAD)
                || (o.type === LOOK_STRUCTURES && o.structure.structureType === STRUCTURE_ROAD)
        });

        return res === undefined;
    }
}

module.exports = Road;