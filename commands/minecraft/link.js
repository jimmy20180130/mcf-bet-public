// link
const { createLinkCode } = require('../../services/linkService');
const { t } = require('../../utils/i18n');
const User = require('../../models/User');

async function execute(bot, command, sender, args) {
    const user = User.getByPlayerId(sender);
    if (user && user.discordid) {
        bot.sendMsg(t('mc.link.alreadyLinked', { sender }));
        return;
    }

    const code = createLinkCode(sender);

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