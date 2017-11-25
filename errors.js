errorCode = { 0: "OK" }
errorCode[-1] = "ERR_NOT_OWNER";
errorCode[-2] = "ERR_NO_PATH";
errorCode[-3] = "ERR_NAME_EXISTS";
errorCode[-4] = "ERR_BUSY";
errorCode[-5] = "ERR_NOT_FOUND";
errorCode[-6] = "ERR_NOT_ENOUGH_ENERGY";
errorCode[-7] = "ERR_INVALID_TARGET";
errorCode[-8] = "ERR_FULL";
errorCode[-9] = "ERR_NOT_IN_RANGE";
errorCode[-10] = "ERR_INVALID_ARGS";
errorCode[-11] = "ERR_TIRED";
errorCode[-12] = "ERR_NO_BODYPART";
errorCode[-13] = "ERR_NOT_ENOUGH_EXTENSIONS";
errorCode[-14] = "ERR_RCL_NOT_ENOUGH";
errorCode[-15] = "ERR_GCL_NOT_ENOUGH";

exports.errorCode = errorCode
exports.check = (obj, action, code) => {
    if (code !== 0) {
        let errMsg = errorCode[code] || "UNKNOWN"
        console.log(`${obj} could not perform ${action}: ${errMsg}`)
        if (obj && obj.room && obj.room.visual && obj.room.visual.room) {
            obj.room.visual.text(``
                `‼️ ${action}: ${errMsg}`,
                obj.pos.x + 1,
                obj.pos.y,
                {align: 'left', opacity: 0.8});
        }
        return true;
    }
    return false;
}