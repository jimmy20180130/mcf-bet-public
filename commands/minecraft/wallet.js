// wallet
const User = require('../../models/User');
const PlayerStats = require('../../models/PlayerStats');
const { t } = require('../../utils/i18n');
const { getBotKeyFromRuntimeBot } = require('../../utils/botKey');
const { withLock } = require('../../utils/lock');

async function execute(bot, command, sender, args) {
    const playeruuid = await bot.MinecraftDataService.getPlayerUuid(sender);
    const user = playeruuid ? User.getByUuid(playeruuid) : null;

    if (!user) {
        bot.logger.error(`找不到玩家 ${sender} 的使用者資料`);
        return;
    }

    const botName = getBotKeyFromRuntimeBot(bot);

    return withLock(`money:${botName}:${playeruuid}`, async () => {
        const stats = PlayerStats.get(playeruuid, botName);

        if (!stats) {
            bot.sendMsg(t('mc.wallet.noBalance', { sender }));
            return;
        }

        const userEWallet = stats.emerald || 0;
        const userCWallet = stats.coin || 0;

        bot.logger.debug(`${sender} 在 ${botName} 的 eWallet: ${userEWallet}, cWallet: ${userCWallet}`);

        if (userEWallet > 0) {
            // 先扣款再付款；付款失敗時補回餘額。整段在鎖內執行，確保不會被另一個 wallet 並行重複領取。
            PlayerStats.updateWallet(playeruuid, botName, { eChange: -userEWallet });
            await bot.PayService.pay(sender, userEWallet, 'emerald')
                .then(() => {
                    bot.logger.debug(`${sender} 已成功領取 ${userEWallet} 綠寶石`);
                })
                .catch((err) => {
                    PlayerStats.updateWallet(playeruuid, botName, { eChange: userEWallet });
                    const errorMsg = err.error?.message || t('common.unknownError');
                    bot.sendMsg(t('mc.wallet.emeraldFailed', { sender, error: errorMsg }));
                    bot.logger.error(`${sender} 領取綠寶石失敗: ${errorMsg}`);
                });
        }

        if (userCWallet > 0) {
            PlayerStats.updateWallet(playeruuid, botName, { cChange: -userCWallet });
            await bot.PayService.pay(sender, userCWallet, 'coin')
                .then(() => {
                    bot.logger.debug(`${sender} 已成功領取 ${userCWallet} 村民錠`);
                })
                .catch((err) => {
                    PlayerStats.updateWallet(playeruuid, botName, { cChange: userCWallet });
                    const errorMsg = err.error?.message || t('common.unknownError');
                    bot.sendMsg(t('mc.wallet.coinFailed', { sender, error: errorMsg }));
                    bot.logger.error(`${sender} 領取村民錠失敗: ${errorMsg}`);
                });
        }

        if (userEWallet <= 0 && userCWallet <= 0) {
            bot.sendMsg(t('mc.wallet.noBalance', { sender }));
        }
    });
}

module.exports = {
    name: 'wallet',
    description: '領取錢包內的餘額',
    aliases: ['領錢', '領取'],
    execute
}