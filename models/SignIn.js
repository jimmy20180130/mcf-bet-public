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

    static getTodayRecord(playeruuid, bot) {
        return db.query(`
            SELECT *
            FROM signInRecords
            WHERE playeruuid = ?
              AND bot = ?
              AND DATE(datetime(createdAt, '+8 hours')) = DATE(datetime('now', '+8 hours'))
            ORDER BY id DESC
            LIMIT 1
        `).get(playeruuid, bot) || null;
    }

    static getById(id) {
        return db.query('SELECT * FROM signInRecords WHERE id = ?').get(id) || null;
    }

    static parseRewardAmount(rewardAmount) {
        if (!rewardAmount) return {};
        if (typeof rewardAmount === 'object') return rewardAmount;

        try {
            return JSON.parse(rewardAmount);
        } catch {
            return {};
        }
    }

    static record(playeruuid, bot, reward) {
        const stmt = db.query(`
            INSERT INTO signInRecords (playeruuid, bot, rewardAmount)
            VALUES (?, ?, ?)
        `);
        return stmt.run(playeruuid, bot, reward);
    }

    static createClaim(playeruuid, bot, reward) {
        const normalizedReward = {
            e: Number(reward?.e || 0),
            c: Number(reward?.c || 0),
            status: {
                e: Number(reward?.e || 0) > 0 ? 'pending' : 'skipped',
                c: Number(reward?.c || 0) > 0 ? 'pending' : 'skipped'
            }
        };

        const result = this.record(playeruuid, bot, JSON.stringify(normalizedReward));
        return this.getById(result.lastInsertRowid);
    }

    static updateClaim(recordId, rewardState) {
        return db.query(`
            UPDATE signInRecords
            SET rewardAmount = ?
            WHERE id = ?
        `).run(JSON.stringify(rewardState || {}), recordId);
    }

    static getCount(playeruuid, bot) {
        return db.query('SELECT COUNT(*) as total FROM signInRecords WHERE playeruuid = ? AND bot = ?').get(playeruuid, bot).total;
    }

    static getSignInData(playeruuid, bot) {
        const now = new Date();
        const offset = 8 * 60 * 60 * 1000;
        const todayStr = new Date(now.getTime() + offset).toISOString().split('T')[0];

        const yesterdayStr = new Date(now.getTime() + offset - 86400000).toISOString().split('T')[0];

        const rawRecords = db.query(`
            SELECT DATE(datetime(createdAt, '+8 hours')) as signDate, rewardAmount
            FROM signInRecords
            WHERE playeruuid = ? AND bot = ?
            ORDER BY signDate DESC, id DESC
        `).all(playeruuid, bot);

        const completedDates = new Set();
        for (const row of rawRecords) {
            const reward = this.parseRewardAmount(row.rewardAmount);
            const status = reward?.status;
            const isCompleted = !status || (
                ['paid', 'skipped'].includes(status.e)
                && ['paid', 'skipped'].includes(status.c)
            );
            if (isCompleted) completedDates.add(row.signDate);
        }

        const records = [...completedDates]
            .sort((a, b) => b.localeCompare(a))
            .map(signDate => ({ signDate }));

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
