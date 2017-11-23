const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Spawner = require('spawner')

module.exports.loop = function () {

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