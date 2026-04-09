// stop
const { t } = require('../../utils/i18n');

async function execute(bot, command, sender, args) {
    bot.sendMsg(t('mc.stop.notice', { sender }));
    setTimeout(() => {
        bot.end('stop');
    }, 5000);
}

module.exports = {
    name: 'stop',
    description: '停止 Bot',
    aliases: ['reload', '停止'],
    requireAdmin: true,
    execute
}