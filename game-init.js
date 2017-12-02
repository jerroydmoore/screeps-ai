module.exports = function(phaseNumber) {
    let logger = console.log;
    let preamble = '#' + Game.time;
    preamble += phaseNumber ? `[${phaseNumber}]` : '';
    console.log = (event) => logger(preamble + ' ' + event);

    if (! Memory.gcl) Memory.gcl = Game.gcl.level;

    if (! Memory.recharge) Memory.recharge = {};
    if (! Memory.decon) Memory.decon = {};
    if (! Memory.rooms) Memory.rooms = {};
    if (! Memory.towers) Memory.towers = {};
};
