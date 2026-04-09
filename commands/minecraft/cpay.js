// cpay
const { t } = require('../../utils/i18n');

async function execute(bot, command, sender, args) {
    const [target, amount] = args.split(' ');
    if (!target || !amount) {
        bot.sendMsg(t('mc.cpay.usage', { sender, command }));
        return;
    }

    await bot.PayService.pay(target, amount, 'coin')
        .then(() => {
            bot.sendMsg(t('mc.cpay.success', { sender, amount, target }));
        })
        .catch(err => {
            bot.sendMsg(t('mc.cpay.failed', { sender, error: err.message }));
        });
}

module.exports = {
    name: 'cpay',
    description: '轉帳村民錠給其他玩家',
    aliases: [],
    requireAdmin: true,
    execute
};
