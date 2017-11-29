const Errors = require('errors');
const utils = require('utils');

function pruneBallots(ballots, expiration) {
    return ballots.filter(t => t + expiration > Game.time);
}
const VOTE_EXPIRATION = 100;
const ELECTION_THRESHOLD = 5;
Road = {
    buildAt(target) {
        let pos = target.pos || target,
            room = target.room || Game.rooms[pos.roomName];
        return room.createConstructionSite(pos, STRUCTURE_ROAD);
    },
    shouldBuildAt: function(target) {

        if (!target || !target.room || !target.room.controller) return
        if (target.room.controller.level < 2) {
            // console.log('It is not time to build roads yet');
            return false;
        }
        if (!this.haveRoad(target) && this.voteForRoad(target, ELECTION_THRESHOLD, VOTE_EXPIRATION)) {
            target.say('🏗 road');
            console.log(`Creating road at ${target.pos}`)
            return OK === this.buildAt(target)
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
    voteForRoad: function(target, voteThreshold, expiration) {
        if (!Memory.roads) Memory.roads = {};
        let pos = target.pos,
            addr = `${pos.roomName},${pos.x},${pos.y}`,
            ballots = Memory.roads[addr];
        
        if (!ballots) {
            Memory.roads[addr] = [Game.time];
            //console.log(`${target} votes #${Memory.roads[addr].length} at ${target.pos}`);
            return false;
        }
        Memory.roads[addr] = pruneBallots(ballots, expiration);
        Memory.roads[addr] = Memory.roads[addr].map(x => Game.time); // when a candidate is voted on, all votes get refreshed
        Memory.roads[addr].push(Game.time);
        ballots = Memory.roads[addr];
        //console.log(`${target} votes #${ballots.length} at ${target.pos}`);

        if(ballots.length >= voteThreshold) {
            delete Memory.roads[addr]
            return true;
        }
        return false;

        
    },
    connect: function(target, destinations) {
        // Create construction sites from target to all destinations

        if(!destinations || destinations.length === 0) return;

        let room = target.room || Game.rooms[target.roomName];
        //target = utils.findFreeAdjecentPos(target);
        destinations.forEach((pos) => {
            // let pos = utils.findFreeAdjecentPos(_pos),
            //     path = target.findPathTo(pos);
            let res = PathFinder.search(target, {pos, range: 1}, {maxRooms: 1});

            path.forEach((point) => {
                //let point = new RoomPosition(_point.x, _point.y, room.name);
                if (this.haveRoad(point)) return;
                let code = this.buildAt(point)
                Errors.check(point, 'createRoad', code);
            })
        })
    },
    gc: function() {
        if (Memory.roads && Game.time % 1000 === 0) {
            let howmanyAddr = 0, delAddr = 0, deltaBallots = 0;
            for(let addr in Memory.roads) {
                howmanyAddr++;
                let len = Memory.roads[addr].length
                Memory.roads[addr] = pruneBallots(Memory.roads[addr], ELECTION_THRESHOLD, VOTE_EXPIRATION);
                deltaBallots += len - Memory.roads[addr].length;
                if (Memory.roads[addr].length === 0) {
                    delete Memory.roads[addr];
                    delAddr++;
                }
            }
            //console.log(`Pruned road ${deltaBallots} ballots. Deleted ${delAddr}/${howmanyAddr} candidates`);
        }
    }
}

module.exports = Road;
