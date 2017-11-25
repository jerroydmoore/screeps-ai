const Errors = require('errors');
const utils = require('utils');

Road = {
    shouldBuildAt: function(target) {

        if (target.room.controller.level < 2) {
            console.log('It is not time to build roads yet');
            return false;
        }
        if (!this.haveRoad(target) && this.voteForRoad(target)) {
            target.say('🏗 road')
            return target.room.createConstructionSite(target, STRUCTURE_ROAD);
        }
        return false;
    },
    haveRoad: function(target) {
        let pos = target.pos || target,
            room = target.room || Game.rooms[pos.roomName],
            objects = room.lookAt(pos);
        
        // look for a road. if we find one, when we don't need to build one.
        let res = objects.find(o => {
            return (o.type === LOOK_CONSTRUCTION_SITES && o.constructionSite.structureType === STRUCTURE_ROAD)
                || (o.type === LOOK_STRUCTURES && o.structure.structureType === STRUCTURE_ROAD)
        });

        return res !== undefined;
    },
    voteForRoad: function(target, voteThreshold = 5, expiration = 100) {
        if (!Memory.roads) Memory.roads = {};
        let pos = target.pos,
            addr = `${pos.roomName},${pos.x},${pos.y}`,
            ballots = Memory.roads[addr];
        
        if (!ballots) {
            Memory.roads[addr] = [Game.time];
            console.log(`${target} votes #${Memory.roads[addr].length} at ${target.pos}`);
            return false;
        }
        Memory.roads[addr] = ballots.filter(t => t + expiration > Game.time);
        Memory.roads[addr].push(Game.time);
        ballots = Memory.roads[addr];
        console.log(`${target} votes #${ballots.length} at ${target.pos}`);

        if(ballots.length >= voteThreshold) {
            delete Memory.roads[addr]
            return true;
        }
        return false;

        
    },
    connect: function(target, destinations) {
        // Create construction sites from target to all destinations

        let room = target.room || Game.rooms[target.roomName];
        target = utils.findFreeAdjecentPos(target);
        destinations.forEach((_dest) => {
            let dest = utils.findFreeAdjecentPos(_dest),
                path = target.findPathTo(dest);

            path.forEach((_point) => {
                let point = new RoomPosition(_point.x, _point.y, room.name);
                if (this.haveRoad(point)) return;
                let code = room.createConstructionSite(point, STRUCTURE_ROAD);
                Errors.check(point, 'createRoad', code);
            })
        })
    }
}

module.exports = Road;
