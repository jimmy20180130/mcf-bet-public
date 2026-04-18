const Vec3 = require('vec3');
const Item = require('prismarine-item');
const BetRecord = require('../models/BetRecord');
const User = require('../models/User');
const PlayerStats = require('../models/PlayerStats');
const Decimal = require('decimal.js');
const { t } = require('../utils/i18n');
const { getBotKeyFromRuntimeBot } = require('../utils/botKey');

class BetService {
    /**
        @param {mineflayer.Bot} bot
    **/
    constructor(bot, betConfigProvider = null) {
        this.bot = bot;
        this.betConfigProvider = typeof betConfigProvider === 'function' ? betConfigProvider : null;
        this.defaultBetConfig = {
            eodds: 1.85,
            codds: 1.85,
            emin: 1,
            emax: 1000000,
            cmin: 1,
            cmax: 10
        };
        this.queue = [];
        this.isProcessing = false;
    }

    _getCurrentBetConfig() {
        if (!this.betConfigProvider) {
            return { ...this.defaultBetConfig };
        }

        try {
            const nextConfig = this.betConfigProvider();
            return {
                eodds: Number(nextConfig?.eodds ?? this.defaultBetConfig.eodds),
                codds: Number(nextConfig?.codds ?? this.defaultBetConfig.codds),
                emin: Number(nextConfig?.emin ?? this.defaultBetConfig.emin),
                emax: Number(nextConfig?.emax ?? this.defaultBetConfig.emax),
                cmin: Number(nextConfig?.cmin ?? this.defaultBetConfig.cmin),
                cmax: Number(nextConfig?.cmax ?? this.defaultBetConfig.cmax)
            };
        } catch {
            return { ...this.defaultBetConfig };
        }
    }

    async addBet(playerid, amount, currency) {
        return await new Promise((resolve, reject) => {
            this.queue.push({ playerid, amount, currency, resolve, reject });
            this._execute();
        });
    }

    async _execute() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        const task = this.queue.shift();
        const { playerid, amount, currency, resolve, reject } = task;

        try {
            this.bot.logger.info(`準備處理任務: ${playerid} ${amount} ${currency} (剩餘任務: ${this.queue.length})`);

            let playeruuid = await this.bot.MinecraftDataService.getPlayerId(playerid);
            if (!playeruuid) {
                const user = User.getByPlayerId(playerid);
                if (user) playeruuid = user.playeruuid;
            }

            if (!playeruuid) return;

            // create user if not exist
            User.create({ playeruuid, playerid });

            const botKey = getBotKeyFromRuntimeBot(this.bot);
            const stats = PlayerStats.get(playeruuid, botKey);
            const betConfig = this._getCurrentBetConfig();
            let odds = currency == 'emerald' ? new Decimal(betConfig.eodds) : new Decimal(betConfig.codds);
            let bonusodds = new Decimal(stats?.bonusodds || 0);
            let payout = odds.plus(bonusodds).times(amount).floor();

            const result = await this._performBet(playerid, amount, currency, odds, bonusodds);

            const recordResult = result.outcome === 'win' ? payout.toNumber() : 0;

            const betRecordUuid = BetRecord.create({
                playeruuid,
                bot: botKey,
                playerid,
                currency,
                amount,
                result: recordResult,
                odds: odds.toNumber(),
                bonusodds: bonusodds.toNumber()
            });

            // resolve({ success: true, target, amount, currency, outcome: 'lose' });
            result.bonusOdds = bonusodds.toNumber();
            result.odds = odds.toNumber();
            result.returnAmount = recordResult;

            resolve(result);

        } catch (err) {
            if (err.errType) {
                this.bot.logger.error(`任務失敗 (類型: ${err.errType}): ${err.error.message}`);
                reject(err);
            } else {
                this.bot.logger.error(`任務失敗: ${err.message}`);
                reject({ success: false, target: playerid, amount, currency, errType: 'unknown', error: new Error(err.message) });
            }

        } finally {
            await new Promise(r => setTimeout(r, 500));
            this.isProcessing = false;
            this._execute();
        }
    }

    _performBet(target, amount, currency, odds, bonusodds) {
        return new Promise(async (resolve, reject) => {
            try {
                await this._clickRedstoneDust()
            } catch (err) {
                reject({ success: false, target, amount, currency, errType: 'click', error: new Error(err.message) });
                return;
            }

            const minecraftData = require('minecraft-data')(this.bot.version);

            let spawnResult;
            try {
                spawnResult = await this._waitItemSpawn({
                    [minecraftData.itemsByName['white_wool'].id]: 'win',
                    [minecraftData.itemsByName['black_wool'].id]: 'lose'
                }, 5000);
            } catch (err) {
                if (err.data === 'timeout') {
                    const timeoutError = new Error(t('service.betService.spawnTimeout'));
                    timeoutError.code = 'spawnTimeout';
                    reject({ success: false, target, amount, currency, errType: 'spawn', error: timeoutError });
                } else {
                    const spawnError = new Error(t('service.betService.spawnFailed', { reason: err.data }));
                    spawnError.code = 'spawnError';
                    reject({ success: false, target, amount, currency, errType: 'spawn', error: spawnError });
                }
                return;
            }

            if (spawnResult.data === 'win') {
                let totalOdds = odds.plus(bonusodds);
                let payout = totalOdds.times(amount).floor();

                if (currency === 'coin') {
                    this.bot.sendMsg(t('service.betService.cwinCommand', {
                        time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
                        target,
                        payout: payout.toNumber(),
                        currency: '村民錠',
                        odds: totalOdds.toFixed(2),
                    }));
                } else {
                    this.bot.sendMsg(t('service.betService.ewinCommand', {
                        time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
                        target, 
                        payout: payout.toNumber(),
                        currency: '綠寶石',
                        odds: totalOdds.toFixed(2),
                    }));
                }

                try {
                    await this.bot.PayService.pay(target, payout.toNumber(), currency)
                } catch (err) {
                    reject({ success: false, target, amount, currency, errType: 'pay', error: err.error });
                    return;
                }

                resolve({ success: true, target, amount, currency, outcome: 'win' });

            } else if (spawnResult.data === 'lose') {
                if (currency === 'coin') {
                    this.bot.sendMsg(t('service.betService.closeCommand', { time: new Date().toLocaleTimeString('zh-TW', { hour12: false }), target, amount, currency: '村民錠' }));
                } else {
                    this.bot.sendMsg(t('service.betService.eloseCommand', { time: new Date().toLocaleTimeString('zh-TW', { hour12: false }), target, amount, currency: '綠寶石' }));
                }
                resolve({ success: true, target, amount, currency, outcome: 'lose' });
            }
        });
    }

    _clickRedstoneDust(block = null) {
        return new Promise(async (resolve, reject) => {
            block = block || this.bot.findBlock({
                matching: block => block.name === 'redstone_wire',
                maxDistance: 4
            });

            if (!block) {
                const error = new Error(t('service.betService.redstoneNotFound'));
                error.code = 'redstoneNotFound';
                reject(error);
                return;
            }

            function vectorToDirection(v) {
                if (v.y < 0) {
                    return 0;
                } else if (v.y > 0) {
                    return 1;
                } else if (v.z < 0) {
                    return 2;
                } else if (v.z > 0) {
                    return 3;
                } else if (v.x < 0) {
                    return 4;
                } else if (v.x > 0) {
                    return 5;
                }
            }

            const direction = new Vec3(0, 1, 0);
            const directionNum = vectorToDirection(direction);
            const cursorPos = new Vec3(0.5, 0.5, 0.5);

            if (this.bot.supportFeature('blockPlaceHasHeldItem')) {
                this.bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    heldItem: Item.toNotch(this.bot.heldItem),
                    cursorX: cursorPos.scaled(16).x,
                    cursorY: cursorPos.scaled(16).y,
                    cursorZ: cursorPos.scaled(16).z
                });
            } else if (this.bot.supportFeature('blockPlaceHasHandAndIntCursor')) {
                this.bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    hand: 0,
                    cursorX: cursorPos.scaled(16).x,
                    cursorY: cursorPos.scaled(16).y,
                    cursorZ: cursorPos.scaled(16).z
                });
            } else if (this.bot.supportFeature('blockPlaceHasHandAndFloatCursor')) {
                this.bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    hand: 0,
                    cursorX: cursorPos.x,
                    cursorY: cursorPos.y,
                    cursorZ: cursorPos.z
                });
            } else if (this.bot.supportFeature('blockPlaceHasInsideBlock')) {
                this.bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    hand: 0,
                    cursorX: cursorPos.x,
                    cursorY: cursorPos.y,
                    cursorZ: cursorPos.z,
                    insideBlock: false
                });
            } else {
                const error = new Error(t('service.betService.unsupportedVersion'));
                error.code = 'unsupportedVersion';
                reject(error);
                return;
            }

            resolve();
        });
    }

    /**
     * 等待指定物品 ID 生成，並在生成後回傳生成了什麼東西
     * @param {Object.<string, any>} data - 物品 ID 和對應數據的對象
     * @param {number} timeout - 超時時間，預設為 10000 毫秒
     * @returns {Promise<{result: number, data: any}>} 成功為 {result: 0, data: 對應數據}，失敗為 {result: 1, data: 錯誤訊息}
     */
    _waitItemSpawn(data, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const listener = async (entity) => {
                try {
                    const itemId = JSON.parse(JSON.stringify(entity.metadata[0].value)).itemId;
                    if (!itemId) return;
                    if (Object.keys(data).includes(itemId.toString())) {
                        clearTimeout(timer);
                        this.bot._client.removeListener('entity_metadata', listener);
                        resolve({
                            result: 0,
                            data: data[itemId]
                        });
                    }
                } catch (e) {
                    clearTimeout(timer);
                    this.bot._client.removeListener('entity_metadata', listener);
                    reject({
                        result: 1,
                        data: e.message || 'unknown'
                    });
                }
            };

            this.bot._client.on('entity_metadata', listener);

            const timer = setTimeout(() => {
                this.bot._client.removeListener('entity_metadata', listener);
                reject({
                    result: 1,
                    data: 'timeout'
                });
            }, timeout);
        });
    }
}

module.exports = BetService;