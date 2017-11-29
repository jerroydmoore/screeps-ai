const Errors = require('errors')
const roleHarvester = require('role.harvester');
const Constants = require('constants');
const CreepsBase = require('creeps');

function healthRatio() {
    //console.log(`${this} ratio ${this.hits/this.hitsMax} ${this.hits} ${this.hitsMax}`)
    if( !this.hits || !this.hitsMax) return 1;
    let res = this.hits/this.hitsMax;
    return res;
}

let _lowHealthStructs = {}
const role = "Builder";

class RoleBuilder extends CreepsBase {
    constructor() {
        super(role);
    }
    
    /* static */ findLowHealthStructures (room, healthRatioThreshold) {
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
    }
    repair (creep, repairThreshold=0.2, fixedThreshold=0.95) {
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
            if (code === OK || code === ERR_NOT_ENOUGH_RESOURCES)  {
                creep.busy = 1;
            }
            if(code == ERR_NOT_IN_RANGE) {
                this.moveTo(creep, structure, '#FF0000');
            } else if(code === ERR_INVALID_TARGET) {
                console.log(`${creep} cannot repair ${structure}`)
                delete creep.memory.repairId;
            } else if (code === ERR_NO_BODYPART) {
                // unable to move?
                this.suicide(creep);
            }
            if (!creep.busy) {
                console.log('find anothe repair ' + code)
                this.repair(creep, repairThreshold, fixedThreshold) // try again with a valid target
            }
        }
    }
    build (creep) {

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
                this.moveTo(creep, target, '#ffe56d');
            } else if(code === ERR_INVALID_TARGET) {
                delete creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]]
            } else if (code === ERR_NO_BODYPART) {
                // unable to build?
                this.suicide(creep);
            }
        } else if(targetId) {
            delete creep.memory[Constants.MemoryKey[LOOK_CONSTRUCTION_SITES]]
        }
    }
    
    run (creep) {

        super.run(creep);

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
    }
    gc () {
        _lowHealthStructs = {};
    }
};

module.exports = new RoleBuilder();
