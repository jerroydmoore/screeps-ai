const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Spawner = require('spawner')
const Phases = require('phases')
const Roads = require('roads');

module.exports.loop = function () {

    let phaseNumber = Phases.getCurrentPhaseNumber(Game.spawns['Spawn1']);
    //console.log(`Game Loop ${Game.time}. Room Phase: ${phaseNumber}`)

    let logger = console.log;
    console.log = (event) => logger(`#${Game.time}[${phaseNumber}] ${event}`);

    Spawner.run(Game.spawns['Spawn1']);

    let x = 0
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        if (!creep.memory.origin) {
            creep.memory.origin = creep.room.controller.id;
        }

        if (roleBuilder.is(creep)) {
            roleBuilder.run(creep)
            if (!creep.busy) roleHarvester.run(creep);
        }

        if (roleHarvester.is(creep)) {
            roleHarvester.run(creep);
        }

        if (!creep.busy) { // Upgrader, also the catch-all
            roleUpgrader.run(creep);
        }
    }
    Roads.gc();
}