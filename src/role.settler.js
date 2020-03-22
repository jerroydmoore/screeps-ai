const Errors = require('./errors');
const AbstractRemoteCreep = require('./abstract-remote-creep');

const FLAG_TTL = 205;
class RoleSettler extends AbstractRemoteCreep {
  constructor(roleName = 'Settler') {
    super(roleName, COLOR_BLUE, COLOR_BLUE, 'ttlSettler', FLAG_TTL, 'settleId');
  }
  run(creep) {
    if (!this.is(creep)) return false;

    // If not in targetRoom, go to next room
    // If in targetRoom, claim Upgrader
    // Repeat
    // If Upgrader claimed, become a builder.

    let destflag = this.getMyFlag(creep);
    if (!destflag || destflag.secondaryColor === COLOR_CYAN) {
      // The flag deleted itself. Recycle yourself.
      this.travelTo(creep, destflag);
      let spawn = destflag.room.lookForAt(LOOK_STRUCTURES, destflag).find((x) => x.structureType === STRUCTURE_SPAWN);
      let code = spawn.recycleCreep(creep);
      console.log(`${spawn} results ${code}`);
      if (code === OK) {
        creep.drop(RESOURCE_ENERGY);
      }
      return;
    }

    if (!creep.memory.full) {
      this.harvest(creep, { notBuildRoads: true, alwaysPickupEnergy: true });
    } else if (destflag.pos.roomName !== creep.pos.roomName) {
      // go to our target room
      this.travelTo(creep, destflag, false);
    } else {
      // we don't have the controller. Claim it.
      this.claimController(creep);

      if (!creep.busy) {
        // We have the controller. Build the Spawner
        this.build(creep);
      }
    }
  }
  claimController(creep) {
    if (creep.room.controller && !creep.room.controller.my) {
      let controller = creep.room.controller;
      if (!controller.owner || !controller.owner.username) {
        //claim it!
        let code = creep.claimController(controller);
        if (code === OK) {
          creep.busy = 1;
        } else if (code === ERR_NOT_IN_RANGE) {
          this.travelTo(creep, controller, '#b99cfb', true);
          creep.busy = 1;
        } else if (code === ERR_GCL_NOT_ENOUGH) {
          console.log('Not enough GCL to claim a room');
          this.suicide(creep);
        } else {
          Errors.check(creep, 'claimController', code);
        }
      }
    }
  }
}

module.exports = new RoleSettler();
