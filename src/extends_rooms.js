// https://github.com/ScreepsQuorum/screeps-quorum
const unicodeModifier = 200;
const quadrantMap = {
  0: {
    x: 'E',
    y: 'N',
  },
  1: {
    x: 'E',
    y: 'S',
  },
  2: {
    x: 'W',
    y: 'S',
  },
  3: {
    x: 'W',
    y: 'N',
  },
};
Room.serializeName = function (name) {
  if (name === 'sim') {
    return 'sim';
  }
  const coords = Room.getCoordinates(name);
  let quad;
  if (coords.x_dir === 'E') {
    quad = coords.y_dir === 'N' ? '0' : '1';
  } else {
    quad = coords.y_dir === 'S' ? '2' : '3';
  }
  const x = String.fromCodePoint(+coords.x + +unicodeModifier);
  const y = String.fromCodePoint(+coords.y + +unicodeModifier);
  return `${quad}${x}${y}`;
};

Room.deserializeName = function (sName) {
  if (sName === 'sim') {
    return 'sim';
  }
  const xDir = quadrantMap[sName[0]].x;
  const yDir = quadrantMap[sName[0]].y;
  const x = sName.codePointAt(1) - unicodeModifier;
  const y = sName.codePointAt(2) - unicodeModifier;
  return `${xDir}${x}${yDir}${y}`;
};

Room.getCoordinates = function (name) {
  const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
  const match = coordinateRegex.exec(name);
  return {
    x: match[2],
    y: match[4],
    x_dir: match[1],
    y_dir: match[3],
  };
};
