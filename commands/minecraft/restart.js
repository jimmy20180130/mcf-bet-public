// restart
const { t } = require('../../utils/i18n');

async function execute(bot, command, sender, args) {
    bot.sendMsg(t('mc.restart.notice', { sender }));
    setTimeout(() => {
        bot.end('restart');
    }, 5000);
}

module.exports = {
    name: 'restart',
    description: '重新啟動 Bot',
    aliases: ['reload', '重新啟動'],
    requireAdmin: true,
    execute
}