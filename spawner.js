const Errors = require('errors');

const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Phases = require('phases');

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

function spawnCreep(spawner, label, bodyParts) {
    let cost = bodyPartCost(bodyParts);

    if (cost < spawner.energy) {
        let newName = label + Game.time;
            action = 'spawnCreep';
        console.log(`Spawning new ${label}: ${newName}`);

        let code = spawner[action](bodyParts, newName);
        Errors.check(spawner, action, code);
    } else {
        console.log(`Tried to spawn ${label} but cost ${cost} > ${spawner.energy} energy available`)
    }
}

module.exports = {
    run: function(spawner) {

        let phase = Phases.getCurrentPhaseInfo(spawner.room);

        if (Game.time % 100 === 0) {
            let harvesters = _.filter(Game.creeps, (creep) => roleHarvester.is(creep)),
                builders =  _.filter(Game.creeps, (creep) => roleBuilder.is(creep)),
                upgraders =  _.filter(Game.creeps, (creep) => roleUpgrader.is(creep));
            
            if (harvesters.length < phase.Harvester.count) {
                spawnCreep(spawner, roleHarvester.roleName, phase.Harvester.parts)
            } else if (upgraders.length < phase.Upgrader.count) {
                spawnCreep(spawner, roleUpgrader.roleName, phase.Upgrader.parts)
            } else if (builders.length < phase.Builder.count) {
                spawnCreep(spawner, roleBuilder.roleName, phase.Builder.parts)
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