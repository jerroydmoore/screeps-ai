const Errors = require('errors');
const Roads = require('roads')

module.exports = {
    moveTo: function(creep, target, color) {
        let opts, code;

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
    }
}
