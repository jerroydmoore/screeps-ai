const BuildOrders = require('./build-orders');

function pruneBallots(ballots, expiration) {
  return ballots.filter((t) => t + expiration > Game.time);
}
const VOTE_EXPIRATION = 100;
const ELECTION_THRESHOLD = 5;
const Road = {
  buildAt(target) {
    let pos = target.pos || target,
      room = target.room || Game.rooms[pos.roomName];

    return BuildOrders.schedule(room, STRUCTURE_ROAD, pos);
  },
  shouldBuildAt: function (target) {
    if (!target || !target.room || !target.room.controller) return;
    if (target.room.controller.level < 2) {
      // console.log('It is not time to build roads yet');
      return false;
    }
    if (!this.haveRoad(target) && this.voteForRoad(target, ELECTION_THRESHOLD, VOTE_EXPIRATION)) {
      target.say('🏗 road');
      return OK === this.buildAt(target);
    }
    return false;
  },
  haveRoad: function (target) {
    let pos = target.pos || target,
      room = target.room || Game.rooms[pos.roomName],
      objects = room.lookAt(pos);

    // look for a road. if we find one, when we don't need to build one.
    let res = objects.find((o) => {
      return (
        (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === STRUCTURE_ROAD) ||
        (o.type === LOOK_STRUCTURES && o.structure.structureType === STRUCTURE_ROAD)
      );
    });

    // We do not need the check the build schedule,
    // because the BuildOrders.schedule checks it for us

    return res !== undefined;
  },
  voteForRoad: function (target, voteThreshold, expiration) {
    if (!Memory.roads) Memory.roads = {};
    let pos = target.pos,
      addr = `${pos.roomName},${pos.x},${pos.y}`,
      ballots = Memory.roads[addr];

    if (!ballots) {
      Memory.roads[addr] = [Game.time];
      //console.log(`${target} votes #${Memory.roads[addr].length} at ${target.pos}`);
      return false;
    }
    Memory.roads[addr] = pruneBallots(ballots, expiration);
    Memory.roads[addr] = Memory.roads[addr].map(() => Game.time); // when a candidate is voted on, all votes get refreshed
    Memory.roads[addr].push(Game.time);
    ballots = Memory.roads[addr];
    //console.log(`${target} votes #${ballots.length} at ${target.pos}`);

    if (ballots.length >= voteThreshold) {
      delete Memory.roads[addr];
      return true;
    }
    return false;
  },
  connect: function (target, destinations) {
    // Create construction sites from target to all destinations

    if (!destinations || destinations.length === 0) return;

    let targetPos = target.pos || target;
    destinations.forEach((dest) => {
      let pos = dest.pos || dest;

      let res = PathFinder.search(
        targetPos,
        { pos, range: 1 },
        {
          // maxRooms: 1,
          swampCost: 4,
          plainCost: 2,
          roomCallback: (roomName) => {
            let room = Game.rooms[roomName];
            if (!room) return;
            let costs = new PathFinder.CostMatrix();

            room.find(FIND_STRUCTURES).forEach((struct) => {
              if (struct.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(struct.pos.x, struct.pos.y, 1);
              } else if (
                struct.structureType !== STRUCTURE_CONTAINER &&
                (struct.structureType !== STRUCTURE_RAMPART || !struct.my)
              ) {
                // Can't walk through non-walkable buildings
                costs.set(struct.pos.x, struct.pos.y, 0xff);
              }
            });
            room.find(FIND_MY_CONSTRUCTION_SITES).forEach((struct) => {
              if (struct.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(struct.pos.x, struct.pos.y, 1);
              } else if (
                struct.structureType !== STRUCTURE_CONTAINER &&
                (struct.structureType !== STRUCTURE_RAMPART || !struct.my)
              ) {
                // Can't walk through non-walkable buildings
                costs.set(struct.pos.x, struct.pos.y, 0xff);
              }
            });

            // Read through the scheduled build orders
            // Try to reuse roads scheduled to be built
            // Avoid spaces with planned structures
            let orders = BuildOrders.getAllScheduled(room);
            orders.forEach((order) => {
              let cost = order.type === STRUCTURE_ROAD ? 1 : 0xff;
              costs.set(order.pos.x, order.pos.y, cost);
            });

            return costs;
          },
        }
      );
      let path = res.path;

      path.forEach((point) => {
        if (this.haveRoad(point)) return;
        this.buildAt(point);
      });
    });
  },
  gc: function (force) {
    if (force || (Memory.roads && Game.time % 1000 === 0)) {
      // let howmanyAddr = 0, delAddr = 0, deltaBallots = 0;
      for (let addr in Memory.roads) {
        // howmanyAddr++;
        // let len = Memory.roads[addr].length;
        Memory.roads[addr] = pruneBallots(Memory.roads[addr], ELECTION_THRESHOLD, VOTE_EXPIRATION);
        // deltaBallots += len - Memory.roads[addr].length;
        if (Memory.roads[addr].length === 0) {
          delete Memory.roads[addr];
          // delAddr++;
        }
      }
      //console.log(`Pruned road ${deltaBallots} ballots. Deleted ${delAddr}/${howmanyAddr} candidates`);
    }
  },
};

module.exports = Road;
