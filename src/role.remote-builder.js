const roleBuilder = require('./role.builder');
const Roads = require('./roads');
const AbstractRemoteCreep = require('./abstract-remote-creep');

const FLAG_TTL = 99;
class RemoteBuilder extends AbstractRemoteCreep {
  constructor(role = 'RemoteBuilder') {
    super(role, COLOR_BLUE, COLOR_BLUE, 'ttlBuilder', FLAG_TTL);
  }
  run(creep) {
    if (!this.is(creep)) return false;

    // If in originRoom, go to next room, then
    // build everything in the room.
    // when nothing is buildable, go to next room and repeat
    // when we reach the target room, flag the flag as claimable.

    let destflag = this.getMyFlag(creep);
    if (!destflag) {
      // The flag deleted itself. Become builders until you die.
      roleBuilder.run(creep);
      return;
    }
    if (destflag.secondaryColor === COLOR_CYAN) {
      // Spawn is built. Do not go back to home base for energy.
      delete creep.memory.sourceId;
    }

    if (!destflag.memory.roadBuild) {
      Roads.connect(creep, [destflag]);
      destflag.memory.roadBuild = 1;
    }

    // console.log(Game.getObjectById(creep.memory.sourceId))

    if (creep.memory.full) {
      // if in origin room, go to next room
      if (creep.memory.currRoom !== creep.pos.roomName) {
        // step away from the entrance or you'll keep thrashing between rooms
        this.travelTo(creep, destflag);
      } else if (creep.memory.origin !== creep.room.name) {
        this.build(creep);
      }
      if (!creep.busy) {
        this.travelTo(creep, destflag);
      }
      creep.memory.currRoom = creep.pos.roomName;
    } else {
      let source = this.harvest(creep, {
        sourceId: creep.memory.sourceId,
        notBuildRoads: true,
        alwaysPickupEnergy: true,
      });

      if (!creep.memory.sourceId && (source instanceof StructureContainer || source instanceof StructureStorage)) {
        creep.memory.sourceId = source.id;
      }
    }
  }
}

module.exports = new RemoteBuilder();
