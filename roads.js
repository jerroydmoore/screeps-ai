const Errors = require('errors');
Road = {
    shouldBuildAt: function(target) {

        if (this.needsRoad(target)) {
            target.say('🏗 road')
            target.room.createConstructionSite(target, STRUCTURE_ROAD);
        }
    },
    needsRoad: function(target) {
        let objects = target.room.lookAt(target);
        
        // look for a road. if we find one, when we don't need to build one.
        let res = objects.find(o => {
            return (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === STRUCTURE_ROAD)
                || (o.type === LOOK_STRUCTURES && o.structure.structureType === STRUCTURE_ROAD)
        });

        return res === undefined;
    },
    connect: function(pos, targets) {
        // Create construction sites from pos to all targets

        targets.forEach((target) => {
            let path = pos.findPathTo(target);
            path.forEach((point) => {
                let code = target.room.createConstructionSite(target, STRUCTURE_ROAD);
                Errors.check(point, 'createRoad', code);
            })
        })
    }
}

module.exports = Road;
