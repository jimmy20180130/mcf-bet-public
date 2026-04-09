const db = require('../database/index');

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
        const stmt = db.query(`
            INSERT OR IGNORE INTO users (playeruuid, playerid, discordid)
            VALUES (?, ?, ?)
        `);
        return stmt.run(playeruuid, playerid, discordid);
    }

    static linkDiscord(playeruuid, discordid) {
        const stmt = db.query(`
            UPDATE users SET discordid = ? WHERE playeruuid = ?
        `);
        return stmt.run(discordid, playeruuid);
    }
}

module.exports = User;