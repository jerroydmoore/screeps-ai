interface CreepMemory {
    rechargeId: string;
    fallenResourceId: string;
    sId: string;
}

interface ConstructionSite {
    isRampart(): Boolean;
}
interface Structure {
    isRampart(): Boolean;
}

interface RoomPosition {
    serialize(): string;
    equals(pos: RoomPosition): boolean;
}
interface RoomPositionConstructor {
    serialize(pos: RoomPosition): string;
    deserialize(string: string): RoomPosition;
}
interface RoomConstructor {
    serializeName(name: string): string;
    deserializeName(name: string): string;
}