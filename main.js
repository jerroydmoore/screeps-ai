const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const Spawner = require('spawner')
const Phases = require('phases')
const Roads = require('roads');
const Towers = require('struct-towers');
const Extensions = require('struct-extensions');
const CreepsUtil = require('creeps');

module.exports.loop = function () {
    let phaseNumber = Phases.getCurrentPhaseNumber(Game.spawns['Spawn1']);
    //console.log(`Game Loop ${Game.time}. Room Phase: ${phaseNumber}`)

    let logger = console.log;
    console.log = (event) => logger(`#${Game.time}[${phaseNumber}] ${event}`);

    Spawner.run(Game.spawns['Spawn1']);
    let tower = Game.getObjectById('ed2129c137d0c81');
    Towers.run(tower);

    let x = 0
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        if (!creep.memory.origin) {
            creep.memory.origin = creep.room.controller.id;
        }

        // Check if we need to recharge.
        if (!creep.memory.renew && creep.ticksToLive < 200 && creep.room.energyAvailable >= 600) {
            let capacity = creep.room.energyCapacityAvailable,
                energy = creep.room.energyAvailable,
                parts = creep.body.map(x => x.type)
                cost = CreepsUtil.bodyPartCost(parts),
                renewCost = CreepsUtil.bodyPartRenewCost(parts)
            
            if (capacity > 700) capacity = 700; // cap it
            let ratio = cost / capacity;
            if (ratio > 0.8) {
                // we want to keep this!
                let spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_SPAWN })
                if (spawn) {
                    creep.memory.renew = spawn.id;
                    creep.say('⛑ Healing');
                    console.log(`Renewing ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${ratio}`)
                } else {
                    creep.memory.renew = -1;
                    console.log('no spawner found')
                }
            }
        }
        if (creep.memory.renew && creep.memory.renew !== -1) {
            let spawn = Game.getObjectById(creep.memory.renew)
            let code = spawn.renewCreep(creep);
            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NOT_IN_RANGE) {
                CreepsUtil.moveTo(creep, spawn, '#FFFFFF');
            } else if (code === ERR_FULL || code === ERR_NOT_ENOUGH_ENERGY) {
                delete creep.memory.renew
            } else {
                Errors.check(spawn, `renewCreep(${creep})`, code);
                creep.memory.renew = -1;
            }
        }

        if (!creep.busy && roleBuilder.is(creep)) {
            roleBuilder.run(creep)
            if (!creep.busy) roleHarvester.run(creep);
        }

        if (!creep.busy && roleHarvester.is(creep)) {
            roleHarvester.run(creep);
        }

        if (!creep.busy) { // Upgrader, also the catch-all
            roleUpgrader.run(creep);
        }
    }
    Roads.gc();
    roleHarvester.gc();
    roleBuilder.gc();
    Towers.gc();
    Extensions.gc();
}