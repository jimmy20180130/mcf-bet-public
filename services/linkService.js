const codes = [] // { code, playeruuid, expiresAt }
const User = require('../models/User');

function createLinkCode(playeruuid) {
    const user = User.getByUuid(playeruuid);
    if (user && user.discordid) {
        return null; // 已綁定
    }

    // check if there's already a code for this playeruuid
    const existing = codes.find(c => c.playeruuid === playeruuid && c.expiresAt > Date.now());
    if (existing) {
        return existing.code; // 回傳現有的驗證碼
    }

    let code;
    do {
        code = Math.floor(Math.random() * 99999) + 1; // 00001 ~ 99999
    } while (codes.some(c => c.code === code));
    codes.push({ code, playeruuid, expiresAt: Date.now() + 3600000 }); // 1 hour expiration
    return code;
}

function verifyLinkCode(code) {
    const index = codes.findIndex(c => c.code === code && c.expiresAt > Date.now());
    if (index !== -1) {
        const playeruuid = codes[index].playeruuid;
        codes.splice(index, 1); // remove used code
        return playeruuid;
    }
    return null;
}

module.exports = {
    createLinkCode,
    verifyLinkCode
};