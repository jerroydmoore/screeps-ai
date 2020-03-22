// structureMap from https://github.com/ScreepsQuorum/screeps-quorum
const structureMap = [
  false,
  'spawn',
  'extension',
  'road',
  'constructedWall',
  'rampart',
  'link',
  'container',
  'tower',
  'lab',
  'observer',
  'powerSpawn',
  'extractor',
  'storage',
  'terminal',
  'nuker',
  'loader',
  'crane',
];

class RoomLayout {
  constructor() {
    this.cache = new Map();
    this.dirty = new Set();
  }
  planStructure(room, structureType, pos) {
    let layout = this.getLayout(room);
    if (!layout.get(pos.x, pos.y)) {
      let intStruct = structureMap[structureType];
      layout.set(pos.x, pos.y, intStruct);
      this.dirty.add(room.name);
      return true;
    }
    return false;
  }
  getLayout(room) {
    let roomName = room.name;
    if (this.cache[roomName]) return this.cache[room.name];

    if (!room || !room.memory) return;
    if (!room.memory.layout) {
      this.cache.set(roomName, new PathFinder.CostMatrix());
      this.dirty.add(roomName);
    } else {
      this.cache[roomName] = PathFinder.CostMatrix.deserialize(room.memory.layout);
    }
    return this.cache.get(roomName);
  }
  hasLayout(room) {
    return room && room.memory && (this.cache[room.name] || room.memory.layout);
  }
  gc() {
    for (let roomName of this.dirty.values()) {
      let layout = this.cache.get(roomName);

      Memory.rooms[roomName].layout = layout.serialize();
    }
  }
}

module.exports = new RoomLayout();
module.exports.RoomLayout = RoomLayout;
module.exports.structureMap = structureMap;
