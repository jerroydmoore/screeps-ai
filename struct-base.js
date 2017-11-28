const Constants = require('constants');
const Roads = require('roads');
const utils = require('utils');
const Errors = require('errors');

class Struct {
    constructor(structureType) {
        this.structureType = structureType
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
            existing = existingExt.length + existingSites.length,
            desired = this.getDesiredNumberOfStructs(room),
            howmanyBuilt = existingExt.length + existingSites.length,
            howmanyToBuild = desired - howmanyBuilt,
            range = this.getDesiredRange(room);

        if(howmanyToBuild < 1) {
            console.log(`No ${this.structureType} to create in ${room}. Already enough: ${howmanyBuilt}/${desired}`)
            return;
        }

        //round robin, build
        let generator = this.getBuildingPointsOfInterests(room)
        console.log(generator)
        for(let target of generator) {
            let posList = utils.findFreePosNearby(target, range, howmanyToBuild, this.minFreeAdjSpaces, this.minPlacementDistance, this.avoidList);
            
            console.log(target)
            let roadList = []
            while(posList.length && howmanyToBuild-- > 0) {
                let pos = posList.pop();
                let code = room.createConstructionSite(pos, this.structureType);
                Errors.check(pos, `createConstructionSite({$this.structureType})`, code);
                if (code !== OK) howmanyToBuild++;
                if (code === OK) {
                    console.log(`Creating ${this.structureType} at ${pos}`)
                    roadList.push(pos)
                }
            }
            Roads.connect(target, roadList);
        }
        if (howmanyToBuild) {
            console.log(`Unable to build ${howmanyToBuild} ${this.structureType}(s) in ${room}`)
        }
    }
    gc() {
        this._structs = {}
        this._sites = {}
    }
}
module.exports = Struct;