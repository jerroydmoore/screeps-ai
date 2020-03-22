const Errors = require('./errors');

// orderStructures from https://github.com/ScreepsQuorum/screeps-quorum
const orderStructures = [
  STRUCTURE_SPAWN,
  STRUCTURE_STORAGE,
  STRUCTURE_TOWER,
  STRUCTURE_EXTENSION,
  STRUCTURE_CONTAINER,
  STRUCTURE_LINK,
  STRUCTURE_WALL,
  STRUCTURE_EXTRACTOR,
  STRUCTURE_TERMINAL,
  STRUCTURE_LAB,
  STRUCTURE_RAMPART,
  STRUCTURE_OBSERVER,
  STRUCTURE_NUKER,
  STRUCTURE_POWER_SPAWN,
  STRUCTURE_ROAD,
];

const CONSTRUCTION_SITES_PER_ROOM_LIMIT = 4;
const EXISTING_CONSTRUCTION_SITE_THRESHOLD = 95;
const CONSTRUCTION_SITE_LIMIT = 100;

function priorityStructureSort(a, b) {
  if (orderStructures.indexOf(a.type) === orderStructures.indexOf(b.type)) {
    // "queue" helps maintain a FIFO among the same type.
    // this is particularly useful for something like building a road!
    return a.queue - b.queue;
  }
  return orderStructures.indexOf(a.type) - orderStructures.indexOf(b.type);
}

let _constructionSites = {};
let _howmanySites = 0;
function _buildConstructionSiteCache() {
  _howmanySites = 0;
  Object.keys(Game.constructionSites).forEach((key) => {
    let site = Game.constructionSites[key],
      roomName = site.room.name;
    _howmanySites++;
    if (!_constructionSites[roomName]) _constructionSites[roomName] = [];
    _constructionSites[roomName].push(site);
  });
}

const BuildOrders = {
  schedule(room, type, _pos) {
    // schedule does not check if _pos is occupied.
    // caller should do this, before calling this method

    const orders = Memory.con[room.name] || [];
    const pos = _pos.serialize();
    const result = this.getScheduledAt(room, _pos);

    if (result && result.type === type) {
      // console.log(`${_pos} tried to schedule another ${type}`);
      return true;
    } else if (result && result.type === STRUCTURE_ROAD) {
      console.log(`${_pos} replacing planned road with a planned ${type}`);
      result.type = type;
      orders.sort(priorityStructureSort);

      return true;
    } else if (result) {
      // something else is built here.
      console.log(`${_pos} cannot schedule ${type}; ${result.type} already scheduled here`);
      return false;
    }

    // otherwise, nothing is here. Schedule the build.
    Memory.buildOrderCount = Memory.buildOrderCount || 1;
    orders.push({ type, pos, queue: Memory.buildOrderCount++ });
    orders.sort(priorityStructureSort);
    Memory.con[room.name] = orders;
    return true;
  },

  getCount(_room, filter) {
    const roomName = _room.name || _room; // accept either Room Object or String
    let orders = Memory.con[roomName] || [];
    let res = orders.map((x) => ({ structureType: x.type }));
    res = _.filter(res, filter);

    // console.log(type + ' ' + orders.length + ' ' + res.length);
    return res.length;
  },
  getAllScheduled(_room) {
    const roomName = _room.name || _room; // accept either Room Object or String
    const orders = Memory.con[roomName] || [];
    return orders.map((x) => ({
      type: x.type,
      pos: RoomPosition.deserialize(x.pos),
    }));
  },

  getScheduledAt(room, _pos, type) {
    // type is optional
    const orders = Memory.con[room.name] || [];
    const pos = _pos.serialize();
    const result = orders.find((x) => x.pos === pos);
    if (type === undefined || type === result.type) {
      return result;
    }
    return undefined;
  },

  countAllConstructionSites() {
    if (!_howmanySites) {
      _buildConstructionSiteCache();
    }
    return _howmanySites;
  },
  getConstructionSites(room) {
    let roomName = room.name || room;

    if (!_constructionSites[roomName]) {
      _buildConstructionSiteCache();
    }

    return _constructionSites[roomName] || [];
  },

  execute(room) {
    if (!Memory.con[room.name] || !Memory.con[room.name].length) return;

    // check max number of constucture sites
    // are there enough build orders right now?
    const siteCount = this.countAllConstructionSites();
    const mySites = this.getConstructionSites(room);
    if (siteCount >= EXISTING_CONSTRUCTION_SITE_THRESHOLD || mySites.length >= CONSTRUCTION_SITES_PER_ROOM_LIMIT) {
      return 0;
    }

    const orders = Memory.con[room.name];
    let howmany = 0;

    while (
      siteCount + howmany < CONSTRUCTION_SITE_LIMIT &&
      mySites.length + howmany < CONSTRUCTION_SITES_PER_ROOM_LIMIT
    ) {
      if (!orders || !orders.length) break;

      let code = OK;
      let { type, pos } = orders.shift();
      pos = RoomPosition.deserialize(pos);

      const roomName = pos.roomName;
      const room = Game.rooms[roomName];
      if (room) {
        code = room.createConstructionSite(pos, type);
        Errors.check(pos, `createConstructionSite(${type})`, code);

        if (code === OK) {
          howmany++;
          // building an unwalkable thing, remove a road if it exists
          let res = room.lookAt(pos).find((x) => x.type === STRUCTURE_ROAD);
          if (res) {
            // we don't dismantle (yet), because you need at least 4 WORK
            // parts to get back 1 energy, because you reclaim 0.25 energies
            // for each part, and then energies are rounded down.
            res.structure.destroy();
          }
        } else if (code === ERR_FULL || code === ERR_RCL_NOT_ENOUGH) {
          // unable to fullfill order, but can in the future, reschedule
          orders.unshift({ type, pos: pos.serialize() });
          if (code === ERR_FULL) break;
        }
      } else {
        console.log(`${pos} Abandoning planned ${type}. Room is not visible.`);
      }
    }
    return howmany;
  },
  gc() {
    _constructionSites = {};
    _howmanySites = 0;
  },
};

module.exports = BuildOrders;
