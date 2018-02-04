interface IStructureWithEnergy {
    energy: number;
}
interface ICacheInternalValue {
    value: any;
    ttl: number;
    expireTick: number;
}

function isExpired(entry: ICacheInternalValue | void): boolean {
    return entry ? entry.expireTick <= Game.time : true;
}

class CacheEntry extends Map<string, ICacheInternalValue> {
    constructor() {
        super(...arguments);
    }
    public setValue(prop: string, value: any, opts: {ttl?: number} = {}) {
        const params: ICacheInternalValue = Object.assign({
            value,
            ttl: opts.ttl || 1,
            expireTick: Game.time + opts.ttl,
        }, opts);

        opts = Object.assign({}, opts);
        if (params.ttl > 0) {
            super.set(prop, params);
        }
    }
    public getValue(prop: string): undefined | any {
        const entry: ICacheInternalValue = super.get(prop);
        if (! entry || isExpired(entry)) {
            super.delete(prop);
            return undefined;
        }
        return entry.value;
    }
    public hasValue(prop: string): boolean {
        return super.has(prop) && !isExpired(super.get(prop));
    }
    public gc(): void {
        for (const [prop, entry] of this.entries()) {
            if (isExpired(entry)) {
                super.delete(prop);
            }
        }
    }
}

class CacheMap extends Map<string, CacheEntry> {
    constructor() {
        super(...arguments);
    }
    public get(id: string): CacheEntry {
        // If does not exist, create it
        if (! super.has(id)) {
            super.set(id, new CacheEntry());
        }
        return super.get(id);
    }
    public gc(): void {
        // Gb each entry
        for (const [key, cache] of this.entries()) {
            cache.gc();
            if (! cache.size) {
                super.delete(key);
            }
        }
    }
    public calculateProjectedEnergy(): void {

        for (const cache of this.values()) {
            cache.delete("projectedEnergy");
        }

        for (const name in Game.creeps) {
            if (! Game.creeps[name]) { continue; }
            const creep = Game.creeps[name];
            let id = creep.memory.rechargeId;

            /**
             * Extensions/Spawns/Towers S. with Energy E. E' = E.
             * Iterate through Creeps C, if C.rechargeId = S.id, E' += C.capacity;
             * Upon new Creep.transfer requests, check E' >= S.capacity, if true, op succeeds, E' += C.capacity;
             * Re-generate at beginning of next ticks.
             */
            if ( id) {
                const target: IStructureWithEnergy = Game.getObjectById(id);

                if (! target) {
                    delete creep.memory.rechargeId;
                    continue;
                }

                const cache = this.get(id),
                    energy = cache.getValue("projectedEnergy") || target.energy;

                cache.setValue("projectedEnergy", energy + creep.carryCapacity, {ttl: 1});
            }

            /**
             * Container/Storage/Resource/Source S. with Energy E. E' = E.
             * Iterate through Creeps C, if C.sId = S.id, E' -= C.capacity;
             * Upon new Creep.withdraw/harvest requests, check C.capacity > E'. If true, op succeeds, E' -= C.capacity;
             * Dispose at the end of the tick. (Re-generate at the beginning of ticks)
             */
            id = creep.memory.sId;
            if ( id) {
                const target: IStructureWithEnergy = Game.getObjectById(id),
                    cache = this.get(id),
                    energy = cache.getValue("projectedEnergy") || target.energy;
                cache.setValue("projectedEnergy", energy - creep.carryCapacity, {ttl: 1});
            }
            id = creep.memory.fallenResourceId;
            if ( id) {
                const cache = this.get(id);
                let energy = cache.getValue("projectedEnergy") || 0;
                try {
                    const target: Resource = Game.getObjectById(id);
                    energy = cache.hasValue("projectedEnergy") ? energy : target.amount;
                } catch (e) {
                    // ignore Game.getObjectById exceptions
                }
                cache.setValue("projectedEnergy", energy - creep.carryCapacity, {ttl: 1});
            }
        }
    }
    public addEnergyProperties(prototype: object): void {
        if (! prototype.hasOwnProperty("energy")) {
            Object.defineProperty(prototype, "energy", {
                get(): number {
                    if (this instanceof Resource) {
                        if (this.resourceType === RESOURCE_ENERGY) {
                            return this.amount;
                        }
                        return 0;
                    } else if (this instanceof StructureContainer || this instanceof StructureStorage) {
                        return this.store[RESOURCE_ENERGY];
                    }
                },
            });
        }
        if (! prototype.hasOwnProperty("energyCapacity")) {
            Object.defineProperty(prototype, "energyCapacity", {
                get(): number {
                    if (this instanceof Resource) {
                        return 0;
                    } else if (this instanceof StructureContainer || this instanceof StructureStorage) {
                        return this.storeCapacity;
                    }
                },
            });
        }
        Object.defineProperty(prototype, "projectedEnergy", {
            get(): number {
                const cache = Cache.get(this.id);
                return cache.getValue("projectedEnergy") || this.energy;
            },
            set(value: number) {
                const cache = Cache.get(this.id);
                cache.setValue("projectedEnergy", value, {ttl: 1});
            },
            configurable: true,
        });
    }
}
const Cache = new CacheMap();
export { Cache };
