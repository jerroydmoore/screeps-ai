const EXIT_NAME = {
  [FIND_EXIT_TOP]: 'FIND_EXIT_TOP',
  [FIND_EXIT_LEFT]: 'FIND_EXIT_LEFT',
  [FIND_EXIT_BOTTOM]: 'FIND_EXIT_BOTTOM',
  [FIND_EXIT_RIGHT]: 'FIND_EXIT_RIGHT',
};

let _lowHealthStructs = {};
let _unhealthyWallsAndRamparts = {};

module.exports = {
  EXIT_NAME: EXIT_NAME,
  EXITS: [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT],

  gc(force) {
    if (force || Game.time % 25 === 0) {
      _lowHealthStructs = {};
      _unhealthyWallsAndRamparts = {};
    }
  },

  getInitialData(roomName) {
    //console.log(`${roomName} ` + JSON.stringify(Memory.rooms[roomName]));
    let data = { roomName: roomName, exits: {}, sMiners: {} };
    let exits = Game.map.describeExits(roomName);
    this.EXITS.forEach((exitDir) => {
      let isConnected = !!exits[exitDir];

      if (isConnected) {
        let name = exits[exitDir];
        if (Memory.rooms[name]) {
          data.exits[exitDir] = name;
        } else {
          data.exits[exitDir] = true;
        }
      } else {
        data.exits[exitDir] = false;
      }
    });
    Game.rooms[roomName].find(FIND_SOURCES).forEach((source) => {
      data.sMiners[source.id] = 0;
    });
    data.phase = 1;
    data.lastChecked = Game.time;
    // TODO determine if it's neutral. Say/Mark it on the world map.
    // creep.signController(controller, text)
    // console.log(JSON.stringify(data));
    return data;
  },

  healthRatio() {
    //console.log(`${this} ratio ${this.hits/this.hitsMax} ${this.hits} ${this.hitsMax}`)
    if (!this.hits || !this.hitsMax) return 1;
    let res = this.hits / this.hitsMax;
    return res;
  },

  /* static */ findLowHealthStructures(room, structureThreshold, roadThreshold = 0.2) {
    // accept Room Object, RoomPosition Object, String
    let roomName = room.name || room.roomName || room;

    if (!_lowHealthStructs[roomName]) {
      _lowHealthStructs[roomName] = room.find(FIND_STRUCTURES, {
        filter: (s) => {
          if (!s.hits || !s.hitsMax) return false;
          if ([STRUCTURE_WALL, STRUCTURE_RAMPART].includes(s.structureType)) {
            return false;
          }
          s.healthRatio = this.healthRatio;
          let threshold = s.structureType === STRUCTURE_ROAD ? roadThreshold : structureThreshold;

          return s.healthRatio() < threshold;
        },
      });
    }

    if (!_lowHealthStructs[roomName] || _lowHealthStructs[roomName].length === 0) return;
    _lowHealthStructs[roomName].sort((a, b) => a.healthRatio() - b.healthRatio());
    return _lowHealthStructs[roomName].pop();
  },
  findUnhealthyWallsAndRamparts(room, desiredHealth) {
    let roomName = room.name || room.roomName || room;

    if (!_unhealthyWallsAndRamparts[roomName]) {
      _unhealthyWallsAndRamparts[roomName] = room.find(FIND_STRUCTURES, {
        filter: (s) => {
          // if (s.structureType === STRUCTURE_WALL) {
          //     let check = [STRUCTURE_WALL, STRUCTURE_RAMPART].includes(s.structureType);
          //     console.log(`${s.pos} ${s.structureType} ${s.hits} < ${desiredHealth} ${check}`);
          // }
          return s.hits < desiredHealth && [STRUCTURE_WALL, STRUCTURE_RAMPART].includes(s.structureType);
        },
      });
      _unhealthyWallsAndRamparts[roomName].sort((a, b) => {
        if (a.hits !== b.hits) return a.hits - b.hits; // traditional sort
        // because ramparts decay, and walls do not, fortify ramparts first
        if (a.structureType === b.structureType) return 0;
        if (a.structureType === STRUCTURE_RAMPART) return -1;
        return 1;
      });
    }

    if (!_unhealthyWallsAndRamparts[roomName] || _unhealthyWallsAndRamparts[roomName].length === 0) return;
    return _unhealthyWallsAndRamparts[roomName].pop();
  },

  determineRoomName: function (roomName, exitDir) {
    let pre1 = roomName[0],
      leftright = parseInt(roomName[1]),
      pre2 = roomName[2],
      topbottom = parseInt(roomName[3]);

    switch (exitDir) {
      case FIND_EXIT_TOP:
        topbottom++;
        break;
      case FIND_EXIT_BOTTOM:
        topbottom--;
        break;
      case FIND_EXIT_RIGHT:
        leftright--;
        break;
      case FIND_EXIT_LEFT:
        leftright++;
        break;
      default:
        throw new Error('invalid direction ' + exitDir);
    }
    let newRoom = pre1 + leftright + pre2 + topbottom;
    // console.log('determine new room ' + roomName + ' -> ' + newRoom);
    return newRoom;
  },
  bfs: function (root) {
    let queue = [root.roomName];

    for (let roomName in Memory.rooms) {
      delete Memory.rooms[roomName].visited;
      delete Memory.rooms[roomName].path;
    }
    root.visited = 1;
    root.path = [];

    // console.log('bfs ' + JSON.stringify(root))

    for (let i = 0; i < queue.length; i++) {
      let node = Memory.rooms[queue[i]];
      // console.log('node ' + queue[i] + ' ' + JSON.stringify(node))
      for (let j = 0; j < this.EXITS.length; j++) {
        let exitDir = this.EXITS[j],
          child = node.exits[exitDir];

        if (!child || child.visited) continue;
        let path = node.path.slice(); //copy
        let thisSegment = { exit: exitDir, roomName: node.roomName };
        // console.log(`examining ${exitDir} ${EXIT_NAME[exitDir]} ` + JSON.stringify(thisSegment))
        path.push(thisSegment);

        if (child === true) {
          // true === we know it exists, but haven't entered. Go here!
          // console.log(`bfs path found! ` + JSON.stringify(thisSegment))
          return path;
        } else if (child === false) {
          // an exit in this direction does not exist
        } else {
          // value is a roomName, and we've been here before.
          //console.log(`examining ${EXIT_NAME[exitDir]}(${exitDir}) ` + JSON.stringify(thisSegment))
          // console.log(`bfs puth onto queue! ${EXIT_NAME[exitDir]}(${exitDir}) ` + JSON.stringify(thisSegment))
          Memory.rooms[child].path = path;
          queue.push(child);
          // }
        }
      }
    }
  },
};
