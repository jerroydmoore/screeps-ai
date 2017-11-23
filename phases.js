let Phases = [
    {}, // Controller level starts at 0
    { // Level 1
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
    }, { // Level 2
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
    }
]

Phases.getPhase = function(room) {
    let controller = room.controller,
    phaseNo = controller.level || 2;
    // TODO: Rooms that don't have a controller?
    return phaseNo;
}

module.exports = Phases;