const db = require('../database/index');
const Rank = require('./Rank');

class PlayerStats {
    static get(playeruuid, bot) {
        const normalizedBot = String(bot || '').replace(/-/g, '').toLowerCase();
        let stats = db.query(`
            SELECT ps.*, r.displayName as rankName, r.daily, r.bonusodds, r.discordid
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

    static updateRank(playeruuid, bot, rankId) {
        return db.query(`
            UPDATE playerStats SET rankId = ? WHERE playeruuid = ? AND bot = ?
        `).run(rankId, playeruuid, bot);
    }
}

module.exports = PlayerStats;