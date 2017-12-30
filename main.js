
require('extends_roompositions');
require('extends_rooms');
require('extends_structure');
require('extends_construction-site');

const roleMiner = require('role.miner');
const roleHarvester = require('role.harvester');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleScout = require('role.scout');
const roleSettler = require('role.settler');
const Spawner = require('struct-spawner');
const Phases = require('phases');
const Roads = require('roads');
const Towers = require('struct-towers');
const StructExtensions = require('struct-extensions');
const StructTowers = require('struct-towers');
const StructContainers = require('struct-containers');
const StructStorage = require('struct-storage');
const Extensions = require('struct-extensions');
const RoomUtils = require('rooms');
const BuildOrders = require('build-orders');
const RoomDefense = require('room-defense');
const utils = require('utils');
const initGame = require('game-init');
const Cache = require('cache');

Cache.addEnergyProperties(Resource.prototype);
Cache.addEnergyProperties(Source.prototype);

module.exports.loop = function () {

    let phaseNumber = Phases.getCurrentPhaseNumber(Game.spawns['Spawn1'].room);
    //console.log(`Game Loop ${Game.time}. Room Phase: ${phaseNumber}`)

    initGame(phaseNumber);
    Cache.gc(); // GC Cache at the beginning of execution, since tick+1 must occur to evict stale caches

    // console.log(JSON.stringify(Game.cpu));
    
    if(Game.cpu.tickLimit < 50) {
        console.log('Game cpu dangerously low ' + JSON.stringify(Game.cpu));
        return;
    }

    let hasTowers = {};
    for(let roomName in Game.rooms) {

        let room = Game.rooms[roomName],
            hasSpawner = false,
            structures = room.find(FIND_MY_STRUCTURES, {filter: (s) => {
                return s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_TOWER;
            } });

        hasTowers[roomName] = false;
        if (! Memory.rooms[roomName]) {
            Memory.rooms[roomName] = RoomUtils.getInitialData(roomName);
        }
        
        // let sites = room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (s) => {
        //     return s.structureType === STRUCTURE_ROAD;
        // } });
        // sites.forEach((x) => x.remove());
        
        for(let name in structures) {
            let s = structures[name];
            if(s.structureType === STRUCTURE_SPAWN) {
                hasSpawner = true;
                // console.log('Phase ' + s.memory.phase);
                Spawner.run(s);
            } else if (s.structureType === STRUCTURE_TOWER) {
                Towers.run(s);
                hasTowers[roomName] = true;
            }
        }

        if (Game.time % 10 === 3) {
            // console.log('Attempting to build');
            // console.log('build orders: ' + Memory.con[room.name].length + ' ' + JSON.stringify(Memory.con[room.name].map(x => x.type)));

            RoomDefense.buildInRoom(room);
            StructExtensions.buildInRoom(room);
            StructTowers.buildInRoom(room);
            StructStorage.buildInRoom(room);
            StructContainers.buildInRoom(room);
            Spawner.buildInRoom(room);

            // release new work for the builders if possible
            BuildOrders.execute(room);
        }

        // Claimed a new room, build a spawner
        if (!hasSpawner && room.controller.my) {
            let sites = Spawner.getMySites(room);
            if(sites.length === 0) {
                console.log('building spawner in ' + room);
                Spawner.buildInRoom(room);
            } else {
                console.log(sites[0].pos);
            }
        }
    }

    for(let name in Game.creeps) {
        let creep = Game.creeps[name];

        if( creep.spawning) continue;
        
        // all preruns are the same.
        roleHarvester.preRun(creep);

        if (creep.memory.claimed === 1) {
            console.log('building spawner in ' + creep.room);
            if (Spawner.buildInRoom(creep.room)) {
                creep.memory.claimed = 2;
            }
        }

        if (roleMiner.is(creep)) {
            
            roleMiner.run(creep);
            continue;
        }
        if (roleScout.is(creep)) {
            roleScout.run(creep);
            continue;
        }
        if(roleSettler.is(creep)) {
            roleSettler.run(creep);
            continue;
        }

        if (!creep.busy && roleBuilder.is(creep)) {
            roleBuilder.run(creep, hasTowers[creep.room.name]);
            if (!creep.busy) roleHarvester.run(creep);
        }

        if (!creep.busy && roleHarvester.is(creep)) {
            roleHarvester.run(creep);
        }

        if (!creep.busy) { // Upgrader, also the catch-all
            roleUpgrader.run(creep);
        }

        if (creep.ticksToLive === 1) {
            creep.say('☠️ dying');
            // console.log(`${creep} ${creep.pos} died naturally.`);
            for(const resourceType in creep.carry) {
                creep.drop(resourceType);
            }
            // TODO Inform a Spawner to replace the creep.
            delete Memory.creeps[creep.name];
        }
    }
    utils.gc(); // garbage collect the recently deseased creep
    Roads.gc();
    Towers.gc();
    Extensions.gc();
    RoomUtils.gc();
    BuildOrders.gc();
};
