const { Collection } = require('discord.js');
const { readConfig } = require('./configService');
const Rank = require('../models/Rank');
const User = require('../models/User');
const PlayerStats = require('../models/PlayerStats');
const { normalizeBotKey, getBotKeyFromConfigBot } = require('../utils/botKey');

const RECONCILE_INTERVAL_MS = 10 * 60 * 1000;

function toRewardAmount(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

class RoleSyncService {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
        this.fullScanPromise = null;

        this.reconcileTimer = setInterval(() => {
            if (!this.client.isReady()) return;
            void this.fullScanAllGuilds('periodic');
        }, RECONCILE_INTERVAL_MS);
        this.reconcileTimer.unref?.();
    }

    _pickTargetRank(mappedRanks) {
        if (!mappedRanks || mappedRanks.length === 0) {
            return null;
        }

        return [...mappedRanks]
            .sort((a, b) => {
                const bonusDiff = Number(b.bonusodds || 0) - Number(a.bonusodds || 0);
                if (bonusDiff !== 0) return bonusDiff;
                return Number(a.id) - Number(b.id);
            })[0];
    }

    _getDailyReward(rank) {
        return {
            e: toRewardAmount(rank?.daily?.e),
            c: toRewardAmount(rank?.daily?.c)
        };
    }

    // 玩家身上的每個身份組都算，獎勵與加成一律加總
    _sumDailyReward(ranks) {
        return (ranks || []).reduce((total, rank) => {
            const reward = this._getDailyReward(rank);
            return { e: total.e + reward.e, c: total.c + reward.c };
        }, { e: 0, c: 0 });
    }

    _sumBonusOdds(ranks) {
        return (ranks || []).reduce((total, rank) => total + Number(rank?.bonusodds || 0), 0);
    }

    _buildBotState(botKey, roleIds) {
        const normalizedBotKey = normalizeBotKey(botKey);
        const defaultRank = Rank.ensureDefaultForBot(normalizedBotKey);
        const ranks = Rank.getByBot(normalizedBotKey);

        const mappedRanks = ranks.filter(rank => {
            const discordRoleId = String(rank.discordid || '').trim();
            return discordRoleId && roleIds.has(discordRoleId);
        });

        const effectiveRanks = mappedRanks.length > 0 ? mappedRanks : [defaultRank];
        // targetRank 只拿來顯示 (加成最高的那個)，實際加成/獎勵走加總
        const targetRank = this._pickTargetRank(mappedRanks) || defaultRank;

        return {
            botKey: normalizedBotKey,
            ranks,
            mappedRanks,
            targetRank,
            bonusOdds: this._sumBonusOdds(effectiveRanks),
            dailyReward: this._sumDailyReward(effectiveRanks)
        };
    }

    async _collectDiscordRoleSnapshot(discordId) {
        const roleIds = new Set();
        let matchedGuilds = 0;

        if (!discordId || !this.client.isReady()) {
            return { roleIds, matchedGuilds, reason: 'client-not-ready' };
        }

        for (const guild of this.client.guilds.cache.values()) {
            try {
                const member = guild.members.cache.get(discordId)
                    || await guild.members.fetch(discordId).catch(() => null);

                if (!member) continue;

                matchedGuilds += 1;
                for (const roleId of member.roles?.cache?.keys?.() || []) {
                    roleIds.add(String(roleId));
                }
            } catch (error) {
                this.logger.warn(`讀取 Discord 身份組失敗 (discordId=${discordId}, guild=${guild.id}):`, error?.message || error);
            }
        }

        return {
            roleIds,
            matchedGuilds,
            reason: matchedGuilds > 0 ? 'ok' : 'member-not-found'
        };
    }

    _syncLinkedUserFromSnapshot(user, roleIds, matchedGuilds, trigger) {
        const config = readConfig();
        const bots = config?.bots || [];
        const botStates = [];
        let updated = 0;

        for (const bot of bots) {
            const state = this._buildBotState(getBotKeyFromConfigBot(bot), roleIds);
            const stats = PlayerStats.get(user.playeruuid, state.botKey);

            this.logger.info(
                `[roleSync] ${user.playerid} trigger=${trigger} guilds=${matchedGuilds} `
                + `roles=[${[...roleIds].join(',')}] mappedRanks=[${state.mappedRanks.map(r => r.id).join(',')}] `
                + `oddsRank=${state.targetRank.id}(${state.targetRank.displayName}) `
                + `bonusOdds=${state.bonusOdds} daily=e:${state.dailyReward.e},c:${state.dailyReward.c}`
            );

            const changed = !stats
                || Number(stats.rankId) !== Number(state.targetRank.id)
                || Number(stats.bonusodds || 0) !== state.bonusOdds
                || String(stats.daily ?? '') !== JSON.stringify(state.dailyReward);

            if (changed) {
                PlayerStats.updateRankState(user.playeruuid, state.botKey, {
                    rankId: state.targetRank.id,
                    bonusodds: state.bonusOdds,
                    daily: state.dailyReward
                });
                updated += 1;
                this.logger.info(
                    `同步身份組成功: ${user.playerid} (${user.playeruuid}) -> ${state.targetRank.displayName} `
                    + `(加成 ${state.bonusOdds}, 簽到 e:${state.dailyReward.e} c:${state.dailyReward.c}) `
                    + `[bot=${state.botKey}, trigger=${trigger}]`
                );
            }

            botStates.push({
                botKey: state.botKey,
                targetRankId: state.targetRank.id,
                targetRankName: state.targetRank.displayName,
                mappedRankIds: state.mappedRanks.map(rank => rank.id),
                mappedRankNames: state.mappedRanks.map(rank => rank.displayName),
                bonusOdds: state.bonusOdds,
                dailyReward: state.dailyReward
            });
        }

        return {
            updated,
            matchedGuilds,
            roleIds: [...roleIds],
            botStates,
            reason: matchedGuilds > 0 ? 'ok' : 'member-not-found'
        };
    }

    async syncDiscordUser(discordId, trigger = 'manual') {
        if (!discordId || !this.client.isReady()) {
            return { updated: 0, matchedGuilds: 0, botStates: [], reason: 'client-not-ready' };
        }

        const user = User.getByDiscordId(discordId);
        if (!user) {
            return { updated: 0, matchedGuilds: 0, botStates: [], reason: 'not-linked' };
        }

        const snapshot = await this._collectDiscordRoleSnapshot(discordId);
        return this._syncLinkedUserFromSnapshot(user, snapshot.roleIds, snapshot.matchedGuilds, trigger);
    }

    async syncMember(member, trigger = 'member') {
        if (!member || !member.user) {
            return { updated: 0, matchedGuilds: 0, botStates: [], reason: 'invalid-member' };
        }

        // 不直接以單一 guild 的 member.roles 覆蓋 DB；同一使用者可能同時存在多個 guild。
        // 一律收集所有 guild 的 role 聯集後再決定 target rank。
        return this.syncDiscordUser(member.id, trigger);
    }

    _hasRelevantRoleChange(configBots, oldMember, newMember) {
        const oldRoles = oldMember.roles?.cache || new Collection();
        const newRoles = newMember.roles?.cache || new Collection();

        const changedRoleIds = new Set();
        for (const roleId of newRoles.keys()) {
            if (!oldRoles.has(roleId)) changedRoleIds.add(roleId);
        }
        for (const roleId of oldRoles.keys()) {
            if (!newRoles.has(roleId)) changedRoleIds.add(roleId);
        }

        if (changedRoleIds.size === 0) {
            return false;
        }

        for (const bot of configBots) {
            const botKey = normalizeBotKey(getBotKeyFromConfigBot(bot));
            const ranks = Rank.getByBot(botKey);
            if (ranks.some(rank => rank.discordid && changedRoleIds.has(String(rank.discordid)))) {
                return true;
            }
        }

        return false;
    }

    async handleGuildMemberUpdate(oldMember, newMember) {
        try {
            const config = readConfig();
            const bots = config?.bots || [];
            if (!this._hasRelevantRoleChange(bots, oldMember, newMember)) {
                return;
            }

            await this.syncDiscordUser(newMember.id, 'guildMemberUpdate');
        } catch (error) {
            this.logger.warn('身份組同步失敗:', error);
        }
    }

    async fullScanAllGuilds(trigger = 'manual') {
        if (this.fullScanPromise) {
            this.logger.debug?.(`身份組補掃已在執行中，沿用既有工作 (trigger=${trigger})`);
            return this.fullScanPromise;
        }

        this.fullScanPromise = (async () => {
            try {
                const guilds = await this.client.guilds.fetch();
                const snapshots = new Map();
                let scannedMembers = 0;

                for (const guildMeta of guilds.values()) {
                    const guild = this.client.guilds.cache.get(guildMeta.id)
                        || await this.client.guilds.fetch(guildMeta.id);
                    const members = await guild.members.fetch();

                    for (const member of members.values()) {
                        scannedMembers += 1;

                        let snapshot = snapshots.get(member.id);
                        if (!snapshot) {
                            snapshot = { roleIds: new Set(), matchedGuilds: 0 };
                            snapshots.set(member.id, snapshot);
                        }

                        snapshot.matchedGuilds += 1;
                        for (const roleId of member.roles?.cache?.keys?.() || []) {
                            snapshot.roleIds.add(String(roleId));
                        }
                    }
                }

                let updatedUsers = 0;
                let linkedUsers = 0;

                for (const [discordId, snapshot] of snapshots.entries()) {
                    const user = User.getByDiscordId(discordId);
                    if (!user) continue;

                    linkedUsers += 1;
                    const result = this._syncLinkedUserFromSnapshot(
                        user,
                        snapshot.roleIds,
                        snapshot.matchedGuilds,
                        trigger
                    );
                    if (result.updated > 0) {
                        updatedUsers += 1;
                    }
                }

                this.logger.info(
                    `身份組補掃完成: 掃描 ${scannedMembers} 位成員，已綁定 ${linkedUsers} 位，`
                    + `更新 ${updatedUsers} 位玩家 (trigger=${trigger})`
                );
                return { scannedMembers, linkedUsers, updatedUsers };
            } catch (error) {
                this.logger.warn(`身份組補掃失敗 (trigger=${trigger}):`, error);
                return { scannedMembers: 0, linkedUsers: 0, updatedUsers: 0, error };
            } finally {
                this.fullScanPromise = null;
            }
        })();

        return this.fullScanPromise;
    }
}

module.exports = RoleSyncService;
