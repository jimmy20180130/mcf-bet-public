const db = require('../database/index');
const { normalizeUuid, normalizePlayerId } = require('../utils/identifier');

class User {
    static getByUuid(uuid) {
        return db.query(`
            SELECT * FROM users WHERE playeruuid = ?
        `).get(uuid);
    }

    static getByPlayerId(playerid) {
        return db.query(`
            SELECT * FROM users WHERE playerid = ?
        `).get(playerid);
    }

    static getByDiscordId(discordId) {
        return db.query(`
            SELECT * FROM users WHERE discordid = ?
        `).get(discordId);
    }

    static searchPlayers(keyword, limit = 20) {
        return db.query(`
            SELECT playerid, playeruuid FROM users 
            WHERE playerid LIKE ? OR playeruuid = ?
            LIMIT ?
        `).all(`%${keyword}%`, keyword, limit);
    }

    static create({ playeruuid, playerid, discordid = null }) {
        const normalizedUuid = normalizeUuid(playeruuid);
        if (!normalizedUuid) {
            return null;
        }

        const normalizedPlayerId = normalizePlayerId(playerid);
        const normalizedDiscordId = typeof discordid === 'string' ? discordid.trim() : null;

        const stmt = db.query(`
            INSERT OR IGNORE INTO users (playeruuid, playerid, discordid)
            VALUES (?, ?, ?)
        `);
        return stmt.run(normalizedUuid, normalizedPlayerId || null, normalizedDiscordId);
    }

    static linkDiscord(playeruuid, discordid) {
        const stmt = db.query(`
            UPDATE users SET discordid = ? WHERE playeruuid = ?
        `);
        return stmt.run(discordid, playeruuid);
    }
}

module.exports = User;