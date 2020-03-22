const utils = require('./utils');
const BuildOrders = require('./build-orders');
const RoomLayout = require('./room-layout');

const protectionList = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TOWER];
const protectionFilter = (s) => protectionList.includes(s.structureType);

const costLookup = {
  [STRUCTURE_WALL]: 5,
  [STRUCTURE_RAMPART]: 2,
};
class RoomDefense {
  buildInRoom(room) {
    if (room.memory.phase < 3) {
      // Check if room is ready for defense
      return;
    }

    this.barricadeRoomController(room);
    let res = room.find(FIND_MY_STRUCTURES, { filter: protectionFilter });
    res.forEach((s) => {
      this.buildPerimeter(s.pos);
    });

    res = room.find(FIND_CONSTRUCTION_SITES, { filter: protectionFilter });
    res.forEach((s) => {
      this.buildPerimeter(s.pos);
    });

    res = BuildOrders.getAllScheduled(room).filter(protectionFilter);
    res.forEach((s) => {
      this.buildPerimeter(s.pos);
    });

    this.fortifyExits(room);
  }
  buildPerimeter(pos, withStructure) {
    // Other classes can tell RoomDefense to defend a structure

    withStructure = withStructure || STRUCTURE_RAMPART;
    // console.log(`${pos} Fortifying with ${withStructure}`);
    pos = pos.pos || pos; // Accept either a RoomPosition or a Structure;

    let room = Game.rooms[pos.roomName],
      range = 1;

    if (!room) {
      console.log('Defense: cannot build rampart perimeter because room name not found for ' + pos);
    }
    let matrix = utils.getNearby(room, pos, range, false);
    // console.log(JSON.stringify(matrix));
    // utils.printMatrix(matrix, `${pos} Build Rampart Perimeter`, a => {
    //     let res = a.find(x => x.type === 'terrain');
    //     return res.terrain === 'wall' ? 1 : 0;
    // });

    let walls = [STRUCTURE_WALL, STRUCTURE_RAMPART];
    for (let [j, i] of utils.getCoordsWithinRange(pos, range)) {
      let res = matrix[i][j].find((o) => {
        if (o.type === LOOK_TERRAIN && o.terrain === 'wall') {
          return true;
          // we want to fortify structures with ramparts. Essentially adds health.
        } else if (o.type === LOOK_STRUCTURES && walls.includes(o.structure.structureType)) {
          return true;
        } else if (o.type === LOOK_CONSTRUCTION_SITES && walls.includes(o.constructionSite.structureType)) {
          return true;
        }
        let order = BuildOrders.getScheduledAt(room, pos);
        return order && order.type !== STRUCTURE_ROAD;
      });
      let targetPos = new RoomPosition(j, i, room.name);
      if (!res) {
        console.log(`${targetPos} Building Rampart`);
        // no wall nor blocking structures in the way nor planned build orders
        BuildOrders.schedule(room, withStructure, targetPos);
        // } else {
        //     console.log(`${targetPos} Not Building ${withStructure}: something in the way`);
      }
    }
  }
  barricadeRoomController(room) {
    this.buildPerimeter(room.controller, STRUCTURE_WALL);
  }
  // eslint-disable-next-line no-unused-vars
  fortifyExits(room) {
    // let layout = this.getExitDefenseLayout(room);
  }
  getExitDefenseLayout(room) {
    if (!RoomLayout.hasLayout(room)) {
      // Detect where exits are and build a wall.

      let map = new PathFinder.CostMatrix();
      let wallPos = [];

      let spawns = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_SPAWN } });
      // TODO This works for the WEST side. Need to scale to the other sides.
      let res = room.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 0, true).filter((res) => res.terrain !== 'wall');
      let lastExit = undefined;
      let addWall = (coords) => {
        if (!(coords instanceof Array)) {
          coords = [coords];
        }
        coords.forEach((c) => {
          let pos = new RoomPosition(c.x, c.y, room.name);
          pos.type = STRUCTURE_WALL;
          wallPos.push(pos);
          map.set(c.x, c.y, costLookup[c.type]);
        });
      };

      // New Exit beginning, wall off edge.
      let beginning = res[0].y;
      addWall(this.generateEdge({ type: STRUCTURE_WALL, x: 2, y: beginning }, Y, Y_NORTH, X_WEST, true));

      res.forEach((coord) => {
        let proposed = { type: STRUCTURE_WALL, x: 2, y: coord.y };
        if (lastExit && lastExit.y + 1 !== proposed.y) {
          // Last Exit ending, wall off the edges
          addWall(this.generateEdge(lastExit, Y, Y_SOUTH, X_WEST));
          let ending = lastExit.y,
            middle = beginning + (ending - beginning) / 2,
            exitPosition = new RoomPosition(0, middle, room.name);

          // find out where the place the ramparts.
          this.markRamparts(map, wallPos, exitPosition, spawns, room.name);

          // New Exit beginning, wall off edge.
          addWall(this.generateEdge(proposed, Y, Y_NORTH, X_WEST, true));
          let beginning = proposed.y;
        }
        addWall(proposed);
        lastExit = proposed;
      });

      // Last Exit ending, wall off the edges
      addWall(this.generateEdge(lastExit, Y, Y_SOUTH, X_WEST));
      let ending = lastExit.y,
        middle = beginning + (ending - beginning) / 2,
        exitPosition = new RoomPosition(0, middle, room.name);

      // find out where the place the ramparts.
      this.markRamparts(map, wallPos, exitPosition, spawns, room.name);

      // console.log(JSON.stringify(wallPos.map(p => [p.x,p.y])));

      wallPos.forEach((pos) => {
        RoomLayout.planStructure(room, pos.type, pos);
        let alreadyBuilt = room.lookAt(pos).find((x) => {
          let s = x.type === LOOK_STRUCTURES && x.structure.structureType === pos.type,
            c = x.type === LOOK_CONSTRUCTION_SITES && x.constructionSite.structureType === pos.type;
          return s || c;
        });
        if (!alreadyBuilt) {
          BuildOrders.schedule(room, pos.type, pos);
        } else {
          console.log(`${pos} already built ${pos.type}`);
        }
      });
    }
    return RoomLayout.getLayout(room);
  }
  markRamparts(mapMatrix, wallPos, exitPosition, spawns, roomName) {
    function setRampart(idx) {
      if (idx < 0 || idx >= wallPos.length) return;
      let pos = wallPos[idx];
      // console.log('setting rampart ' + `${pos.x},${pos.y}`);
      pos.type = STRUCTURE_RAMPART;
      mapMatrix.set(pos.x, pos.y, costLookup[pos.type]);
    }
    // find out where the place the ramparts.
    spawns.forEach((s) => {
      let res = PathFinder.search(
        exitPosition,
        { pos: s.pos, range: 1 },
        {
          roomCallback: function (_roomName) {
            if (roomName !== _roomName) return false;
            return mapMatrix;
          },
        }
      );
      res.path
        .filter((c) => c.x < 3 || c.x > 46 || c.y < 3 || c.y > 46)
        .forEach((coord) => {
          for (let i = 0; i < wallPos.length; i++) {
            let pos = wallPos[i];
            if (coord.x === pos.x && coord.y === pos.y) {
              setRampart(i - 1);
              setRampart(i);
              setRampart(i + 1);
            }
          }
        });
    });
  }

  generateEdge(edge, wallField, wallDirection, orthogonalDirection, reverse = false) {
    // console.log(`${JSON.stringify(edge)} ${wallField} ${wallDirection} ${orthogonalDirection}`);
    let res = [];
    edge = Object.assign({}, edge);
    edge[wallField] += wallDirection;
    res.push(edge);

    edge = Object.assign({}, edge);
    edge[wallField] += wallDirection;
    res.push(edge);

    edge = Object.assign({}, edge);
    let orthogonalField = wallField === 'y' ? 'x' : 'y';
    edge[orthogonalField] += orthogonalDirection;
    res.push(edge);

    if (reverse) res.reverse();
    return res;
  }
}

const Y_SOUTH = 1;
const Y_NORTH = -1;
const X_WEST = -1;
/* eslint-disable no-unused-vars */
// getExitDefenseLayout is still WIP
const X_EAST = 1;
const Y = 'y',
  X = 'x';
/* eslint-enable no-unused-vars */

module.exports = new RoomDefense();
