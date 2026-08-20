const User = require('../models/User');
const { readConfig } = require('../services/configService');

// Discord 管理員，或綁定的 Minecraft 帳號在 general / 任一 bot 的白名單內。
// 所有 Discord 指令共用這個判斷，避免各處大小寫與範圍不一致。
function hasAdminPermission(interaction) {
    if (interaction.member?.permissions?.has('Administrator')) return true;

    const user = User.getByDiscordId(interaction.user.id);
    if (!user?.playerid) return false;

    const config = readConfig();
    const whitelist = [
        ...(config.general?.whitelist || []),
        ...(config.bots || []).flatMap(bot => bot.whitelist || [])
    ].map(name => String(name).toLowerCase());

    return whitelist.includes(String(user.playerid).toLowerCase());
}

module.exports = { hasAdminPermission };
