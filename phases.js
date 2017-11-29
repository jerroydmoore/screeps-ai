const StructExtensions = require('struct-extensions')
let Phases = [
    {}, // Controller level starts at 0
    {
        Level: 1,
        checkLevelPeriod: 100,
        SpawnScoutAfterSkippedPeriods: -1,
        SpawnPeriod: 25,
        minimumEnergyToSpawn: 250,
        Harvester: {
            count: 2,
            parts: [WORK,CARRY,MOVE,MOVE,CARRY,WORK,MOVE,WORK,CARRY]
        },
        Upgrader: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE,CARRY,WORK,MOVE,WORK,CARRY]
        },
        Builder: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE,CARRY,WORK,MOVE,WORK,CARRY]
        },
        Scout: {
            count: 256,
            // scouts are expected to go on roads
            parts: [TOUGH, MOVE, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK ]

        },
        Pilgrim: {
            count: 1,
            parts: [MOVE, CLAIM, MOVE, WORK]
        }
    }, {
        Level: 2,
        checkLevelPeriod: 500,
        SpawnScoutAfterSkippedPeriods: 10,
        SpawnPeriod: 50,
        minimumEnergyToSpawn: 550,
        Harvester: {
            count: 2,
            parts: [WORK,CARRY,MOVE,MOVE,CARRY,WORK,MOVE,WORK,CARRY]
        },
        Upgrader: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE,CARRY,WORK,MOVE,WORK,CARRY]
        },
        Builder: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE,CARRY,WORK,MOVE,WORK,CARRY]
        },
        Scout: {
            count: 256,
            // scouts are expected to go on roads
            parts: [TOUGH, MOVE, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK ]
        },
        Pilgrim: {
            count: 1,
            parts: [MOVE, MOVE, CLAIM]
        }
    }
]

Phases.getCurrentPhaseInfo = function (spawner) {
    let number = Phases.getCurrentPhaseNumber(spawner);
    while (!Phases[number]) {
        number--;
        if (number < 0) {
            throw new Error('Phases do not exist!');
        }
    }
    return Phases[number];
}
Phases.getCurrentPhaseNumber = function(spawner) {
    return spawner.memory.phase || 1;
}
Phases.determineCurrentPhaseNumber = function (spawner) {
    let phaseNo = spawner.memory.phase || 1,
        period = Phases[phaseNo].checkLevelPeriod;

    if (Game.time % period === 0) {
        // We don't need to check on every tick
        spawner.memory.phase = 1;
        let existingExt = StructExtensions.getMyStructs(spawner.room);
        if (existingExt.length >= 5) {
            spawner.memory.phase = 2;
        }
        if (phaseNo !== spawner.memory.phase) {
            console.log(`Updated ${spawner} phase to ${spawner.memory.phase}`)
        }
    }
    // TODO: Rooms that don't have a controller?
    return spawner.memory.phase;
}

module.exports = Phases;
