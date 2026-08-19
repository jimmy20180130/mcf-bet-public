const db = require('../database/index');
const Rank = require('./Rank');
const { normalizeBotKey } = require('../utils/botKey');

class PlayerStats {
    static get(playeruuid, bot) {
        const normalizedBot = normalizeBotKey(bot);
        // 加成與簽到獎勵是「所有身份組加總」後寫進 playerStats；為 NULL 時才退回 rankId 對應的 rank
        let stats = db.query(`
            SELECT ps.*, r.displayName as rankName, r.discordid,
                   COALESCE(ps.bonusodds, r.bonusodds) as bonusodds,
                   COALESCE(ps.daily, r.daily) as daily
            FROM playerStats ps
            LEFT JOIN ranks r ON ps.rankId = r.id
            WHERE ps.playeruuid = ? AND ps.bot = ?
        `).get(playeruuid, normalizedBot);

        if (!stats) {
            const defaultRank = Rank.ensureDefaultForBot(normalizedBot);
            db.query(`
                INSERT INTO playerStats (playeruuid, bot, rankId, emerald, coin)
                VALUES (?, ?, ?, 0, 0)
            `).run(playeruuid, normalizedBot, defaultRank.id);

            return this.get(playeruuid, normalizedBot);
        }

        return stats;
    }

    static updateWallet(playeruuid, bot, { eChange = 0, cChange = 0 }) {
        return db.query(`
            UPDATE playerStats 
            SET emerald = emerald + ?, coin = coin + ?
            WHERE playeruuid = ? AND bot = ?
        `).run(eChange, cChange, playeruuid, bot);
    }

    static updateRankState(playeruuid, bot, { rankId, bonusodds, daily }) {
        return db.query(`
            UPDATE playerStats SET rankId = ?, bonusodds = ?, daily = ?
            WHERE playeruuid = ? AND bot = ?
        `).run(rankId, Number(bonusodds || 0), JSON.stringify(daily || {}), playeruuid, bot);
    }
}

module.exports = PlayerStats;