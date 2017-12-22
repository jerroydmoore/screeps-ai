module.exports = function(phaseNumber) {
    let logger = console.log;
    let preamble = '#' + Game.time;
    preamble += phaseNumber ? `[${phaseNumber}]` : '';
    console.log = (event) => logger(preamble + ' ' + event);

    if (! Memory.gcl) Memory.gcl = Game.gcl.level;

    if (! Memory.recharge) Memory.recharge = {};
    if (! Memory.decon) Memory.decon = {};
    if (! Memory.con) Memory.con = {};
    if (! Memory.rooms) Memory.rooms = {};
    for (let room in Game.rooms) {
        if (! Memory.rooms[room.name]) {
            Memory.rooms[room.name] = {};
        }
    }
    if (! Memory.towers) Memory.towers = {};
};
