const roleHarvester = require('role.harvester');
const CreepsBase = require('creeps');
const RoomsUtils = require('rooms');
const Phases = require('phases');
const Utils = require('utils');

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
                this.travelTo(creep, structure, '#FF0000'); // red
            } else if(code === ERR_INVALID_TARGET) {
                console.log(`${creep} cannot repair ${structure}`);
                delete creep.memory.repairId;
            } else if (code === ERR_NO_BODYPART) {
                // unable to move?
                this.suicide(creep);
            }

            if (!creep.busy) {
                console.log('find another repair ' + code);
                this.repair(creep, repairThreshold, fixedThreshold); // try again with a valid target
            }
        }
    }
    fortify(creep, structure) {
        // find walls/ramparts to build up
        let phases = Phases.getCurrentPhaseInfo(creep.room);
        let desiredHealth = phases.RampartDesiredHealth;
        if (! desiredHealth) {
            return;
        }

        let wallId = creep.memory.wallId;
        if (wallId && !structure) {
            structure = Game.getObjectById(wallId);

            if ( !structure || structure.hits > desiredHealth) {
                structure = undefined;
                delete creep.memory.wallId;
                delete creep.memory.repairPos;
                // If remembered thing not found, find another thing to do
                // as to not waste this tick.
                this.fortify(creep);
            }
        }
        
        if (!structure) {
            let healthThreshold = desiredHealth*0.8;
            structure = RoomsUtils.findUnhealthyWallsAndRamparts(creep.room, healthThreshold);
        }
        if (structure) {
            creep.memory.wallId = structure.id;

            let code = creep.repair(structure);
            // this.emote(creep, '👾 fortify', code);
            if (code === OK || code === ERR_NOT_ENOUGH_RESOURCES)  {
                creep.busy = 1;
            }
            if(code == ERR_NOT_IN_RANGE) {
                this.travelTo(creep, structure, '#FF0000'); // red
            } else if(code === ERR_INVALID_TARGET) {
                console.log(`${creep} cannot fortify ${structure}`);
                delete creep.memory.wallId;
            } else if (code === ERR_NO_BODYPART) {
                // unable to move?
                this.suicide(creep);
            }
        }
    }
    build (creep) {

        let targetId = creep.memory.cId,
            target = undefined;
        
        if (targetId) {
            target = Game.getObjectById(targetId);
            if(! target) {
                // the thing we were building is done. Find something else to do on this tick.

                if (creep.memory.repairPos) {
                    // fortify walls & ramparts immediately after built.
                    let structure;
                    if ( !creep.memory.wallId) {
                        // find the thing first
                        let pos = RoomPosition.deserialize(creep.memory.repairPos);
                        structure = creep.room.lookForAt(LOOK_STRUCTURES, pos).find(s => s.isRampart());
                        creep.memory.wallId = structure.id;
                    }
                    if (creep.memory.wallId) {
                        return this.fortify(creep, structure);
                    } else {
                        // unable to find wall, give up trying to repair it.
                        delete creep.memory.repairPos;
                    }
                }

                if (! creep.memory.repairPos) {
                    // Try to build another thing
                    delete creep.memory.cId;
                    return this.build(creep);
                }
            }
        }
        if (! target) {
            target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        }

        if (target) {
            creep.memory.cId = target.id;

            if (target.isRampart() && !creep.memory.repairPos) {
                // after we build, repair it immediately.
                creep.memory.repairPos = target.pos.serialize();
            }
            
            let code = creep.build(target);
            this.emote(creep, '🚧 build', code);
            if (code === OK) {
                creep.busy = 1;
            } else if(code == ERR_NOT_IN_RANGE) {
                this.travelTo(creep, target, '#ffe56d');
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
            this.fortify(creep);
            
            if (! creep.busy && !skipRepair) {
                this.repair(creep);
            }

            if (! creep.busy) {
                this.build(creep);
            }
        } else {
            roleHarvester.harvest(creep);
        }
    }
}

module.exports = new RoleBuilder();
