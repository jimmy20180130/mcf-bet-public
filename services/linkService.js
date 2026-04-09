const codes = [] // { code, playerid, expiresAt }
const User = require('../models/User');

function generateCode() {
    // 00001 ~ 99999
    return Math.floor(Math.random() * 99999) + 1;
}

function createLinkCode(playerid) {
    const user = User.getByPlayerId(playerid);
    if (user && user.discordid) {
        return null; // 已綁定
    }

    // check if there's already a code for this playerid
    const existing = codes.find(c => c.playerid === playerid && c.expiresAt > Date.now());
    if (existing) {
        return existing.code; // 回傳現有的驗證碼
    }

    let code;
    do {
        code = generateCode();
    } while (codes.some(c => c.code === code));
    codes.push({ code, playerid, expiresAt: Date.now() + 3600000 }); // 1 hour expiration
    return code;
}

function verifyLinkCode(code) {
    const index = codes.findIndex(c => c.code === code && c.expiresAt > Date.now());
    if (index !== -1) {
        const playerid = codes[index].playerid;
        codes.splice(index, 1); // remove used code
        return playerid;
    }
    return null;
}

module.exports = {
    createLinkCode,
    verifyLinkCode
};