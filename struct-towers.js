const StructBase = require('struct-base');
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
        // tower 1 at controller
        yield room.controller;

        // then all sources get a tower
        let s = room.find(FIND_SOURCES);
        for (let i=0;i<s.length;i++) {
            yield s[i];
        }

        // then the spawners get a tower
        s = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.type === STRUCTURE_SPAWN });
        for (let i=0;i<s.length;i++) {
            yield s[i];
        }
        // then spawn at entrances
        // check each separately, to make sure at least each entrances gets one spawned.
        // this doesn't exactly work. because it will places as many towers in one area before checking the next
        // TODO generator should return desired number of things in a place
        let searchParam = [ FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT ];
        for(let j=0;j<searchParam.length;j++) {
            s = room.find(searchParam[j]);
            for (let i=0;i<s.length;i++) {
                yield s[i];
            }
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
