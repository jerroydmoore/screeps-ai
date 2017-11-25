const roleHarvester = require('role.harvester');
const Constants = require('constants');

function healthRatio() {
    //console.log(`${this} ratio ${this.hits/this.hitsMax} ${this.hits} ${this.hitsMax}`)
    if( !this.hits || !this.hitsMax) return 1;
    let res = this.hits/this.hitsMax;
    return res;
}
let _lowHealthStructs = {}
module.exports = {
    roleName: "Builder",

    is: function(creep) {
        return creep.name.startsWith(module.exports.roleName);
    },
    findLowHealthStructures: function(room, healthRatioThreshold) {
        if (!_lowHealthStructs[room.id]) {
            _lowHealthStructs[room.id] = room.find(FIND_STRUCTURES, {
                filter: (s) => {
                    //console.log(`${s} ${s.hits} ${s.hitsMax}`)
                    if (!s.hits || !s.hitsMax) return false;
                    s.healthRatio = healthRatio;
                    //if(s.healthRatio() < .75) console.log(`${s} ${s.hits/s.hitsMax}`)
                    return s.healthRatio() < healthRatioThreshold;
                }
            });
        }
        _lowHealthStructs[room.id].sort((a,b) => a.healthRatio - b.healthRatio);
        return _lowHealthStructs[room.id];
    },
    repair: function (creep, repairThreshold=0.2, fixedThreshold=0.95) {
        let repairId = creep.memory.repairId,
            structure = undefined;
        let ratio;
        if (repairId) {
            structure = Game.getObjectById(repairId)
            ratio = healthRatio.call(structure);

            if ( healthRatio.call(structure) > fixedThreshold) {
                structure = undefined;
                delete creep.memory.repairId
            }
        }
        
        if (!structure) {
            let targets = this.findLowHealthStructures(creep.room, repairThreshold);
            if (!targets.length) return;
            targets.sort((a,b) => a.healthRatio() - b.healthRatio());
            structure = targets.shift();

            ratio = structure.hits/structure.hits;
        }
        if (structure) {
            creep.memory.repairId = structure.id;

            let code = creep.repair(structure);
            if (code === OK) {
                creep.busy = 1;
                //console.log (`${creep} repairing ${structure} ${structure.pos} hp ${ratio}`)
            }
            if(code == ERR_NOT_IN_RANGE) {
                //console.log (`${creep} to repair ${structure} ${structure.pos} hp ${ratio}`)
                let code = creep.moveTo(structure);
                if (code === OK) {
                    creep.busy = 1;
                }
            } else if(code === ERR_INVALID_TARGET) {
                delete creep.memory.repairId;
            }
        }
        if (!creep.busy) {
            this.repair(creep, repairThreshold, fixedThreshold) // try again with a valid target
        }
    },
    build: function (creep) {

        let targetId = creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]],
            target = undefined;
        
        if (targetId) {
            target = Game.getObjectById(targetId);
        } else {
            target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        }

        if (target) {
            creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]] = target.id;
            
            let code = creep.build(target); 
            if (code === OK) {
                creep.busy = 1;
            } else if(code == ERR_NOT_IN_RANGE) {
                let code = creep.moveTo(target, {visualizePathStyle: {stroke: '#FF0000'}}); // red
                if(code === OK) {
                    creep.busy = 1;
                }
            } else if(code === ERR_INVALID_TARGET) {
                delete creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]]
            }
        } else if(targetId) {
            delete creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]]
        }
    },
    
    run: function(creep) {

        if(creep.memory.full && creep.carry.energy == 0) {
            delete creep.memory.full;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.full && creep.carry.energy == creep.carryCapacity) {
            delete creep.memory[Constants.MemoryKey[LOOK_SOURCES]];
            delete creep.memory.repairId;
            creep.memory.full = 1;
            creep.say('🚧 build');
        }

        if(creep.memory.full) {
            this.build(creep);
            if (!creep.busy) {
                this.repair(creep);
            }
        } else {
            roleHarvester.harvest(creep);
        }
    },
    gc: function() {
        _lowHealthStructs = {};
    }
};