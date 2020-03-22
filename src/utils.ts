import { Cache } from "./cache";

export enum OccupiedPositionType {
    Available = 0,
    Disqualified = 1,
    Occupied = 2,
    AvoidArea = 3,
}

export class OccupiedPositionEntry {
    public type: OccupiedPositionType;
    public range: number;
    constructor(type: OccupiedPositionType, range: number) {
        this.type = type;
        this.range = range;
    }
}

const AVAILABLE_POSITION = new OccupiedPositionEntry(OccupiedPositionType.Available, 0);
const DISQUALIFIED_POSITION = new OccupiedPositionEntry(OccupiedPositionType.Disqualified, 0);
const OCCUPIED_POSITION = new OccupiedPositionEntry(OccupiedPositionType.Occupied, 0);

export interface IAvoidStructureOpts {
    range: number;
    resolveTo?: OccupiedPositionType;
    isCheckered?: boolean;
}
export class AvoidStructure {
    private structureType: StructureConstant;
    private range: number;
    private type: OccupiedPositionType;
    private isCheckered: boolean;

    constructor(structureType: StructureConstant, opts: IAvoidStructureOpts) {
        this.structureType = structureType;
        this.range = opts.range || 1;
        this.type = opts.resolveTo; // optional. Will be set to AVOID by findFreePosNearby
        this.isCheckered = opts.isCheckered; // optional.
    }
    public filter(o: LookAtResult): boolean {
        let res = o.type === LOOK_STRUCTURES && o.structure.structureType === this.structureType;
        res = res || o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === this.structureType;
        return res;
    }
}
interface IOrigin {
    x: number;
    y: number;
}
interface IOccupationMatrix {
    [index: number]: IOccupationRow;
}
interface IOccupationRow {
    [index: number]: OccupiedPositionEntry;
}
type foo = LookAtResultMatrix | IOccupationMatrix;
function isEdge(i: number, j: number, {x, y}: IOrigin, range: number): boolean {
    // console.log(`abs(${j} - ${x}) === ${range} || abs(${i} - ${y}) === ${range}`);
    return Math.abs(j - x) === range || Math.abs(i - y) === range;
}
function isCloseToRoomEdge(i: number , j: number): boolean {
    return i < 3 || j < 3 || i > 46 || j > 46;
}

// eslint-disable-next-line no-unused-vars
function printMatrix(matrix, message, transformer?): void {
    transformer = transformer || ((x) => x.type);
    if (message) {
        console.log(message);
    }
    const header = [];
    let headerPrinted = false,
        row;
    for (const i in matrix) {
        if (! matrix[i]) { continue; }
        row = [];
        for (const j in matrix[i]) {
            if (! matrix[i][j]) { continue; }
            header.push(j);
            row.push(matrix[i][j]);
        }
        if (! headerPrinted) {
            console.log("    " + header.join(" "));
            headerPrinted = true;
        }
        console.log(i + ": " + row.map(transformer).join("  "));
    }
}

function I<T>(arg: T): T {
    return arg;
}
function flipCoords([x, y]: [number, number]): [number, number] {
    return [y, x];
}
function *getColumnSubsets(originX: number, ringX: number, originY: number, ringY: number, transformer: typeof flipCoords = I): IterableIterator<[number, number]> {
    const jLow = originY - ringY,
        jHi = originY + ringY;
    for (let i = (originX - ringX); i <= (originX + ringX); i++) {
        if (Utils.isPosValid(i, jLow)) {
            yield transformer([i, jLow]);
        }
        if (Utils.isPosValid(i, jHi)) {
            yield transformer([i, jHi]);
        }
    }
}

const Utils = {
    getNearby(room: Room, pos: RoomPosition, range: number): LookAtResultMatrix {
        const top = Utils.correctInvalidCoord(pos.y - range);
        const left = Utils.correctInvalidCoord(pos.x - range);
        const bottom = Utils.correctInvalidCoord(pos.y + range);
        const right = Utils.correctInvalidCoord(pos.x + range);
        const area = room.lookAtArea(top, left, bottom, right, false);

        // printMatrix(area, 'getNearby', a => {
        //     let res = a.find(x => x.type === 'terrain');
        //     return res.terrain === 'wall' ? OccupiedPositionType.Occupied : OccupiedPositionType.Available;
        // });
        return area;
    },
    isWallTerrain(pos) {
        return Game.map.getTerrainAt(pos) === "wall";
    },
    correctInvalidCoord(x) {
        if (x < 2) { return 2; }
        if (x > 47) { return 47; }
        return x;
    },
    isCoordValid(x) {
        return Utils.correctInvalidCoord(x) === x;
    },
    isPosValid(x, y) {
        return Utils.isCoordValid(x) && Utils.isCoordValid(y);
    },
    AvoidStructure,
    AVOID_LIST: {
        [STRUCTURE_ROAD]: new AvoidStructure(STRUCTURE_ROAD, {range: 0, resolveTo: OccupiedPositionType.Disqualified }),
        [STRUCTURE_SPAWN]: new AvoidStructure(STRUCTURE_SPAWN, {range: 1 }),
        [STRUCTURE_CONTROLLER]: new AvoidStructure(STRUCTURE_CONTROLLER, {range: 4 }),
        [STRUCTURE_EXTENSION]: new AvoidStructure(STRUCTURE_EXTENSION, {range: 1, isCheckered: true }),
        [STRUCTURE_CONTAINER]: new AvoidStructure(STRUCTURE_CONTAINER, {range: 2 }),
        [STRUCTURE_STORAGE]: new AvoidStructure(STRUCTURE_STORAGE, {range: 2 }),
        [STRUCTURE_TOWER]: new AvoidStructure(STRUCTURE_TOWER, {range: 7 }),
        [LOOK_SOURCES]: { range : 2, filter: (o) => o.type === LOOK_SOURCES },
    },
    *findFreePosNearby(target, range, numOfFreeAdjacentSpaces= 3, avoidEachOtherRange= 2, avoidList= [], avoidIsCheckered= false, logging= false) {
        const pos = target.pos || target,
            room = target.room,
            borderedRange = range + 1;

        if (logging) {
            console.log(`findFreePosNearby(${target}, ${pos}, ${range})`);
        }

        avoidList.forEach((x) => x.type = x.type || OccupiedPositionType.AvoidArea);

        // start in a corner and work across
        const matrix: foo = Utils.getNearby(room, pos, borderedRange);

        for (const [j, i] of Utils.getCoordsWithinRange(pos, borderedRange)) {
            let initialValue = AVAILABLE_POSITION;
            if (isEdge(i, j, pos, borderedRange) || isCloseToRoomEdge(i, j)) {
                // we want to mark the border as a DISQUALIFIED_ENTRY
                initialValue = DISQUALIFIED_POSITION;
            }

            matrix[i][j] = (matrix[i][j] as LookAtResult[]).reduce((res, o) => {
                if (res.type !== OccupiedPositionType.AvoidArea) {
                    if (o.type === LOOK_TERRAIN && o.terrain === "wall") {
                        res = OCCUPIED_POSITION;
                    } else if (o.type === LOOK_STRUCTURES && o.structure.structureType !== STRUCTURE_ROAD) {
                        res = OCCUPIED_POSITION;
                    } else if (o.type === LOOK_CONSTRUCTION_SITES  && o.constructionSite.structureType !== STRUCTURE_ROAD) {
                        res = OCCUPIED_POSITION;
                    }
                }
                avoidList.forEach((avoidEntry) => {
                    // Check for range, bc if two avoids match, take the bigger of the two
                    if (avoidEntry.filter(o) && avoidEntry.range > res.range) {
                        res = avoidEntry;
                    }
                });
                return res;
            }, initialValue);
        }

        if (logging) {
            printMatrix(matrix, "After processing terrain");
        }

        // now that we've reduced. find the avoided areas, e.g. extensions, and tight spaces
        for (const [j, i] of Utils.getCoordsWithinRange(pos, range)) {
            const coord = matrix[i][j];
            if (coord.type === OccupiedPositionType.AvoidArea) {
                Utils.markNearby(matrix, i, j, [AVAILABLE_POSITION], DISQUALIFIED_POSITION, coord.range, coord.isCheckered);
            } else if (matrix[i][j].type === OccupiedPositionType.Available) {

                // check candidate for tight spaces
                const occupiedList = [OccupiedPositionType.Occupied, OccupiedPositionType.AvoidArea];
                const freeSpaces = Utils._countQualifiedSpacesInRange(matrix, i, j, 1, occupiedList, numOfFreeAdjacentSpaces, "type");
                if (numOfFreeAdjacentSpaces > freeSpaces) {
                    matrix[i][j] = DISQUALIFIED_POSITION;
                }
            }
        }

        if (logging) {
            printMatrix(matrix, "After marking avoid areas");
        }

        // yield free spaces, starting from the target
        for (const [j, i] of Utils.getCoordsWithinRange(pos, range)) {
            if (! matrix[i] || matrix[i][j] === undefined) { continue; }
            // console.log(`${i}, ${j} ${matrix[i][j].type}`);
            if (matrix[i][j] !== AVAILABLE_POSITION) { continue; }

            // Swap i and j to be compatible with Screep convention
            const freePos = new RoomPosition(j, i, room.name),
                pathFinder = PathFinder.search(freePos, {pos, range: 1}),
                path = pathFinder.path,
                distance = path.length;

            // Check path's distance < desired range, e.g. a wall between us, forcing us to go the long way
            if (distance > range) { continue; }

            yield freePos;

            // Update the matrix with the newly placed "thing"
            Utils.markNearby(matrix, i, j, [AVAILABLE_POSITION], DISQUALIFIED_POSITION, avoidEachOtherRange, avoidIsCheckered);
        }
    },
    *getCoordsWithinRange(origin: IOrigin, range: number): IterableIterator<[number, number]> {

        // yield the origin for completeness, even though most algos ignore it.
        yield [origin.x, origin.y];

        const ring = { x: 0, y: 1 };
        while (ring.y <= range && ring.x <= range) {

            // For each ring, get the row/columns.
            yield* getColumnSubsets(origin.x, ring.x, origin.y, ring.y);

            if (++ring.x > range) { break; }

            // use the same column subset algo, but reverse, i and j, and flip the results
            yield* getColumnSubsets(origin.y, ring.y, origin.x, ring.x, flipCoords);

            ring.y += 1;
        }
    },
    _countQualifiedSpacesInRange(matrix, x, y, range, dequalifiers, maxCount= 0xff, field?) {
        let qualifiedSpaces = 0;
        for (const [i, j] of Utils.getCoordsWithinRange({x, y}, range)) {
            if (i === x && y === j) { continue; }
            if (! matrix[i] || matrix[i][j] === undefined) {
                qualifiedSpaces++;
            } else {
                let cell = matrix[i][j];
                if (field) { cell = cell[field]; }
                if (! dequalifiers.includes(cell)) {
                    qualifiedSpaces++;
                }
                if (qualifiedSpaces >= maxCount) { return maxCount; }
            }
        }
        return qualifiedSpaces;
    },
    markNearby(matrix, x, y, replacementMembers, newValue, range, isCheckered= false) {
        for (const [i, j] of Utils.getCoordsWithinRange({x, y}, range)) {
            if (! matrix[i] || matrix[i][j] === undefined || (x === j && y === i)) { continue; }
            if (replacementMembers.includes(matrix[i][j])) {
                if (! isCheckered || !Utils._isCheckered([i, j], [x, y])) {
                    matrix[i][j] = newValue;
                }
            }
        }
    },
    _isCheckered([x, y], [xOrigin, yOrigin]) {
        return (x + xOrigin) % 2 === (y + yOrigin) % 2;
    },
    printMatrix,
    addMemoryProperty(prototype, memoryAttr) {
        if (prototype.hasOwnProperty(memoryAttr)) {
            return false;
        }
        Object.defineProperty(prototype, "memory", {
            get() {
                if (_.isUndefined(Memory[memoryAttr])) {
                    Memory[memoryAttr] = {};
                }
                if (!_.isObject(Memory[memoryAttr])) {
                    return undefined;
                }
                return Memory.spawns[this.id] = Memory[memoryAttr][this.id] || {};
            },
            set(value) {
                if (_.isUndefined(Memory[memoryAttr])) {
                    Memory[memoryAttr] = {};
                }
                if (!_.isObject(Memory[memoryAttr])) {
                    throw new Error(`Could not set ${memoryAttr} memory`);
                }
                Memory[memoryAttr][this.id] = value;
            },
            configurable: true,
        });
    },
    gc() {
        for (const name in Memory.creeps) {
            if (! Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
        // tslint:disable-next-line:forin
        for (const name in Memory.flags) {
            if (! Game.flags[name]) {
                delete Memory.flags[name];
                continue;
            }
            const flag = Game.flags[name];
            if (flag.color === COLOR_BLUE) {
                let phase;
                if (flag.room.memory[flag.pos.roomName]) {
                    phase = flag.room.memory[flag.pos.roomName].phase;
                }
                if (flag.secondaryColor === COLOR_BLUE) {
                    if (! phase) {
                        continue;
                    }
                    // if phase === 1||2, send aide. if phase > 3, delete flag.
                    if (phase < 3) {
                        flag.setColor(COLOR_BLUE, COLOR_CYAN);
                    }
                    // flag.remove();
                } else if (flag.secondaryColor === COLOR_CYAN) {
                    if (phase >= 3) {
                        flag.remove();
                    }
                }
            }
        }
    },
};

export { Utils };
