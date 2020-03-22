// https://github.com/ScreepsQuorum/screeps-quorum
RoomPosition.prototype.serialize = function () {
  return Room.serializeName(this.roomName) + String.fromCharCode(this.x * 100 + +this.y + 200);
};
RoomPosition.serialize = function (pos) {
  return pos.serialize();
};

// https://github.com/ScreepsQuorum/screeps-quorum
RoomPosition.deserialize = function (string) {
  const roomname = Room.deserializeName(string.slice(0, -1));
  const coordraw = string.charCodeAt(string.length - 1) - 200;
  const x = Math.floor(coordraw / 100);
  const y = coordraw % 50;
  return new RoomPosition(x, y, roomname);
};

RoomPosition.prototype.equals = function (pos) {
  return this.x == pos.x && this.y == pos.y && this.roomName == pos.roomName;
};
