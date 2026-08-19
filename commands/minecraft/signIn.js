// signin

const SignIn = require('../../models/SignIn');
const User = require('../../models/User');
const PlayerStats = require('../../models/PlayerStats');
const { t } = require('../../utils/i18n');
const { getBotKeyFromRuntimeBot, normalizeBotKey } = require('../../utils/botKey');
const { withLock } = require('../../utils/lock');

function toRewardAmount(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function parseDailyReward(rawDaily) {
    if (!rawDaily) return { e: 0, c: 0 };
    if (typeof rawDaily === 'object') {
        return {
            e: toRewardAmount(rawDaily.e),
            c: toRewardAmount(rawDaily.c)
        };
    }

    try {
        const parsed = JSON.parse(rawDaily);
        return {
            e: toRewardAmount(parsed?.e),
            c: toRewardAmount(parsed?.c)
        };
    } catch {
        return { e: 0, c: 0 };
    }
}

function getTransferErrorMessage(err) {
    return err?.error?.message || err?.message || t('common.unknownError');
}

function isTransferStateUncertain(err) {
    return err?.error?.code === 'timeout' || err?.code === 'timeout';
}

function isCompletedStatus(status) {
    return ['paid', 'skipped'].includes(status?.e)
        && ['paid', 'skipped'].includes(status?.c);
}

function hasUncertainStatus(status) {
    return status?.e === 'uncertain' || status?.c === 'uncertain';
}

async function resolveSignInReward(bot, user, sender, botName) {
    const normalizedBotName = normalizeBotKey(botName);

    if (user?.discordid && bot.dcBot?.roleSyncService) {
        try {
            const result = await bot.dcBot.roleSyncService.syncDiscordUser(user.discordid, 'signin');
            const botState = result.botStates?.find(state => normalizeBotKey(state.botKey) === normalizedBotName);

            if (botState) {
                const reward = parseDailyReward(botState.dailyReward);
                bot.logger.info(
                    `[signin] 身份組獎勵選擇: ${sender} discord=${user.discordid} bot=${normalizedBotName} `
                    + `guilds=${result.matchedGuilds} mappedRanks=[${(botState.mappedRankIds || []).join(',')}] `
                    + `reward=e:${reward.e},c:${reward.c} (所有身份組加總)`
                );
                return reward;
            }
        } catch (error) {
            bot.logger.warn(
                `[signin] 無法即時取得 Discord 全部身份組，改用目前 DB rank 獎勵: `
                + `${sender} (${user.discordid}) - ${error?.message || error}`
            );
        }
    }

    const stats = PlayerStats.get(user.playeruuid, normalizedBotName);
    return parseDailyReward(stats?.daily);
}

async function execute(bot, command, sender, args) {
    const botName = getBotKeyFromRuntimeBot(bot);
    const playeruuid = await bot.MinecraftDataService.getPlayerUuid(sender);
    const user = playeruuid ? User.getByUuid(playeruuid) : null;
    if (!user) {
        bot.logger.error(`找不到玩家 ${sender} 的使用者資料`);
        return;
    }

    return withLock(`money:${botName}:${playeruuid}`, async () => {
        let claimRecord = SignIn.getTodayRecord(playeruuid, botName);
        let claim = claimRecord ? SignIn.parseRewardAmount(claimRecord.rewardAmount) : null;

        if (claimRecord && !claim?.status) {
            bot.sendMsg(t('mc.signin.alreadySigned', { sender, botName }));
            return;
        }

        if (!claimRecord) {
            const reward = await resolveSignInReward(bot, user, sender, botName);

            if (reward.e <= 0 && reward.c <= 0) {
                bot.sendMsg(t('mc.signin.noReward', { sender }));
                return;
            }

            claimRecord = SignIn.createClaim(playeruuid, botName, reward);
            claim = SignIn.parseRewardAmount(claimRecord.rewardAmount);
            bot.logger.info(
                `[signin] 建立簽到 claim: ${sender} (${playeruuid}) bot=${botName} `
                + `reward=${JSON.stringify({ e: claim.e, c: claim.c })}`
            );
        }

        claim.status = claim.status || {
            e: Number(claim.e || 0) > 0 ? 'pending' : 'skipped',
            c: Number(claim.c || 0) > 0 ? 'pending' : 'skipped'
        };
        claim.errors = claim.errors || { e: null, c: null };

        let repairedProcessingState = false;
        for (const key of ['e', 'c']) {
            if (claim.status[key] === 'processing') {
                claim.status[key] = 'uncertain';
                claim.errors[key] = '付款結果不確定，請聯絡管理員確認';
                repairedProcessingState = true;
            }
        }
        if (repairedProcessingState) {
            SignIn.updateClaim(claimRecord.id, claim);
        }

        if (isCompletedStatus(claim.status)) {
            bot.sendMsg(t('mc.signin.alreadySigned', { sender, botName }));
            return;
        }

        const payoutErrors = { e: null, c: null };

        const payCurrency = async (key, currency, amount) => {
            if (!['pending', 'failed'].includes(claim.status[key])) {
                return;
            }

            claim.status[key] = 'processing';
            claim.errors[key] = null;
            SignIn.updateClaim(claimRecord.id, claim);

            try {
                await bot.PayService.pay(sender, amount, currency);
                claim.status[key] = 'paid';
                claim.errors[key] = null;
                SignIn.updateClaim(claimRecord.id, claim);
                bot.logger.info(`[signin] 簽到付款成功: ${sender} ${amount} ${currency} bot=${botName}`);
            } catch (err) {
                const message = getTransferErrorMessage(err);
                const uncertain = isTransferStateUncertain(err);

                claim.status[key] = uncertain ? 'uncertain' : 'failed';
                claim.errors[key] = uncertain
                    ? `付款結果不確定: ${message}`
                    : message;
                payoutErrors[key] = err;
                SignIn.updateClaim(claimRecord.id, claim);

                bot.logger.error(
                    `[${botName}] 發放簽到獎勵 ${amount} ${currency} 給 ${sender} `
                    + `失敗 (${claim.status[key]}): ${message}`
                );
            }
        };

        if (Number(claim.e || 0) > 0) {
            await payCurrency('e', 'emerald', Number(claim.e));
        }

        if (Number(claim.c || 0) > 0) {
            await payCurrency('c', 'coin', Number(claim.c));
        }

        const signInData = SignIn.getSignInData(playeruuid, botName);
        const streakMsg = t('mc.signin.streak', { streak: signInData.streak, total: signInData.total });

        if (isCompletedStatus(claim.status)) {
            bot.sendMsg(t('mc.signin.success', { sender, streakMsg }));
            return;
        }

        const errorParts = [];
        if (!['paid', 'skipped'].includes(claim.status.e)) {
            const error = claim.errors.e || getTransferErrorMessage(payoutErrors.e);
            errorParts.push(t('mc.signin.emeraldFail', { error: String(error).slice(0, 30) }));
        }
        if (!['paid', 'skipped'].includes(claim.status.c)) {
            const error = claim.errors.c || getTransferErrorMessage(payoutErrors.c);
            errorParts.push(t('mc.signin.coinFail', { error: String(error).slice(0, 30) }));
        }

        if (hasUncertainStatus(claim.status)) {
            bot.logger.warn(
                `[signin] ${sender} 有付款結果不確定的簽到 claim，為避免重複付款已停止自動重試: `
                + `claim=${claimRecord.id}`
            );
        }

        bot.sendMsg(t('mc.signin.partialError', { sender, streakMsg, errors: errorParts.join('，') }));
    });
}

module.exports = {
    name: 'signIn',
    description: '簽到',
    aliases: ['daily', '簽到'],
    execute
};
