// link
const { createLinkCode } = require('../../services/linkService');
const { t } = require('../../utils/i18n');
const User = require('../../models/User');

async function execute(bot, command, sender, args) {
    const playeruuid = await bot.MinecraftDataService.getPlayerUuid(sender);
    const user = playeruuid ? User.getByUuid(playeruuid) : null;
    if (user && user.discordid) {
        bot.sendMsg(t('mc.link.alreadyLinked', { sender }));
        return;
    }

    if (!playeruuid) {
        bot.logger.error(`無法解析玩家 UUID: ${sender}`);
        bot.sendMsg(t('mc.command.unexpectedError', { sender }));
        return;
    }

    const code = createLinkCode(playeruuid);

    if (!code) {
        bot.sendMsg(t('mc.link.alreadyLinked', { sender }));
        return;

    } else {
        bot.sendMsg(t('mc.link.getCode', { sender, code }));
    }
}

module.exports = {
    name: 'link',
    description: '綁定 Discord 帳號',
    aliases: ['綁定'],
    execute
}