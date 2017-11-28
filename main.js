const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleScout = require('role.scout');
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

    for(let roomName in Game.rooms) {
        let room = Game.rooms[roomName],
            structures = room.find(FIND_MY_STRUCTURES, {filter: (s) => {
                return s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_TOWER
            } });
        
        for(let name in structures) {
            let s = structures[name];
            if(s.structureType === STRUCTURE_SPAWN) {
                Spawner.run(s);
            } else if (s.structureType === STRUCTURE_TOWER) {
                Towers.run(s);
            }
        }
    }

    
    // Spawner.run(Game.spawns['Spawn1']);
    if (! Memory.gcl) Memory.gcl = Game.gcl;
    // let tower = Game.getObjectById('ed2129c137d0c81');
    // Towers.run(tower);

    let x = 0
    for(let name in Game.creeps) {
        let creep = Game.creeps[name];

        if ( creep.ticksToLive === 1) {
            creep.say('☠️ dying')
            console.log(`${creep} died naturally.`)
        }
        if (!creep.memory.origin) {
            creep.memory.origin = creep.room.controller.id;
        }

        if( creep.spawning) continue;

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
                    //console.log(`Renewing ${creep} renew cost ${renewCost} rebuild cost ${cost} capacity ${capacity} ratio ${ratio}`)
                } else {
                    creep.memory.renew = -1;
                    console.log('cannot renew ${creep} in room ${creep.room}: no spawner found')
                }
            }
        }
        if (creep.memory.renew && creep.memory.renew !== -1) {
            let spawn = Game.getObjectById(creep.memory.renew)
            let code = spawn.renewCreep(creep);
            if (code === OK) {
                creep.busy = 1;
            } else if (code === ERR_NOT_IN_RANGE || code === ERR_BUSY) {
                CreepsUtil.moveTo(creep, spawn, '#FFFFFF');
            } else if (code === ERR_FULL || code === ERR_NOT_ENOUGH_ENERGY) {
                delete creep.memory.renew
            } else {
                Errors.check(spawn, `renewCreep(${creep})`, code);
                creep.memory.renew = -1;
            }
        }

        if (roleScout.is(creep)) {
            roleScout.run(creep);
            continue;
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