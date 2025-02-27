const Database = require('better-sqlite3');
const Logger = require('./logger.js');

let db = null;

function initDB() {
    db = new Database(`${process.cwd()}/data/data.db`);
    db.pragma('journal_mode = WAL');
    Logger.debug(`[資料庫] 已連接至資料庫 ${process.cwd()}/data/data.db`);
}

function closeDB() {
    if (db) {
        db.close();
        Logger.debug(`[資料庫] 已關閉資料庫`);
    }
}

function executeQuery(query, params = [], callback) {
    try {
        const trimmedQuery = query.trim().toUpperCase();
        if (trimmedQuery.startsWith('SELECT')) {
            const stmt = db.prepare(query);
            const rows = stmt.all(params);
            Logger.debug(`[資料庫] 已執行查詢："${query}"，參數為 "${params}"`);
            callback(null, rows);
        } else {
            const stmt = db.prepare(query);
            const result = stmt.run(params);
            Logger.debug(`[資料庫] 已執行查詢："${query}"，參數為 "${params}"`);
            callback(null, result);
        }
    } catch (err) {
        Logger.error(`[資料庫] 查詢執行失敗：${err.message}`);
        callback(err, null);
    }
}

function backup() {
    if (!db) {
        Logger.error('[資料庫] 無法進行備份，資料庫未連接');
        return Promise.reject(new Error('資料庫未連接'));
    }

    const backupPath = `${process.cwd()}/data/backup-${Date.now()}.db`;
    Logger.debug(`[資料庫] 開始備份資料庫到 ${backupPath}`);

    let paused = false;

    // 備份並回傳 Promise
    return db.backup(backupPath, {
        progress({ totalPages: t, remainingPages: r }) {
            const completedPages = t - r;
            Logger.log(`備份進度：${((t - r) / t * 100).toFixed(1)}% (${completedPages}/${t} 頁)`);
            return paused ? 0 : 200;
        }
    })
        .then(() => {
            Logger.debug('[資料庫] 備份完成');
        })
        .catch(err => {
            Logger.error(`[資料庫] 備份失敗：${err.message}`);
            throw err;
        });
}


module.exports = {
    initDB,
    closeDB,
    executeQuery,
    backup
};
