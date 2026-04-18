const db = require('../database/index');

class signIn {
    static hasSignedInToday(playeruuid, bot) {
        // utc+8 的一天算簽到一次
        const result = db.query(`
            SELECT COUNT(*) as count 
            FROM signInRecords
            WHERE playeruuid = ?
            AND DATE(datetime(createdAt, '+8 hours')) = DATE(datetime('now', '+8 hours'))
            AND bot = ?
        `).get(playeruuid, bot);
        return result.count > 0;
    }

    static record(playeruuid, bot, reward) {
        const stmt = db.query(`
            INSERT INTO signInRecords (playeruuid, bot, rewardAmount)
            VALUES (?, ?, ?)
        `);
        return stmt.run(playeruuid, bot, reward);
    }

    static getCount(playeruuid, bot) {
        return db.query('SELECT COUNT(*) as total FROM signInRecords WHERE playeruuid = ? AND bot = ?').get(playeruuid, bot).total;
    }

    static getSignInData(playeruuid, bot) {
        const now = new Date();
        const offset = 8 * 60 * 60 * 1000;
        const todayStr = new Date(now.getTime() + offset).toISOString().split('T')[0];

        const yesterdayStr = new Date(now.getTime() + offset - 86400000).toISOString().split('T')[0];

        const records = db.query(`
            SELECT DISTINCT DATE(datetime(createdAt, '+8 hours')) as signDate
            FROM signInRecords
            WHERE playeruuid = ? AND bot = ?
            ORDER BY signDate DESC
        `).all(playeruuid, bot); // ['2026-03-08', '2026-03-07', '2026-03-05']

        if (records.length === 0) {
            return { streak: 0, total: 0 };
        }

        const total = records.length;
        const lastSignDate = records[0].signDate;

        let streak = 0;

        if (lastSignDate !== todayStr && lastSignDate !== yesterdayStr) {
            streak = 0;
        } else {
            streak = 1;
            for (let i = 0; i < records.length - 1; i++) {
                const current = new Date(records[i].signDate);
                const next = new Date(records[i + 1].signDate);
                if ((current - next) === 86400000) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        return { streak, total };
    }
}

module.exports = signIn;