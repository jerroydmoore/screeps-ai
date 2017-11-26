const Errors = require('errors');
const Roads = require('roads');
const utils = require('utils');

const BODYPART_COST = {
    [MOVE]: 50,
    [WORK]: 100,
    [ATTACK]: 80,
    [CARRY]: 50,
    [HEAL]: 250,
    [RANGED_ATTACK]: 150,
    [TOUGH]: 10,
    [CLAIM]: 600
};

module.exports = {
    moveTo: function(creep, target, color) {
        let opts, code;

        if (creep.busy) {
            return;
        }
        if (color) {
            opts = { visualizePathStyle: { stroke: color, opacity: 1, lineStyle: 'dotted' } }
        }

        code = creep.moveTo(target, opts);
        if (code === ERR_NO_PATH) {
            // ignore these. We can't cound blocked, because they re-path after 5 turns.
            return OK; 
        }
        Errors.check(creep, `moveTo ${target}`, code);
        if (code === OK || code === ERR_TIRED) {
            creep.busy = 1;
            if(code === OK && creep.memory.blocked && --creep.memory.blocked >= 0) {
                delete creep.memory.blocked;
            }
            Roads.shouldBuildAt(creep)
            return OK;
        }
        return code;
    },
    spawn: function (spawner, label, availableBodyParts) {
        let bodyParts = [],
            action = 'spawnCreep',
            cost = 0;
        for(let i=0;i<availableBodyParts.length;i++) {
            bodyParts.push(availableBodyParts[i]);
            cost = this.bodyPartCost(bodyParts);
            if(cost > spawner.room.energyAvailable) {
                // we found our limit, remove the excess body part and spawn.
                cost -= BODYPART_COST[bodyParts.pop()];
                break;
            }
        }
        
        label += Game.time;
        console.log(`Spawning ${label} ` + JSON.stringify(bodyParts) + ` cost ${cost}/${spawner.room.energyAvailable}`);
        let code = spawner[action](bodyParts, label);
        if (!Errors.check(spawner, action, code)) {
            utils.gc(); // garbage collect the recently deseased creep
            return label;
        }
    },
    bodyPartCost: function(bodyParts) {
        return bodyParts.reduce((acc, part) => {
            return acc + BODYPART_COST[part];
        }, 0);
    },
    bodyPartRenewCost: function(bodyParts) {
        let cost = this.bodyPartCost(bodyParts);
        let body_size = bodyParts.length;
        return Math.ceil(cost/2.5/body_size)
    }
}
