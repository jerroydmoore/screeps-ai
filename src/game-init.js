const RoomUtils = require('./rooms');

module.exports = function (phaseNumber) {
  let logger = console.log;
  let preamble = '#' + Game.time;
  preamble += phaseNumber ? `[${phaseNumber}]` : '';
  console.log = (event) => logger(preamble + ' ' + event);

  if (!Memory.gcl) {
    Memory.gcl = 0;
    for (let roomName in Game.rooms) {
      let room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        Memory.gcl++;
      }
    }
  }

  if (!Memory.rooms) Memory.rooms = {};
  for (let roomName in Game.rooms) {
    RoomUtils.initialize(roomName);
  }
  if (!Memory.towers) Memory.towers = {};
};
