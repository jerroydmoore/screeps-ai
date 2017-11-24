let Phases = [
    {}, // Controller level starts at 0
    {
        Level: 1,
        Harvester: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE]
        },
        Upgrader: {
            count: 2,
            parts: [WORK,CARRY,MOVE,MOVE]
        },
        Builder: {
            count: 0,
            parts: [WORK,CARRY,MOVE,MOVE]
        },
        [STRUCTURE_EXTENSION]: 0
    }, {
        Level: 2,
        Harvester: {
            count: 2,
            parts: [WORK,CARRY,MOVE,MOVE]
        },
        Upgrader: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE]
        },
        Builder: {
            count: 4,
            parts: [WORK,CARRY,MOVE,MOVE]
        },
        [STRUCTURE_EXTENSION]: 10 
    }
]

Phases.getCurrentPhaseInfo = function (room) {
    let number = Phases.getCurrentPhaseNumber(room);
    while (!Phases[number]) {
        number--;
        if (number < 0) {
            throw new Error('Phases do not exist!');
        }
    }
    return Phases[number];
}
Phases.getCurrentPhaseNumber = function(room) {
    let controller = room.controller,
    phaseNo = controller.level || 2;
    // TODO: Rooms that don't have a controller?
    return phaseNo;
}

module.exports = Phases;