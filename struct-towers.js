const StructBase = require('struct-base');
const Roads = require('roads');
const Errors = require('errors');
const utils = require('utils');
const AVOID_LIST = utils.AVOID_LIST;

class StructTowers extends StructBase {
    constructor() {
        super(STRUCTURE_TOWER);
        this.minFreeAdjSpaces = 3,
        this.minPlacementDistance = 7,
        this.avoidList = [AVOID_LIST[LOOK_SOURCES], AVOID_LIST[STRUCTURE_TOWER]];
    }
    * getBuildingPointsOfInterests (room) {
        yield room.controller;
        let s = room.find(FIND_SOURCES);
        for (let i=0;i<s.length;i++) {
            yield s[i];
        }
        s = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.type === STRUCTURE_SPAWN });
        for (let i=0;i<s.length;i++) {
            yield s[i];
        }
    }
    run(tower) {
        let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(closestHostile) {
            tower.attack(closestHostile);
        }

        // let closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        //     filter: (structure) => structure.hits < structure.hitsMax
        // });
        // if(closestDamagedStructure) {
        //     tower.repair(closestDamagedStructure);
        // }
    }
}

module.exports = new StructTowers();
