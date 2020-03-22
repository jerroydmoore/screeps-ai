const StructBase = require('./struct-base');
const utils = require('./utils');
const AVOID_LIST = utils.AVOID_LIST;
const roleMiner = require('./role.miner');
const roleHarvester = require('./role.harvester');
const roleUpgrader = require('./role.upgrader');
const roleBuilder = require('./role.builder');
const roleRemoteBuilder = require('./role.remote-builder');
const roleSettler = require('./role.settler');
const Phases = require('./phases');
const Roads = require('./roads');
const Cache = require('./cache');

Cache.addEnergyProperties(StructureSpawn.prototype);

class StructSpawners extends StructBase {
  constructor() {
    let modifiedSource = Object.assign({}, AVOID_LIST[LOOK_SOURCES], { range: 3 });

    super(STRUCTURE_SPAWN, {
      minFreeAdjSpaces: 3,
      minPlacementDistance: 3,
      avoidList: [
        AVOID_LIST[STRUCTURE_ROAD],
        AVOID_LIST[STRUCTURE_SPAWN],
        AVOID_LIST[STRUCTURE_CONTROLLER],
        AVOID_LIST[STRUCTURE_EXTENSION],
        AVOID_LIST[STRUCTURE_CONTAINER],
        AVOID_LIST[STRUCTURE_STORAGE],
        modifiedSource,
      ],
    });
  }
  *getBuildingPointsOfInterests(room) {
    // 3 spawners allowed near a room
    //   1) build near a Source away from Controller
    //   2) Build near a Storage
    //   3) Build near a Storage again
    // what if there is only one source? then build at that.

    let sources = room.find(FIND_SOURCES);
    if (sources.length === 0) {
      console.log('there are not any sources in ' + room);
    } else if (sources.length === 1) {
      yield sources[0];
    } else {
      let paths = sources.map((s) => {
        let res = PathFinder.search(room.controller.pos, s, { range: 1, pos: s.pos }, { maxRooms: 1 });
        return { length: res.length, res, source: s };
      });
      paths.sort((a, b) => b.length - a.length);
      for (let i = 0; i < paths.length; i++) {
        yield paths[i].source;
      }
    }
    let storage = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_STORAGE } });
    if (storage) {
      yield storage[0];
      yield storage[0];
    }
  }

  run(spawner) {
    Phases.determineCurrentPhaseNumber(spawner.room);

    let phase = Phases.getCurrentPhaseInfo(spawner.room);

    if (!spawner.memory.setup) {
      console.log(`${spawner} coming online in ${spawner.room}`);
      spawner.memory.setup = 1; // only setup once
      spawner.memory.level = spawner.room.controller.level;

      // create a creep immediately
      roleHarvester.spawn(spawner);
    }
    if (spawner.memory.level !== spawner.room.controller.level) {
      // We can build things!
      spawner.memory.level = spawner.room.controller.level;

      if (spawner.memory.setup < 2) {
        // Create network of roads to common places
        console.log('Create Network of Roads');
        let sources = spawner.room.find(FIND_SOURCES);
        Roads.connect(spawner, sources);
        Roads.connect(spawner.room.controller, sources);
        spawner.memory.setup = 2;
      }
    }

    // Do not have all spawners run on the same tick.
    if (Game.time % phase.SpawnPeriod == spawner.name[spawner.name.length - 1]) {
      if (spawner.spawning) return;

      if (roleHarvester.shouldSpawn(spawner)) {
        roleHarvester.spawn(spawner);
      } else if (roleMiner.shouldSpawn(spawner)) {
        roleMiner.spawn(spawner);
      } else if (roleBuilder.shouldSpawn(spawner)) {
        roleBuilder.spawn(spawner);
      } else if (roleUpgrader.shouldSpawn(spawner)) {
        roleUpgrader.spawn(spawner);
      } else if (roleRemoteBuilder.shouldSpawn(spawner)) {
        roleRemoteBuilder.spawn(spawner);
      } else if (roleSettler.shouldSpawn(spawner)) {
        roleSettler.spawn(spawner);
      }
    }

    if (spawner.spawning) {
      let spawningCreep = Game.creeps[spawner.spawning.name];
      spawner.room.visual.text('🛠️' + spawningCreep.name, spawner.pos.x + 1, spawner.pos.y, {
        align: 'left',
        opacity: 0.8,
      });
    }
  }
}

module.exports = new StructSpawners();
