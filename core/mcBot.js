const mineflayer = require('mineflayer');
const Logger = require('../utils/logger');
const PayService = require('../services/payService');
const BetService = require('../services/betService');
const ErrorHandler = require('../services/errorHandler');
const mcCommandHandler = require('../commands/minecraft/index');
const MinecraftDataService = require('../services/minecraftDataService');
const { readConfig } = require('../services/configService');
const { t } = require('../utils/i18n');
const { getBotKeyFromConfigBot, findConfigBotByKey } = require('../utils/botKey');

class mcBot {
    constructor(options, dcBot) {
        this.bot = null;
        this.dcBot = dcBot;
        this.botKey = getBotKeyFromConfigBot(options);
        this.options = {
            username: options.username || 'mcf-bet-bot',
            host: options.host || 'mcfallout.net',
            auth: 'microsoft',
            version: '1.21.4'
        };
        this.chatQueue = [];
        this.autoMessageTimer = null;
        this.autoMessageCursor = 0;
    }

    _getCurrentBotConfig() {
        const config = readConfig();
        return findConfigBotByKey(config?.bots || [], this.botKey);
    }

    _getCurrentBetConfig() {
        const botConfig = this._getCurrentBotConfig();

        return {
            eodds: Number(botConfig?.eodds ?? 1.85),
            codds: Number(botConfig?.codds ?? 1.85),
            emin: Number(botConfig?.emin ?? 1),
            emax: Number(botConfig?.emax ?? 1000000),
            cmin: Number(botConfig?.cmin ?? 1),
            cmax: Number(botConfig?.cmax ?? 10)
        };
    }

    _getCurrentAutoMessages() {
        const botConfig = this._getCurrentBotConfig();
        const rawMessages = Array.isArray(botConfig?.autoMessages) ? botConfig.autoMessages : [];

        return rawMessages
            .map((entry) => ({
                message: typeof entry?.message === 'string' ? entry.message.trim() : '',
                waitSeconds: Number(entry?.waitSeconds)
            }))
            .filter(entry => entry.message.length > 0 && Number.isFinite(entry.waitSeconds) && entry.waitSeconds >= 1);
    }

    start() {
        this.bot = mineflayer.createBot(this.options);
        this.bot.botKey = this.botKey;
        this.bot.logger = new Logger(`${this.options.username}`, true);
        this.bot.nick = this.options.username;
        this.bot.PayService = new PayService(this.bot);
        this.bot.BetService = new BetService(this.bot, () => this._getCurrentBetConfig());
        this.bot.ErrorHandler = new ErrorHandler(this.bot);
        this.bot.MinecraftDataService = MinecraftDataService;
        this.bot.sendMsg = this.sendMsg.bind(this);
        this.bot.depositMode = []; // bot.depositMode = [{playerid: sender, expiresAt: Date.now() + 20000}];
        this.bot.on('login', this._onLogin.bind(this));
        this.bot.on('spawn', this._onSpawn.bind(this));
        this.bot.on('message', this._onMessage.bind(this));
        this.bot.on('error', this._onError.bind(this));
        this.bot.on('kicked', this._onKicked.bind(this));
        this.bot.on('end', this._onEnd.bind(this));
    }

    sendMsg(message) {
        this.chatQueue.push(message);
        if (this.chatQueue.length === 1) {
            this._processChatQueue();
        }
    }

    async _processChatQueue() {
        if (this.chatQueue.length === 0 || !this.bot) return;
        const message = this.chatQueue[0];
        const botConfig = this._getCurrentBotConfig();

        try {
            this.bot.chat(message);
            if (botConfig?.consoleChannelID) {
                this.dcBot.sendMsg(botConfig.consoleChannelID, message);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.chatQueue.shift();
            this._processChatQueue();
        } catch (err) {
            this.bot.logger.error(`發送訊息失敗: ${message}，錯誤: ${err}`);
            this.chatQueue.shift();
            this._processChatQueue();
        }
    }

    _onLogin() {
        this.bot.logger.log(`已登入伺服器 ${this.options.host}`);
    }

    _onSpawn() {
        // 在 spawn 事件觸發後才能 addChatPattern
        this._addChatPatterns();
        this._startAutoMessageLoop();
    }

    _onMessage(message) {
        const botConfig = this._getCurrentBotConfig();
        this.bot.logger.info(message.toAnsi());
        try {
            if (botConfig?.consoleChannelID) {
                this.dcBot.sendMsg(botConfig.consoleChannelID, message.toString());
            }
        } catch (err) {
            this.bot.logger.error(`轉發訊息到 Discord 失敗: ${message.toAnsi()}，錯誤: ${err}`);
        }
    }

    _onError(err) {
        this.bot.logger.error(`遇到錯誤: ${err}`);
        if (err.message.includes('Failed to obtain profile data')) {
            this.bot = null
        }
    }

    _onKicked(reason) {
        this.bot.logger.warn(`被踢出伺服器: ${reason.reason}`);
        try {
            this.bot.end(reason.reason);
        } catch (err) { }
    }

    _onEnd(reason) {
        this._stopAutoMessageLoop();

        if (reason == 'stop') {
            this.stop = true;
            this.bot.logger.warn(`Bot 已停止`);
            this.bot = null;
            return;
        } else if (reason == 'restart') {
            this.bot.logger.warn(`Bot 正在重新啟動`);
            this.bot = null;
        } else {
            this.bot.logger.warn(`連線已結束`);
            this.bot = null;
        }

    }

    _addChatPatterns() {
        const chatPatterns = [
            { name: 'command', regex: /^\[([A-Za-z0-9_]+) -> 您\] ([\p{L}\p{N}_]+)\s*(.*)$/u, handler: '_handleCommand' },
            { name: 'getEmerald', regex: /^\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/, handler: '_handleGetEmerald' },
            { name: 'getCoin', regex: /^\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/, handler: '_handleGetCoin' },
            { name: 'tpRequest', regex: /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置|^\[系統\] (\w+) 想要傳送到 你 的位置/, handler: '_handleTpRequest' },
            // { name: 'epayProcessing', regex: new RegExp(`^\[系統\] 正在處理您的其他請求, 請稍後`), handler: '_handleEpayProcessing' },
            // { name: 'epayNoMoney', regex: /^\[系統\] 綠寶石不足, 尚需(.+)$/, handler: '_handleEpayNoMoney' },
            // { name: 'epayNotSamePlace', regex: /^\[系統\] 只能轉帳給同一分流的線上玩家\. 請檢查對方的ID與所在分流(.*)/, handler: '_handleEpayNotSamePlace' },
            // { name: 'epaySuccess', regex: /^\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/, handler: '_handleEpaySuccess' },
            // { name: 'epayNegative', regex: new RegExp(`^\[系統\] 轉帳金額需為正數`), handler: '_handleEpayNegative' },
            // /^[系統] 轉帳成功! (使用了 (d{1,3}(,d{3})*|d+) 村民錠, 剩餘 (d{1,3}(,d{3})*|d+) )/
            // { name: 'cpaySuccess', regex: /^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/, handler: '_handleCpaySuccess' },
            // { name: 'cpayDifferentName', regex: new RegExp(`^\[系統\] 兩次所輸入的玩家名稱不一致!`), handler: '_handleCpayDifferentName' },
            // { name: 'cpayNoMoney', regex: /^\[系統\] 村民錠不足, 尚需 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前剩餘 (\d{1,3}(,\d{3})*|\d+) \)/, handler: '_handleCpayNoMoney' },
            // { name: 'generalCannotSend', regex: new RegExp(`^\[系統\] 無法傳送訊息`), handler: '_handleGeneralCannotSend' }
            // { name: 'epayInstructions', regex: new RegExp(`^指令格式: /pay 玩家ID 綠寶石金額`), handler: '_handleEpayInstructions' }
        ]

        chatPatterns.forEach(({ name, regex, handler }) => {
            this.bot.addChatPattern(name, regex);

            if (this[handler]) {
                this.bot.on(`chat:${name}`, (matches) => {
                    this[handler](matches);
                });
            } else {
                this.bot.logger.warn(`跳過訊息格式 ${name}: 無法找到處理該訊息格式的函式 ${handler}`);
            }
        });
    }

    _startAutoMessageLoop() {
        this._stopAutoMessageLoop();
        this.autoMessageCursor = 0;
        this._scheduleNextAutoMessage(1000);
    }

    _stopAutoMessageLoop() {
        if (this.autoMessageTimer) {
            clearTimeout(this.autoMessageTimer);
            this.autoMessageTimer = null;
        }
    }

    _scheduleNextAutoMessage(delayMs) {
        this._stopAutoMessageLoop();

        this.autoMessageTimer = setTimeout(() => {
            if (!this.bot) {
                return;
            }

            const autoMessages = this._getCurrentAutoMessages();
            if (autoMessages.length === 0) {
                this._scheduleNextAutoMessage(15000);
                return;
            }

            const currentIndex = this.autoMessageCursor % autoMessages.length;
            const current = autoMessages[currentIndex];
            this.autoMessageCursor = currentIndex + 1;

            this.sendMsg(current.message);
            this._scheduleNextAutoMessage(current.waitSeconds * 1000);
        }, Math.max(1000, Number(delayMs) || 1000));
    }

    _handleCommand(matches) {
        // matches: [ "[Jimmy4Real -> 您] epay Jimmy4Real 100" ]
        matches = /^\[([A-Za-z0-9_]+) -> 您\] ([\p{L}\p{N}_]+)\s*(.*)$/u.exec(matches[0]);
        const [, sender, command, args] = matches;
        this.bot.logger.debug(`收到指令: ${command} 參數: ${args} 來自: ${sender}`);
        mcCommandHandler.executeCommand(this.bot, sender, command, args);
    }

    async _handleGetEmerald(matches) {
        matches = /^\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/.exec(matches[0]);
        let [, sender, amount, , , current] = matches;
        amount = parseInt(amount.replace(/,/g, ''));
        current = parseInt(current.replace(/,/g, ''));
        this.bot.logger.debug(`收到綠寶石轉帳: ${amount} 綠寶石 來自: ${sender} 目前擁有: ${current} 綠寶石`);

        if (this.bot.depositMode.find(m => m.playerid === sender)) {
            this.bot.depositMode = this.bot.depositMode.filter(m => m.playerid !== sender);
            this.bot.sendMsg(t('mc.deposit.receivedEmerald', { sender, amount }));
            this.bot.logger.debug(`${sender} exited deposit mode`);
            return;
        }

        await this.bot.BetService.addBet(sender, amount, 'emerald')
            .then(async (result) => {
                // { success: true, target, amount, currency }
                const botConfig = this._getCurrentBotConfig();
                if (botConfig?.betRecordChannelID) {
                    await this.dcBot.sendBetRecordEmbed(botConfig.betRecordChannelID, result.target, result.currency, result.amount, result.returnAmount, result.odds, result.bonusOdds, result.isWin, this.bot.username);
                }

                this.bot.logger.debug(`已完成下注紀錄: ${result.amount} ${result.currency} 來自: ${result.target}`);
            })
            .catch(async (err) => {
                // { success: false, target, amount, currency, errType: 'spawn', error: err }
                if (!err?.errType) {
                    err = {
                        success: false,
                        target: sender,
                        amount,
                        currency: 'emerald',
                        errType: 'unknown',
                        error: err
                    }
                }

                await this.bot.ErrorHandler.handleBetError(err);
            });
    }

    async _handleGetCoin(matches) {
        matches = /^\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/.exec(matches[0]);
        let [, sender, amount, , current] = matches;
        amount = parseInt(amount.replace(/,/g, ''));
        current = parseInt(current.replace(/,/g, ''));
        this.bot.logger.debug(`收到村民錠轉帳: ${amount} 村民錠 來自: ${sender} 目前擁有: ${current} 村民錠`);

        if (this.bot.depositMode.find(m => m.playerid === sender)) {
            this.bot.depositMode = this.bot.depositMode.filter(m => m.playerid !== sender);
            this.bot.sendMsg(t('mc.deposit.receivedCoin', { sender, amount }));
            this.bot.logger.debug(`${sender} exited deposit mode`);
            return;
        }

        await this.bot.BetService.addBet(sender, amount, 'coin')
            .then(async (result) => {
                // { success: true, target, amount, currency }
                const botConfig = this._getCurrentBotConfig();
                if (botConfig?.betRecordChannelID) {
                    await this.dcBot.sendBetRecordEmbed(botConfig.betRecordChannelID, result.target, result.currency, result.amount, result.returnAmount, result.odds, result.bonusOdds, result.isWin, this.bot.username);
                }

                this.bot.logger.debug(`已完成下注紀錄: ${result.amount} ${result.currency} 來自: ${result.target}`);
            })
            .catch(async (err) => {
                // { success: false, target, amount, currency, errType: 'spawn', error: err }
                if (!err?.errType) {
                    err = {
                        success: false,
                        target: sender,
                        amount,
                        currency: 'coin',
                        errType: 'unknown',
                        error: err
                    }
                }

                await this.bot.ErrorHandler.handleBetError(err);
            });
    }

    _handleTpRequest(matches) {
        matches = /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置|^\[系統\] (\w+) 想要傳送到 你 的位置/.exec(matches[0]);
        const sender = matches[1] || matches[2];
        this.bot.logger.debug(`收到傳送請求來自: ${sender}`);
    }
}

module.exports = mcBot;