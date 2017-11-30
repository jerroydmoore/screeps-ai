const Errors = require('errors');
const utils = require('utils');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleScout = require('role.scout');
const rolePilgrim = require('role.pilgrim');
const Spawner = require('struct-spawner')
const Phases = require('phases')
const Roads = require('roads');
const Towers = require('struct-towers');
const Extensions = require('struct-extensions');

module.exports.loop = function () {
    let phaseNumber = Phases.getCurrentPhaseNumber(Game.spawns['Spawn1']);
    //console.log(`Game Loop ${Game.time}. Room Phase: ${phaseNumber}`)

    let logger = console.log;
    console.log = (event) => logger(`#${Game.time}[${phaseNumber}] ${event}`);

    for(let roomName in Game.rooms) {

        let room = Game.rooms[roomName],
            hasSpawner = false,
            structures = room.find(FIND_MY_STRUCTURES, {filter: (s) => {
                return s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_TOWER
            } });
        
        // let sites = room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (s) => {
        //     return s.structureType === STRUCTURE_ROAD;
        // } });
        // sites.forEach((x) => x.remove());
        
        for(let name in structures) {
            let s = structures[name];
            if(s.structureType === STRUCTURE_SPAWN) {
                hasSpawner = true;
                Spawner.run(s);
            } else if (s.structureType === STRUCTURE_TOWER) {
                Towers.run(s);
            }
        }

        if (!hasSpawner && room.controller.my) {
            let sites = Spawner.getMySites(room)
            if(sites.length === 0) {
                console.log("building spawner in " + room)
                Spawner.buildInRoom(room)
            } else {
                console.log(sites[0].pos);
            }
        }
    }

    if (! Memory.gcl) Memory.gcl = Game.gcl.level;

    let x = 0
    for(let name in Game.creeps) {
        let creep = Game.creeps[name];

        if (!creep.memory.origin) {
            creep.memory.origin = creep.room.controller.id;
        }

        if( creep.spawning) continue;

        if ( creep.ticksToLive === 1) {
            creep.say('☠️ dying')
            console.log(`${creep} died naturally.`)
        }

        if (creep.memory.claimed === 1) {
            console.log("building spawner in " + room)
            if (Spawner.buildInRoom(room)) {
                creep.memory.claimed = 2;
            }
        }

        if (roleScout.is(creep)) {
            roleScout.run(creep);
            continue;
        }
        if(rolePilgrim.is(creep)) {
            rolePilgrim.run(creep);
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