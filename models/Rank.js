const db = require('../database/index');
const { normalizeBotKey } = require('../utils/botKey');

class Rank {
    static _normalizeBot(bot) {
        return normalizeBotKey(bot);
    }

    static _parseDaily(daily) {
        if (!daily) return {};
        try {
            return JSON.parse(daily);
        } catch {
            return {};
        }
    }

    static _mapRow(rank) {
        if (!rank) return null;
        return {
            ...rank,
            bot: rank.bot,
            daily: this._parseDaily(rank.daily)
        };
    }

    static create({ displayName, bot, discordid = '', daily = {}, bonusodds = 0 }) {
        const normalizedBot = this._normalizeBot(bot);
        const stmt = db.query(`
            INSERT INTO ranks (displayName, discordid, daily, bonusodds, bot)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(
            String(displayName || '').trim(),
            String(discordid || '').trim(),
            JSON.stringify(daily || {}),
            Number(bonusodds || 0),
            normalizedBot
        );
    }

    static getById(id) {
        return this._mapRow(db.query('SELECT * FROM ranks WHERE id = ?').get(id));
    }

    static getByBot(bot) {
        const normalizedBot = this._normalizeBot(bot);
        const rows = db.query(`
            SELECT *
            FROM ranks
            WHERE bot = ?
            ORDER BY id ASC
        `).all(normalizedBot);
        return rows.map(row => this._mapRow(row));
    }

    static searchByBotAndName(bot, keyword = '', limit = 25) {
        const normalizedBot = this._normalizeBot(bot);
        const rows = db.query(`
            SELECT *
            FROM ranks
            WHERE bot = ?
                AND displayName LIKE ?
            ORDER BY id ASC
            LIMIT ?
        `).all(normalizedBot, `%${keyword}%`, Number(limit));
        return rows.map(row => this._mapRow(row));
    }

    static getMappedByDiscordRole(bot, discordRoleId) {
        const normalizedBot = this._normalizeBot(bot);
        return this._mapRow(db.query(`
            SELECT *
            FROM ranks
            WHERE bot = ?
              AND discordid = ?
            LIMIT 1
        `).get(normalizedBot, String(discordRoleId || '').trim()));
    }

    static update(id, updates = {}) {
        const current = this.getById(id);
        if (!current) {
            return { changes: 0 };
        }

        const nextDisplayName = updates.displayName !== undefined
            ? String(updates.displayName || '').trim()
            : current.displayName;
        const nextDiscordId = updates.discordid !== undefined
            ? String(updates.discordid || '').trim()
            : current.discordid;
        const nextBonusOdds = updates.bonusodds !== undefined
            ? Number(updates.bonusodds || 0)
            : Number(current.bonusodds || 0);
        const nextBot = updates.bot !== undefined
            ? this._normalizeBot(updates.bot)
            : current.bot;
        const nextDaily = updates.daily !== undefined
            ? updates.daily
            : current.daily;

        return db.query(`
            UPDATE ranks
            SET displayName = ?,
                bot = ?,
                discordid = ?,
                bonusodds = ?,
                daily = ?
            WHERE id = ?
        `).run(
            nextDisplayName,
            nextBot,
            nextDiscordId,
            nextBonusOdds,
            JSON.stringify(nextDaily || {}),
            id
        );
    }

    static delete(id) {
        return db.query('DELETE FROM ranks WHERE id = ?').run(id);
    }

    static getDefaultForBot(bot) {
        const normalizedBot = this._normalizeBot(bot);
        const row = db.query(`
            SELECT *
            FROM ranks
            WHERE bot = ?
              AND displayName = '未綁定'
            ORDER BY id ASC
            LIMIT 1
        `).get(normalizedBot);
        return this._mapRow(row);
    }

    static ensureDefaultForBot(bot) {
        const normalizedBot = this._normalizeBot(bot);
        let rank = this.getDefaultForBot(normalizedBot);
        if (rank) return rank;

        this.create({
            displayName: '未綁定',
            bot: normalizedBot,
            discordid: '',
            daily: { e: 0, c: 0 },
            bonusodds: 0
        });

        rank = this.getDefaultForBot(normalizedBot);
        return rank;
    }
}

module.exports = Rank;