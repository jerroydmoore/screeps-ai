const CreepsBase = require('./creeps');
const Errors = require('./errors');

class RoleMiners extends CreepsBase {
  constructor(role = 'Miner') {
    super(role);
  }

  run(creep) {
    try {
      if (!this.is(creep)) return false;

      // Behavior: Find a free Source, go the Container next to it
      // Sit on the Container and mine the Source, until death.

      // the other creeps use 'sId'.
      // sId is ephemoral
      // we use sourceId.
      // sourceId will persist
      // console.log(`${creep} running ${creep.memory.sourceId} ${typeof creep.memory.sourceId}`);

      // initialize code
      if (!creep.memory.sourceId) {
        const room = creep.room;

        // type(room.memory.sMiners) = sourceId: creepId
        for (let sourceId in room.memory.sMiners) {
          let otherMinerId = room.memory.sMiners[sourceId];

          // get a source without valid assignment; e.g. previous miner died.
          if (!otherMinerId || !Game.getObjectById(otherMinerId)) {
            room.memory.sMiners[sourceId] = creep.id;
            creep.memory.sourceId = sourceId;
            break;
          }
        }
      }

      // seek to location
      let source;
      if (!creep.memory.isInPosition) {
        let containerPos;
        if (!creep.memory.pos) {
          source = Game.getObjectById(creep.memory.sourceId);
          let container = source.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (x) => {
              return x.structureType === STRUCTURE_CONTAINER;
            },
          });
          if (!container) {
            if (!this.emote('☹️ lost')) {
              console.log(`${creep} could not find a container near ${source}`);
            }
            return;
          }
          containerPos = container.pos;
          creep.memory.pos = containerPos.serialize();
        } else {
          containerPos = RoomPosition.deserialize(creep.memory.pos);
        }
        if (creep.pos.equals(containerPos)) {
          creep.memory.isInPosition = true;
          delete creep.memory.pos;
        } else {
          this.travelTo(creep, containerPos, '#ffaa00', true);
        }
      }

      // act
      if (creep.memory.isInPosition) {
        if (!source) {
          source = Game.getObjectById(creep.memory.sourceId);
        }
        let code = creep.harvest(source);

        if (code === ERR_NO_BODYPART) {
          // unable to harvest?
          this.suicide(creep);
        }
        Errors.check(creep, `harvest(${source} ${source.pos})`, code);
      }
    } catch (e) {
      console.log(`ERROR ${creep} ${e.stack}`);
    }
  }
  storeEnergy(creep) {
    let structure = creep.pos.findInRange(FIND_STRUCTURES, 3, {
      filter: (s) => {
        let type = s.structureType;
        return type === STRUCTURE_STORAGE || type === STRUCTURE_CONTAINER;
      },
    });

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
      this.travelTo(creep, structure, '#00FF3C'); // green
    }
  }
  gc() {}
}

module.exports = new RoleMiners();
