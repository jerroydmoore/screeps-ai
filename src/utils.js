class AvoidStructure {
  constructor(structureType, opts = {}) {
    this.structureType = structureType;
    this.range = opts.range || 1;
    this.type = opts.resolveTo; // optional. Will be set by AVOID by findFreePosNearby
    this.isCheckered = opts.isCheckered; // optional.
  }
  filter(o) {
    let res = o.type === LOOK_STRUCTURES && o.structure.structureType === this.structureType;
    res = res || (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === this.structureType);
    return res;
  }
}

function isEdge(i, j, { x, y }, range) {
  // console.log(`abs(${j} - ${x}) === ${range} || abs(${i} - ${y}) === ${range}`);
  return Math.abs(j - x) === range || Math.abs(i - y) === range;
}
function isCloseToRoomEdge(i, j) {
  return i < 3 || j < 3 || i > 46 || j > 46;
}

// eslint-disable-next-line no-unused-vars
function printMatrix(matrix, message, transformer) {
  transformer = transformer || ((x) => x.type);
  if (message) {
    console.log(message);
  }
  let headerPrinted = false,
    header = [],
    row;
  for (let i in matrix) {
    if (!matrix[i]) continue;
    row = [];
    for (let j in matrix[i]) {
      header.push(j);
      let cell = matrix[i][j];
      if (!cell) continue;
      row.push(cell);
    }
    if (!headerPrinted) {
      console.log('    ' + header.join(' '));
      headerPrinted = true;
    }
    console.log(i + ': ' + row.map(transformer).join('  '));
  }
}
const FREE = 0,
  FREE_BUT_DISQUALIFIED = 1,
  OCCUPIED = 2,
  AVOID_AREA = 3;
const FREE_ENTRY = { type: FREE, range: 0 };
const DISQUALIFIED_ENTRY = { type: FREE_BUT_DISQUALIFIED, range: 0 };
const OCCUPIED_ENTRY = { type: OCCUPIED, range: 0 };

const utils = {
  getNearby: function (room, pos, range, asArray = true) {
    let top = utils.correctInvalidCoord(pos.y - range),
      left = utils.correctInvalidCoord(pos.x - range),
      bottom = utils.correctInvalidCoord(pos.y + range),
      right = utils.correctInvalidCoord(pos.x + range),
      area = room.lookAtArea(top, left, bottom, right, asArray);

    // printMatrix(area, 'getNearby', a => {
    //     let res = a.find(x => x.type === 'terrain');
    //     return res.terrain === 'wall' ? OCCUPIED : FREE;
    // });
    return area;
  },
  findNearby: function (room, pos, range, filter) {
    let adjacenctPoints = utils.getNearby(room, pos, range),
      obj = adjacenctPoints.find(filter);
    return obj;
  },
  isWallTerrain: function (pos) {
    return Game.map.getTerrainAt(pos) === 'wall';
  },
  correctInvalidCoord: function (x) {
    if (x < 2) return 2;
    if (x > 47) return 47;
    return x;
  },
  isCoordValid(x) {
    return utils.correctInvalidCoord(x) === x;
  },
  isPosValid(x, y) {
    return utils.isCoordValid(x) && utils.isCoordValid(y);
  },
  AvoidStructure: AvoidStructure,
  AVOID_LIST: {
    [STRUCTURE_ROAD]: new AvoidStructure(STRUCTURE_ROAD, { range: 0, resolveTo: FREE_BUT_DISQUALIFIED }),
    [STRUCTURE_SPAWN]: new AvoidStructure(STRUCTURE_SPAWN, { range: 1 }),
    [STRUCTURE_CONTROLLER]: new AvoidStructure(STRUCTURE_CONTROLLER, { range: 4 }),
    [STRUCTURE_EXTENSION]: new AvoidStructure(STRUCTURE_EXTENSION, { range: 1, isCheckered: true }),
    [STRUCTURE_CONTAINER]: new AvoidStructure(STRUCTURE_CONTAINER, { range: 2 }),
    [STRUCTURE_STORAGE]: new AvoidStructure(STRUCTURE_STORAGE, { range: 2 }),
    [STRUCTURE_TOWER]: new AvoidStructure(STRUCTURE_TOWER, { range: 7 }),
    [LOOK_SOURCES]: { range: 2, filter: (o) => o.type === LOOK_SOURCES },
  },
  findFreePosNearby: function* (
    target,
    range,
    numOfFreeAdjacentSpaces = 3,
    avoidEachOtherRange = 2,
    avoidList = [],
    avoidIsCheckered = false,
    logging = false
  ) {
    let pos = target.pos || target,
      room = target.room,
      borderedRange = range + 1;

    if (logging) {
      console.log(`findFreePosNearby(${target}, ${pos}, ${range})`);
    }

    avoidList.forEach((x) => (x.type = x.type || AVOID_AREA));

    // start in a corner and work across
    let matrix = utils.getNearby(room, pos, borderedRange, false);

    for (let [j, i] of utils.getCoordsWithinRange(pos, borderedRange)) {
      let initialValue = FREE_ENTRY;
      if (isEdge(i, j, pos, borderedRange) || isCloseToRoomEdge(i, j)) {
        // we want to mark the border as a DISQUALIFIED_ENTRY
        initialValue = DISQUALIFIED_ENTRY;
      }
      matrix[i][j] = matrix[i][j].reduce((res, o) => {
        if (res.type !== AVOID_AREA) {
          if (o.type === LOOK_TERRAIN && o.terrain === 'wall') {
            res = OCCUPIED_ENTRY;
          } else if (o.type === LOOK_STRUCTURES && o.structure.structureType !== STRUCTURE_ROAD) {
            res = OCCUPIED_ENTRY;
          } else if (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType !== STRUCTURE_ROAD) {
            res = OCCUPIED_ENTRY;
          }
        }
        avoidList.forEach((avoidEntry) => {
          // Check for range, bc if two avoids match, take the bigger of the two
          if (avoidEntry.filter(o) && avoidEntry.range > res.range) {
            res = avoidEntry;
          }
        });
        return res;
      }, initialValue);
    }

    if (logging) {
      printMatrix(matrix, 'After processing terrain');
    }

    // now that we've reduced. find the avoided areas, e.g. extensions, and tight spaces
    for (let [j, i] of utils.getCoordsWithinRange(pos, range)) {
      let coord = matrix[i][j];
      if (coord.type === AVOID_AREA) {
        let range = coord.range,
          isCheckered = coord.isCheckered;
        utils.markNearby(matrix, i, j, [FREE_ENTRY], DISQUALIFIED_ENTRY, range, isCheckered);
      } else if (matrix[i][j].type === FREE) {
        // check candidate for tight spaces
        let occupiedList = [OCCUPIED, AVOID_AREA];
        let freeSpaces = utils._countQualifiedSpacesInRange(
          matrix,
          i,
          j,
          1,
          occupiedList,
          numOfFreeAdjacentSpaces,
          'type'
        );
        if (numOfFreeAdjacentSpaces > freeSpaces) {
          matrix[i][j] = DISQUALIFIED_ENTRY;
        }
      }
    }

    if (logging) {
      printMatrix(matrix, 'After marking avoid areas');
    }

    // yield free spaces, starting from the target
    for (let [j, i] of utils.getCoordsWithinRange(pos, range)) {
      if (!matrix[i] || matrix[i][j] === undefined) continue;
      // console.log(`${i}, ${j} ${matrix[i][j].type}`);
      if (matrix[i][j] !== FREE_ENTRY) continue;

      // Swap i and j to be compatible with Screep convention
      let freePos = new RoomPosition(j, i, room.name),
        pathFinder = PathFinder.search(freePos, { pos, range: 1 }),
        path = pathFinder.path,
        distance = path.length;

      // Check path's distance < desired range, e.g. a wall between us, forcing us to go the long way
      if (distance > range) continue;

      yield freePos;

      // Update the matrix with the newly placed "thing"
      utils.markNearby(matrix, i, j, [FREE_ENTRY], DISQUALIFIED_ENTRY, avoidEachOtherRange, avoidIsCheckered);
    }
  },
  *getCoordsWithinRange(origin, range) {
    // yield the origin for completeness, even though most algos ignore it.
    yield [origin.x, origin.y];

    function* getColumnSubsets(originX, ringX, originY, ringY) {
      let jLow = originY - ringY,
        jHi = originY + ringY;
      for (let i = originX - ringX; i <= originX + ringX; i++) {
        if (utils.isPosValid(i, jLow)) {
          yield [i, jLow];
        }
        if (utils.isPosValid(i, jHi)) {
          yield [i, jHi];
        }
      }
    }

    let ring = { x: 0, y: 1 };
    while (ring.y <= range && ring.x <= range) {
      // For each ring, get the row/columns.
      for (let [i, j] of getColumnSubsets(origin.x, ring.x, origin.y, ring.y)) {
        yield [i, j];
      }
      ring.x += 1;
      if (ring.x > range) break;

      // use the same column subset algo, but reverse, i and j.
      for (let [j, i] of getColumnSubsets(origin.y, ring.y, origin.x, ring.x)) {
        yield [i, j];
      }
      ring.y += 1;
    }
  },
  _countQualifiedSpacesInRange(matrix, x, y, range, dequalifiers, maxCount = 0xff, field = undefined) {
    let qualifiedSpaces = 0;
    for (let [i, j] of utils.getCoordsWithinRange({ x, y }, range)) {
      if (i === x && y === j) continue;
      if (!matrix[i] || matrix[i][j] === undefined) {
        qualifiedSpaces++;
      } else {
        let cell = matrix[i][j];
        if (field) cell = cell[field];
        if (!dequalifiers.includes(cell)) {
          qualifiedSpaces++;
        }
        if (qualifiedSpaces >= maxCount) return maxCount;
      }
    }
    return qualifiedSpaces;
  },
  markNearby: function (matrix, x, y, replacementMembers, newValue, range, isCheckered = false) {
    for (let [i, j] of utils.getCoordsWithinRange({ x, y }, range)) {
      if (!matrix[i] || matrix[i][j] === undefined || (x === j && y === i)) continue;
      if (replacementMembers.includes(matrix[i][j])) {
        if (!isCheckered || !utils._isCheckered([i, j], [x, y])) {
          matrix[i][j] = newValue;
        }
      }
    }
  },
  _isCheckered([x, y], [xOrigin, yOrigin]) {
    return (x + xOrigin) % 2 === (y + yOrigin) % 2;
  },
  printMatrix: printMatrix,
  addMemoryProperty(prototype, memoryAttr) {
    if (Object.prototype.hasOwnProperty.call(prototype, memoryAttr)) {
      return;
    }
    Object.defineProperty(prototype, 'memory', {
      get: function () {
        if (_.isUndefined(Memory[memoryAttr])) {
          Memory[memoryAttr] = {};
        }
        if (!_.isObject(Memory[memoryAttr])) {
          return undefined;
        }
        return (Memory.spawns[this.id] = Memory[memoryAttr][this.id] || {});
      },
      set: function (value) {
        if (_.isUndefined(Memory[memoryAttr])) {
          Memory[memoryAttr] = {};
        }
        if (!_.isObject(Memory[memoryAttr])) {
          throw new Error(`Could not set ${memoryAttr} memory`);
        }
        Memory[memoryAttr][this.id] = value;
      },
      configurable: true,
    });
  },
  gc: function () {
    for (let name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
      }
    }
    for (let name in Memory.flags) {
      if (!Game.flags[name]) {
        delete Memory.flags[name];
        continue;
      }
      let flag = Game.flags[name];
      if (flag.color === COLOR_BLUE) {
        let phase;
        if (flag.room.memory[flag.pos.roomName]) {
          phase = flag.room.memory[flag.pos.roomName].phase;
        }
        if (flag.secondaryColor === COLOR_BLUE) {
          if (!phase) {
            continue;
          }
          // if phase === 1||2, send aide. if phase > 3, delete flag.
          if (phase < 3) {
            flag.setColor(COLOR_BLUE, COLOR_CYAN);
          }
          // flag.remove();
        } else if (flag.secondaryColor === COLOR_CYAN) {
          if (phase >= 3) {
            flag.remove();
          }
        }
      }
    }
  },
};

module.exports = utils;
