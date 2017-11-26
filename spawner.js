const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Phases = require('phases');
const Roads = require('roads');
const StructExtensions = require('struct-extensions');
const StructTowers = require('struct-towers');
const CreepsUtil = require('creeps');


module.exports = {
    run: function(spawner) {
        Phases.determineCurrentPhaseNumber(spawner);

        let phase = Phases.getCurrentPhaseInfo(spawner);

        if (!spawner.memory.setup) {
            console.log(`${spawner} coming online in ${spawner.room}`);
            spawner.memory.setup = 1; // only setup once
            spawner.memory.level = spawner.room.controller.level;
            
            // create a creep immediately
            CreepsUtil.spawn(spawner, roleHarvester.roleName, phase.Harvester.parts)
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
            }
            StructExtensions.buildInRoom(spawner.room);
            StructTowers.buildInRoom(spawner.room);
        }

        if (Game.time % phase.SpawnPeriod === 0 && spawner.room.energyAvailable >= phase.minimumEnergyToSpawn) {
            let harvesters = _.filter(Game.creeps, (creep) => roleHarvester.is(creep)),
                builders =  _.filter(Game.creeps, (creep) => roleBuilder.is(creep)),
                upgraders =  _.filter(Game.creeps, (creep) => roleUpgrader.is(creep));
            
            if (harvesters.length < phase.Harvester.count) {
                CreepsUtil.spawn(spawner, roleHarvester.roleName, phase.Harvester.parts)
            } else if (builders.length < phase.Builder.count) {
                CreepsUtil.spawn(spawner, roleBuilder.roleName, phase.Builder.parts)
            } else if (upgraders.length < phase.Upgrader.count) {
                CreepsUtil.spawn(spawner, roleUpgrader.roleName, phase.Upgrader.parts)
            }
        }
    
        if(spawner.spawning) {
            var spawningCreep = Game.creeps[Game.spawns['Spawn1'].spawning.name];
            spawner.room.visual.text(
                '🛠️' + spawningCreep.name,
                spawner.pos.x + 1,
                spawner.pos.y,
                {align: 'left', opacity: 0.8});
        }
    }
}