const StructBase = require('struct-base');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;
const roleMiner = require('role.miner');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
// const roleScout = require('role.scout');
const roleSettler = require('role.settler');
const Phases = require('phases');
const Roads = require('roads');


class StructSpawners extends StructBase {
    constructor() {
        let modifiedSource = Object.assign({}, AVOID_LIST[LOOK_SOURCES], {range: 3});
        
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
            ]
        });
    }
    * getBuildingPointsOfInterests (room) {
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
                let res = PathFinder.search(room.controller.pos, s, { range: 1, pos: s.pos, }, { maxRooms: 1 });
                return {length: res.length, res, source: s };
            });
            paths.sort((a, b) => b.length - a.length);
            for(let i=0;i<paths.length;i++) {
                yield paths[i].source;
            }
        }
        let storage = room.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_STORAGE }});
        if( storage) {
            yield storage[0];
            yield storage[0];
        }
    }

    run (spawner) {
        Phases.determineCurrentPhaseNumber(spawner);

        let phase = Phases.getCurrentPhaseInfo(spawner);

        if (!spawner.memory.setup) {
            console.log(`${spawner} coming online in ${spawner.room}`);
            spawner.memory.setup = 1; // only setup once
            spawner.memory.level = spawner.room.controller.level;
            
            // create a creep immediately
            roleHarvester.spawn(spawner);
        } 
        if(spawner.memory.level !== spawner.room.controller.level) {
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

        if (Game.time % phase.SpawnPeriod === 0 && spawner.room.energyAvailable >= phase.minimumEnergyToSpawn) {

            // CreepsUtil.spawn(spawner, roleScout.roleName, phase.Scout.parts);

            if (roleMiner.shouldSpawn(spawner)) {
                spawner.memory.skippedSpawnCount = 0;
                roleMiner.spawn(spawner);
            } else if (roleHarvester.shouldSpawn(spawner)) {
                spawner.memory.skippedSpawnCount = 0;
                roleHarvester.spawn(spawner);
            } else if (roleBuilder.shouldSpawn(spawner)) {
                spawner.memory.skippedSpawnCount = 0;
                roleBuilder.spawn(spawner);
            } else if (roleUpgrader.shouldSpawn(spawner)) {
                spawner.memory.skippedSpawnCount = 0;
                roleUpgrader.spawn(spawner);
            } else {
                // determine if gcl.level > 1, then spawn one.
                if (Game.gcl.level !== Memory.gcl && spawner.room.energyAvailable >= 900) {

                    spawner.memory.skippedSpawnCount = 0;
                    let code = roleSettler.spawn(spawner);
                    if (code === OK) {
                        Memory.gcl = Game.gcl.level;
                    }
                }
            }
            // } else {
            //     if (phase.SpawnScoutAfterSkippedPeriods > 0) {
            //         // spawner.memory.skippedSpawnCount = 9
            //         if (! spawner.memory.skippedSpawnCount) {
            //             spawner.memory.skippedSpawnCount = 0;
            //         }
            //         if ( ++spawner.memory.skippedSpawnCount % phase.SpawnScoutAfterSkippedPeriods === 0) {
            // CreepsUtil.spawn(spawner, roleScout.roleName, phase.Scout.parts);
            //             spawner.memory.skippedSpawnCount = 0;
            //         }
            //     }
            //     console.log(spawner + ' chance to spawn a scout. ' + `${spawner.memory.skippedSpawnCount}/${phase.SpawnScoutAfterSkippedPeriods}`)
            // }
        }
    
        if(spawner.spawning) {
            let spawningCreep = Game.creeps[spawner.spawning.name];
            spawner.room.visual.text(
                '🛠️' + spawningCreep.name,
                spawner.pos.x + 1,
                spawner.pos.y,
                {align: 'left', opacity: 0.8});
        }
    }
}

module.exports = new StructSpawners();
