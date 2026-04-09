const mcBot = require('./core/mcBot');
const DcBot = require('./core/dcBot');
const rl = require('readline');
const Logger = require('./utils/logger');
const { readConfig } = require('./services/configService');
const logger = new Logger('Core', true);
const WsClient = require('./services/authService');
const { version } = require('os');

const consoleInterface = rl.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mcBots = [];
const dcBot = new DcBot();

dcBot.setConsoleRelayHandler((botIndex, content, authorName) => {
    const target = mcBots[botIndex]?.mcClient?.bot;
    if (!target) {
        logger.warn(`Discord 訊息轉發失敗: 找不到 bot #${botIndex + 1}`);
        return;
    }

    target.sendMsg(content);
});

async function start() {
    logger.log('正在啟動 [廢土對賭機器人]')
    const config = readConfig();
    await dcBot.start();

    for (let i = 0; i < config.bots.length; i++) {
        const mc = new mcBot(config.bots[i], i, dcBot);
        const token = config.bots[i].key || '';
        const authService = new WsClient({
            type: 'bet',
            version: '1.0.0.0',
            token: token,
            mcClient: mc,
        });
        const authResult = await authService.authenticate()
        if (authResult) {
            authService.mcClient.start()
            if (authService.mcClient.bot) {
                authService.mcClient.bot.wsClient = authService;
            }
            mcBots.push(authService);
        } else {
            logger.warn(`auth failed for bot ${i+1}`)
        }
    }
}

start()

consoleInterface.on('line', (input) => {
    const message = input.trim().toLowerCase();

    if (message.startsWith('>')) {
        const command = message.slice(1).split(' ')[0];
        const args = message.slice(1).split(' ').slice(1);

        switch (command) {
            case 'stop':
                if (args[0]) {
                    const botIndex = parseInt(args[0]);
                    if (botIndex-1 >= 0 && botIndex-1 < mcBots.length) {
                        mcBots[botIndex-1].stop = true;
                        if (mcBots[botIndex-1].mcClient.bot) {
                            mcBots[botIndex-1].mcClient.bot.end('stop');
                        }
                    } else {
                        logger.warn(`無效的 bot 索引: ${botIndex}`);
                    }
                } else {
                    logger.warn('正在停止所有 bot...');
                    mcBots.forEach(mc => {
                        if (mc.mcClient.bot) {
                            mc.mcClient.bot.end('stop');
                        }
                        mc.stop = true;
                    });
                    consoleInterface.close();
                    process.exit(0);
                }
                break;

            default:
                logger.warn(`未知指令: ${command}`);
        }
    } else {
        // 如果訊息不包含 ":"，則廣播給所有 bot
        if (!message.includes(':')) {
            for (let i = 0; i < mcBots.length; i++) {
                mcBots[i]?.mcClient?.bot?.sendMsg(message);
            }
            return;
        }

        // 輸入訊息給 1 號 bot，格式為 "1: hello world"
        const [botIndexStr, ...messageParts] = message.split(':');
        const botIndex = parseInt(botIndexStr);
        const messageToSend = messageParts.join('').trim();
        if (!mcBots[botIndex - 1]) {
            logger.warn(`無效的 bot 索引: ${botIndex}`);
            return;
        } else if (!messageToSend) {
            logger.warn('請輸入要發送的訊息');
            return;
        } else {
            mcBots[botIndex - 1]?.mcClient?.bot?.sendMsg(messageToSend);
        }
    }
});

// if mcbot triggered end event, restart it after 5 seconds
setInterval(() => {
    mcBots.forEach((mc, index) => {
        if (!mc.mcClient.bot && !mc.mcClient.stop) {
            logger.warn(`[${mc.mcClient.options.username}] 連線已斷開，正在嘗試重新連線...`);
            mc.mcClient.start();
        }
    });
}, 5000);