const db = require('../database/index');

class RecordTemplate {
    static create({ ownerDiscordId, name, filters }) {
        return db.query(`
            INSERT INTO recordTemplates (ownerDiscordId, name, filters)
            VALUES (?, ?, ?)
        `).run(ownerDiscordId, name.trim(), JSON.stringify(filters));
    }

    static remove(ownerDiscordId, name) {
        return db.query(`
            DELETE FROM recordTemplates
            WHERE ownerDiscordId = ? AND name = ?
        `).run(ownerDiscordId, name.trim());
    }

    static getByOwnerAndName(ownerDiscordId, name) {
        const row = db.query(`
            SELECT * FROM recordTemplates
            WHERE ownerDiscordId = ? AND name = ?
        `).get(ownerDiscordId, name.trim());

        return row ? this._hydrate(row) : null;
    }

    static searchOwnNames(ownerDiscordId, keyword = '', limit = 20) {
        return db.query(`
            SELECT name
            FROM recordTemplates
            WHERE ownerDiscordId = ?
              AND name LIKE ?
            ORDER BY createdAt DESC
            LIMIT ?
        `).all(ownerDiscordId, `%${keyword}%`, limit);
    }

    static listOwn(ownerDiscordId, limit = 50) {
        const rows = db.query(`
            SELECT *
            FROM recordTemplates
            WHERE ownerDiscordId = ?
            ORDER BY createdAt DESC
            LIMIT ?
        `).all(ownerDiscordId, limit);

        return rows.map(row => this._hydrate(row));
    }

    static _hydrate(row) {
        let parsedFilters = {};
        try {
            parsedFilters = JSON.parse(row.filters || '{}');
        } catch {
            parsedFilters = {};
        }

        return {
            ...row,
            filters: parsedFilters
        };
    }
}

module.exports = RecordTemplate;
