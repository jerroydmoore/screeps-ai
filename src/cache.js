function isExpired(entry) {
  return entry ? entry.expireTick <= Game.time : true;
}
class CacheEntry extends Map {
  constructor() {
    super(...arguments);
  }
  setValue(prop, value, opts = {}) {
    opts = Object.assign({}, opts);
    opts.value = value;
    opts.ttl = opts.ttl || 1;
    opts.expireTick = Game.time + opts.ttl;
    if (opts.ttl > 0) {
      super.set(prop, opts);
    }
  }
  getValue(prop) {
    let entry = super.get(prop);
    if (!entry || isExpired(entry)) {
      super.delete(prop);
      return undefined;
    }
    return entry.value;
  }
  hasValue(prop) {
    return super.has(prop) && !isExpired(super.get(prop));
  }
  gc() {
    for (let [prop, entry] of this.entries()) {
      if (isExpired(entry)) {
        super.delete(prop);
      }
    }
  }
}

class CacheMap extends Map {
  constructor() {
    super(...arguments);
  }
  get(id) {
    // If does not exist, create it
    if (!super.has(id)) {
      super.set(id, new CacheEntry());
    }
    return super.get(id);
  }
  gc() {
    // Gb each entry
    for (let [key, cache] of this.entries()) {
      cache.gc();
      if (!cache.size) {
        super.delete(key);
      }
    }
  }
  calculateProjectedEnergy() {
    for (let cache of this.values()) {
      cache.delete('projectedEnergy');
    }

    for (let name in Game.creeps) {
      try {
        let creep = Game.creeps[name],
          id = creep.memory.rechargeId;

        /**
         * Extensions/Spawns/Towers S. with Energy E. E' = E.
         * Iterate through Creeps C, if C.rechargeId = S.id, E' += C.capacity;
         * Upon new Creep.transfer requests, check E' >= S.capacity, if true, op succeeds, E' += C.capacity;
         * Re-generate at beginning of next ticks.
         */
        if (id) {
          let target = Game.getObjectById(id);

          if (!target) {
            delete creep.memory.rechargeId;
            continue;
          }

          let cache = this.get(id),
            energy = cache.getValue('projectedEnergy') || target.energy;

          cache.setValue('projectedEnergy', energy + creep.carryCapacity, { ttl: 1 });
        }

        /**
         * Container/Storage/Resource/Source S. with Energy E. E' = E.
         * Iterate through Creeps C, if C.sId = S.id, E' -= C.capacity;
         * Upon new Creep.withdraw/harvest requests, check C.capacity > E'. If true, op succeeds, E' -= C.capacity;
         * Dispose at the end of the tick. (Re-generate at the beginning of ticks)
         */
        id = creep.memory.sId;
        if (id) {
          let target = Game.getObjectById(id),
            cache = this.get(id),
            energy = cache.getValue('projectedEnergy') || target.energy;
          cache.setValue('projectedEnergy', energy - creep.carryCapacity, { ttl: 1 });
        }
        id = creep.memory.fallenResourceId;
        if (id) {
          let cache = this.get(id),
            energy = cache.getValue('projectedEnergy') || 0;
          try {
            let target = Game.getObjectById(id);
            energy = cache.hasValue('projectedEnergy') ? energy : target.amount;
          } catch (e) {
            // ignore Game.getObjectById exceptions
          }
          cache.setValue('projectedEnergy', energy - creep.carryCapacity, { ttl: 1 });
        }
      } catch (err) {
        console.log(`ERR calculateProjectedEnergy for creep ${name}: ${err}`);
      }
    }
  }
  addEnergyProperties(prototype) {
    if (!Object.prototype.hasOwnProperty.call(prototype, 'energy')) {
      Object.defineProperty(prototype, 'energy', {
        get() {
          if (this instanceof Resource) {
            if (this.resourceType === RESOURCE_ENERGY) {
              return this.amount;
            }
            return 0;
          } else if (this instanceof StructureContainer || this instanceof StructureStorage) {
            return this.store[RESOURCE_ENERGY];
          }
          return undefined;
        },
      });
    }
    if (!Object.prototype.hasOwnProperty.call(prototype, 'energyCapacity')) {
      Object.defineProperty(prototype, 'energyCapacity', {
        get() {
          if (this instanceof Resource) {
            return 0;
          } else if (this instanceof StructureContainer || this instanceof StructureStorage) {
            return this.storeCapacity;
          }
          return undefined;
        },
      });
    }
    Object.defineProperty(prototype, 'projectedEnergy', {
      get() {
        let cache = Cache.get(this.id);
        return cache.getValue('projectedEnergy') || this.energy;
      },
      set(value) {
        let cache = Cache.get(this.id);
        cache.setValue('projectedEnergy', value, { ttl: 1 });
      },
      configurable: true,
    });
  }
}

const Cache = new CacheMap();
module.exports = Cache;
module.exports.CacheEntry = CacheEntry;
