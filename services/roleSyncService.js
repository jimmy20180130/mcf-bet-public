const { Collection } = require('discord.js');
const { readConfig } = require('./configService');
const Rank = require('../models/Rank');
const User = require('../models/User');
const PlayerStats = require('../models/PlayerStats');
const { normalizeBotKey, getBotKeyFromConfigBot } = require('../utils/botKey');

class RoleSyncService {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
    }

    _normalizeBot(bot) {
        return normalizeBotKey(bot);
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

    async _syncUserRankForBot({ user, member, botKey }) {
        const normalizedBotKey = this._normalizeBot(botKey);
        const defaultRank = Rank.ensureDefaultForBot(normalizedBotKey);
        const ranks = Rank.getByBot(normalizedBotKey);

        const mappedRanks = ranks.filter(rank => rank.discordid && member.roles.cache.has(rank.discordid));
        const targetRank = this._pickTargetRank(mappedRanks) || defaultRank;
        const stats = PlayerStats.get(user.playeruuid, normalizedBotKey);

        if (!stats || Number(stats.rankId) === Number(targetRank.id)) {
            return false;
        }

        PlayerStats.updateRank(user.playeruuid, normalizedBotKey, targetRank.id);
        this.logger.info(`同步身份組成功: ${user.playerid} (${user.playeruuid}) -> ${targetRank.displayName} [bot=${normalizedBotKey}]`);
        return true;
    }

    async syncMember(member) {
        if (!member || !member.user) return { updated: 0, reason: 'invalid-member' };

        const user = User.getByDiscordId(member.id);
        if (!user) {
            return { updated: 0, reason: 'not-linked' };
        }

        const config = readConfig();
        const bots = config?.bots || [];

        let updated = 0;
        for (const bot of bots) {
            if (await this._syncUserRankForBot({ user, member, botKey: getBotKeyFromConfigBot(bot) })) {
                updated += 1;
            }
        }

        return { updated, reason: 'ok' };
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
            const botKey = this._normalizeBot(getBotKeyFromConfigBot(bot));
            const ranks = Rank.getByBot(botKey);
            if (ranks.some(rank => rank.discordid && changedRoleIds.has(rank.discordid))) {
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

            await this.syncMember(newMember);
        } catch (error) {
            this.logger.warn('身份組同步失敗:', error);
        }
    }

    async fullScanAllGuilds() {
        try {
            const guilds = await this.client.guilds.fetch();
            let scannedMembers = 0;
            let updatedUsers = 0;

            for (const guildMeta of guilds.values()) {
                const guild = await this.client.guilds.fetch(guildMeta.id);
                const members = await guild.members.fetch();

                for (const member of members.values()) {
                    scannedMembers += 1;
                    const result = await this.syncMember(member);
                    if (result.updated > 0) {
                        updatedUsers += 1;
                    }
                }
            }

            this.logger.info(`身份組補掃完成: 掃描 ${scannedMembers} 位成員，更新 ${updatedUsers} 位玩家`);
        } catch (error) {
            this.logger.warn('身份組啟動補掃失敗:', error);
        }
    }
}

module.exports = RoleSyncService;
