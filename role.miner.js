const CreepsBase = require('creeps');

class RoleMiners extends CreepsBase {
    constructor() {
        super('Miner');
    }

    run (creep) {
        // the other creeps use 'sId' that is ephemoral
        // sourceId will persist
        if (! creep.memory.sourceId) {
            let roomName = creep.room.name;
            
            Object.keys(Memory.rooms[roomName].sMiners).forEach(sId => {
                if (creep.memory.sourceId) return;
                let minerId = Memory.rooms[roomName].sMiners[sId];

                // Miner might have died. Check if the id still resolves.
                if (minerId && Game.getObjectById(minerId)) return;

                Memory.rooms[roomName].sMiners[sId] = creep.id;
                creep.memory.sourceId = sId;
            });
        }

        if (!creep.memory.full) {
            this.harvest(creep, creep.memory.sourceId, true);
        } else {
            this.storeEnergy(creep);
        }
    }
    storeEnergy (creep) {
        let structure = creep.pos.findInRange(FIND_STRUCTURES, 3, {filter: (s) => {
            let type = s.structureType;
            return type === STRUCTURE_STORAGE || type === STRUCTURE_CONTAINER;
        }});

        if (!structure.length) {
            console.log(`${creep} ${creep.pos} unable to find storage medium`);
            return;
        }
        structure = structure[0];

        let code = creep.transfer(structure, RESOURCE_ENERGY);

        // this.emote(creep, '🔋charging', code);

        if (code === OK) {
            creep.busy = 1;
        } else if (code === ERR_NO_BODYPART) {
            // unable to energize?
            this.suicide(creep);
        } else if (code === ERR_NOT_IN_RANGE) {
            this.travelTo(creep, structure,'#00FF3C'); // green
        }
    }
    gc () {
    }
}

module.exports = new RoleMiners();
