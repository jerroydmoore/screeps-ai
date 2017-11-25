const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Phases = require('phases');
const Roads = require('roads');
const StructExtensions = require('struct-extensions');

const BODYPART_COST = {
    [MOVE]: 50,
    [WORK]: 100,
    [ATTACK]: 80,
    [CARRY]: 50,
    [HEAL]: 250,
    [RANGED_ATTACK]: 150,
    [TOUGH]: 10,
    [CLAIM]: 600
};

function bodyPartCost(bodyParts) {
    return bodyParts.reduce((acc, part) => {
        return acc + BODYPART_COST[part];
    }, 0);
}

function spawnCreep(spawner, label, availableBodyParts) {
    let bodyParts = [],
        action = 'spawnCreep',
        cost = 0;
    for(let i=0;i<availableBodyParts.length;i++) {
        bodyParts.push(availableBodyParts[i]);
        cost = bodyPartCost(bodyParts);
        if(cost > spawner.room.energyAvailable) {
            // we found our limit, remove the excess body part and spawn.
            cost -= BODYPART_COST[bodyParts.pop()];
            break;
        }
    }
    
    label += Game.time;
    console.log(`Spawning ${label} ` + JSON.stringify(bodyParts) + ` cost ${cost}/${spawner.room.energyAvailable}`);
    let code = spawner[action](bodyParts, label);
    if (!Errors.check(spawner, action, code)) {
        utils.gc(); // garbage collect the recently deseased creep
        return label;
    }
}

module.exports = {
    run: function(spawner) {

        let phase = Phases.getCurrentPhaseInfo(spawner.room);

        if (!spawner.memory.setup) {
            console.log(`${spawner} coming online in ${spawner.room}`);
            spawner.memory.setup = 1; // only setup once
            spawner.memory.level = spawner.room.controller.level;
            
            // create a creep immediately
            spawnCreep(spawner, roleHarvester.roleName, phase.Harvester.parts)
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
        }

        if (Game.time % phase.SpawnPeriod === 0 && spawner.room.energyAvailable >= phase.minimumEnergyToSpawn) {
            let harvesters = _.filter(Game.creeps, (creep) => roleHarvester.is(creep)),
                builders =  _.filter(Game.creeps, (creep) => roleBuilder.is(creep)),
                upgraders =  _.filter(Game.creeps, (creep) => roleUpgrader.is(creep));
            
            if (harvesters.length < phase.Harvester.count) {
                spawnCreep(spawner, roleHarvester.roleName, phase.Harvester.parts)
            } else if (builders.length < phase.Builder.count) {
                spawnCreep(spawner, roleBuilder.roleName, phase.Builder.parts)
            } else if (upgraders.length < phase.Upgrader.count) {
                spawnCreep(spawner, roleUpgrader.roleName, phase.Upgrader.parts)
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