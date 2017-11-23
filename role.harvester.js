
module.exports = {
    roleName: "Harvester",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },

    harvest: function(creep) {
        creep.busy = 1;
        let source;
        if (creep.memory.sourceId) {
            source = Game.getObjectById(creep.memory.sourceId);
        } else {
            source = creep.pos.findClosestByPath(FIND_SOURCES);
            creep.memory.sourceId = source.id;
        }
        if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    },

    run: function(creep) {

        if(creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            creep.memory.full = 1;
            creep.say('🔋 charging');
        }

        if(!creep.memory.full) {
            module.exports.harvest(creep);
        }
        else {
            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                        structure.energy < structure.energyCapacity;
                }
            });
            if(targets.length > 0) {
                creep.busy = 1;
                if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};