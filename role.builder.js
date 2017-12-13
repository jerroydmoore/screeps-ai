const roleHarvester = require('role.harvester');
const CreepsBase = require('creeps');
const RoomsUtils = require('rooms');

const role = 'Builder';

class RoleBuilder extends CreepsBase {
    constructor() {
        super(role);
    }
    
    repair (creep, repairThreshold=0.2, fixedThreshold=0.95) {
        let repairId = creep.memory.repairId,
            structure = undefined;

        if (repairId) {
            structure = Game.getObjectById(repairId);
            let ratio = RoomsUtils.healthRatio.call(structure);

            if ( ratio > fixedThreshold) {
                structure = undefined;
                delete creep.memory.repairId;
            }
        }
        
        if (!structure) {
            structure = RoomsUtils.findLowHealthStructures(creep.room, repairThreshold);
        }
        
        if (structure) {
            creep.memory.repairId = structure.id;

            let code = creep.repair(structure);
            this.emote(creep, '🔧 repair', code);
            if (code === OK || code === ERR_NOT_ENOUGH_RESOURCES)  {
                creep.busy = 1;
            }
            if(code == ERR_NOT_IN_RANGE) {
                this.moveTo(creep, structure, '#FF0000'); // red
            } else if(code === ERR_INVALID_TARGET) {
                console.log(`${creep} cannot repair ${structure}`);
                delete creep.memory.repairId;
            } else if (code === ERR_NO_BODYPART) {
                // unable to move?
                this.suicide(creep);
            }
            if (!creep.busy) {
                console.log('find anothe repair ' + code);
                this.repair(creep, repairThreshold, fixedThreshold); // try again with a valid target
            }
        }
    }
    build (creep) {

        let targetId = creep.memory.cId,
            target = undefined;
        
        if (targetId) {
            target = Game.getObjectById(targetId);
        } else {
            target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        }

        if (target) {
            creep.memory.cId = target.id;
            
            let code = creep.build(target); 
            this.emote(creep, '🚧 build', code);
            if (code === OK) {
                creep.busy = 1;
            } else if(code == ERR_NOT_IN_RANGE) {
                this.moveTo(creep, target, '#ffe56d');
            } else if(code === ERR_INVALID_TARGET) {
                delete creep.memory.cId;
            } else if (code === ERR_NO_BODYPART) {
                // unable to build?
                this.suicide(creep);
            }
        } else if(targetId) {
            delete creep.memory.cId;
        }
    }
    
    run (creep, skipRepair=false) {

        if(creep.memory.full) {
            this.build(creep);
            if (!creep.busy && !skipRepair) {
                this.repair(creep);
            }
        } else {
            roleHarvester.harvest(creep);
        }
    }
    gc () {
    }
}

module.exports = new RoleBuilder();
