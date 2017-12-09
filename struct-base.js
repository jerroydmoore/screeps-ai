const Constants = require('constants');
const Roads = require('roads');
const BuildOrders = require('build-orders');
const utils = require('utils');

class Struct {
    constructor(structureType, opts={}) {
        this.structureType = structureType;
        this.howmanyAtEachPoi = opts.howmanyAtEachPoi || -1;
        this.minFreeAdjSpaces = opts.minFreeAdjSpaces || 3,
        this.minPlacementDistance = opts.minPlacementDistance || 7,
        this.avoidList = opts.avoidList || [];
        this.gc();
    }
    getMyStructs(room) {
        if (!this._structs[room.id]) {
            this._structs[room.id] = room.find(FIND_MY_STRUCTURES, {filter: { structureType: this.structureType }});
        }
        return this._structs[room.id];
    }
    getMySites (room) {
        if (!this._sites[room.id]) {
            this._sites[room.id] = room.find(FIND_MY_CONSTRUCTION_SITES, {filter: { structureType: this.structureType }});
        }
        return this._sites[room.id];
    }
    getDesiredNumberOfStructs (room) {
        let lvl = room.controller.level;
        return CONTROLLER_STRUCTURES[this.structureType][lvl] || 0;

    }
    getDesiredRange (room) {
        let lvl = room.controller.level,
            info = Constants.RoomLevel[lvl],
            num = info[this.structureType + 'Range'];
        return num || 5;
    }
    * getBuildingPointsOfInterests (room) {
        let s = room.find(FIND_SOURCES);
        for (let i=0;i<s.length;i++) {
            yield s[i];
        }
    }
    buildInRoom (room) {
        let existingExt = this.getMyStructs(room),
            existingSites = this.getMySites(room),
            plannedSitesCount = BuildOrders.getCount(room, this.structureType),
            desired = this.getDesiredNumberOfStructs(room),
            howmanyBuilt = existingExt.length + existingSites.length,
            howmanyToBuild = desired - howmanyBuilt - plannedSitesCount,
            range = this.getDesiredRange(room);

        if (! room || !(room instanceof Room)) {
            console.log('buildInRoom failed because it needs valid room');
            return;
        }
        if(howmanyToBuild < 1) {
            // console.log(`No ${this.structureType} to create in ${room}. Already enough: ${howmanyBuilt}/${desired}`);
            return;
        }

        //round robin, build
        let poiAreas = this.getBuildingPointsOfInterests(room);
        for(let target of poiAreas) {

            let freePOSs = utils.findFreePosNearby(target, range, this.minFreeAdjSpaces, this.minPlacementDistance, this.avoidList),
                howmanyHere = 0,
                roadList = [];
            
            for(let pos of freePOSs) {
                // console.log(`Building ${this.structureType} ${howmanyToBuild}:${howmanyHere} at ${pos}`);
                if (BuildOrders.schedule(room, this.structureType, pos)) {
                    howmanyToBuild--;
                    howmanyHere++;
                    roadList.push(pos); // build a road to the structure so creeps can charge it.
                }
                
                if (howmanyToBuild === 0 || howmanyHere === this.howmanyAtEachPoi) {
                    break; // we have built enough or want to move onto the next POI
                }
            }

            Roads.connect(target, roadList);
            if (howmanyToBuild === 0) { 
                // don't need the rest of the POI locations.
                break;
            }
        }
        if (howmanyToBuild) {
            console.log(`Unable to build ${howmanyToBuild} ${this.structureType}(s) in ${room}`);
        }
        return howmanyToBuild === 0;
    }
    gc() {
        this._structs = {};
        this._sites = {};
    }
}
module.exports = Struct;
