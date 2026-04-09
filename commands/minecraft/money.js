// money
const { t } = require('../../utils/i18n');

function getAllText(node) {
    let text = node.text || "";
    if (node.extra) {
        for (const child of node.extra) {
            text += getAllText(child);
        }
    }
    return text;
}

function addCommas(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function execute(bot, command, sender, args) {
    const headerData = bot.tablist.header;
    if (!headerData) {
        return bot.sendMsg(t('mc.money.unavailable'));
    }

    const fullTabText = getAllText(headerData);
    
    // 綠寶石 ＄13,981,583元
    // 村民錠 16個
    const emeraldMatch = fullTabText.match(/綠寶石.*?＄([\d,]+)元/);
    const coinMatch = fullTabText.match(/村民錠\s*?(\d+)個/);

    let emerald = emeraldMatch 
        ? addCommas(parseInt(emeraldMatch[1].replace(/,/g, ""))) 
        : t('mc.money.unavailable');

    let coin = coinMatch 
        ? addCommas(parseInt(coinMatch[1])) 
        : t('mc.money.unavailable');

    bot.sendMsg(t('mc.money.summary', { sender, emerald, coin }));
    bot.logger.debug(`${sender} 查詢餘額: ${emerald} 綠寶石, ${coin} 村民錠`);
}

module.exports = {
    name: 'money',
    description: '查看目前 Bot 的餘額 (支援廢土伺服器)',
    aliases: ['bal', 'money'],
    requireAdmin: true,
    execute
};