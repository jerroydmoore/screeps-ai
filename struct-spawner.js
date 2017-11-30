const StructBase = require('struct-base');
const Errors = require('errors');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleScout = require('role.scout');
const rolePilgrim = require('role.pilgrim');
const Phases = require('phases');
const Roads = require('roads');
const StructExtensions = require('struct-extensions');
const StructTowers = require('struct-towers');


class StructSpawners extends StructBase {
    constructor() {
        super(STRUCTURE_SPAWN);
        this.minFreeAdjSpaces = 3;
        this.minPlacementDistance = 3;
        let modifiedSource = Object.assign({}, AVOID_LIST[LOOK_SOURCES], {range: 5});
        this.avoidList = [ modifiedSource, AVOID_LIST[STRUCTURE_TOWER] ];
    }
    * getBuildingPointsOfInterests (room) {
        // criteria:
        //   1) build near a Source 
        //   2) don't build at the Sources closest to the controller
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
            })
            paths.sort((a, b) => b.length - a.length);
            for(let i=0;i<paths.length;i++) {
                yield paths[i].source;
            }
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
            CreepsBase.spawn(spawner, roleHarvester.roleName, phase.Harvester.parts)
        } 
        if(spawner.memory.level !== spawner.room.controller.level) {
            // We can build things!
            spawner.memory.level = spawner.room.controller.level;

            if (spawner.memory.setup < 2) {
                // Create network of roads to common places
                console.log('Create Network of Roads');
                let sources = spawner.room.find(FIND_SOURCES)
                Roads.connect(spawner, sources);
                Roads.connect(spawner.room.controller, sources);
                spawner.memory.setup = 2;
            }
            StructExtensions.buildInRoom(spawner.room);
            StructTowers.buildInRoom(spawner.room);
        }

        if (Game.time % phase.SpawnPeriod === 0 && spawner.room.energyAvailable >= phase.minimumEnergyToSpawn) {
            let harvesters = _.filter(Game.creeps, (creep) => roleHarvester.is(creep)),
                builders =  _.filter(Game.creeps, (creep) => roleBuilder.is(creep)),
                upgraders =  _.filter(Game.creeps, (creep) => roleUpgrader.is(creep));
            
            
            // CreepsUtil.spawn(spawner, roleScout.roleName, phase.Scout.parts);


            if (harvesters.length < phase.Harvester.count) {
                spawner.memory.skippedSpawnCount = 0;
                roleHarvester.spawn(spawner)
            } else if (builders.length < phase.Builder.count) {
                spawner.memory.skippedSpawnCount = 0;
                roleBuilder.spawn(spawner)
            } else if (upgraders.length < phase.Upgrader.count) {
                spawner.memory.skippedSpawnCount = 0;
                roleUpgrader.spawn(spawner)
            } else {
                // determine if gcl.level > 1, then spawn one.
                if (Game.gcl.level !== Memory.gcl && spawner.room.energyAvailable >= 900) {

                    spawner.memory.skippedSpawnCount = 0;
                    let code = rolePilgrim.spawn(spawner)
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
