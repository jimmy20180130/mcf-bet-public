// deposit
const { t } = require('../../utils/i18n');

async function execute(bot, command, sender, args) {
    //bot.depositMode = [{playerid: sender, expiresAt: Date.now() + 20000}];
    if (bot.depositMode.find(m => m.playerid === sender)) {
        bot.depositMode = bot.depositMode.filter(m => m.playerid !== sender);
        bot.sendMsg(t('mc.deposit.cancel', { sender }));
        bot.logger.debug(`${sender} exited deposit mode`);
        return;
    }

    bot.depositMode.push({ playerid: sender, expiresAt: Date.now() + 20 * 1000 });

    bot.sendMsg(t('mc.deposit.instruction', { sender }));
    bot.logger.debug(`${sender} entered deposit mode`);
}

module.exports = {
    name: 'deposit',
    description: '存放資金到 Bot',
    aliases: ['dep', 'donate', '放入', '存入'],
    execute
}