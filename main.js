const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Spawner = require('spawner')
const Phases = require('phases')

module.exports.loop = function () {

    let phaseNumber = Phases.getCurrentPhaseNumber(Game.spawns['Spawn1'].room);
    console.log(`Game Loop ${Game.time}. Room Phase: ${phaseNumber}`)
    if(Game.time % 25 === 0) utils.gc();

    Spawner.run(Game.spawns['Spawn1']);

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (roleBuilder.is(creep)) {
            roleBuilder.run(creep)
        }

        if (roleHarvester.is(creep) || !creep.busy) {
            roleHarvester.run(creep);
        }

        if (roleUpgrader.is(creep) || !creep.busy) {
            roleUpgrader.run(creep);
        }
    }
}