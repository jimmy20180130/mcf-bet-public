const Database = require('better-sqlite3');
const Logger = require('./logger.js');

let db = null;

let checkpointInterval = null;

function initDB() {
    db = new Database(`${process.cwd()}/data/data.db`);
    db.pragma('journal_mode = WAL');
    Logger.debug(`[資料庫] 已連接至資料庫 ${process.cwd()}/data/data.db`);

    // 每 5 分鐘做一次 checkpoint
    checkpointInterval = setInterval(() => {
        try {
            db.pragma('wal_checkpoint(FULL)');
            Logger.debug('[資料庫] 執行自動 WAL checkpoint');
        } catch (err) {
            Logger.error(`[資料庫] 自動 checkpoint 失敗：${err.message}`);
        }
    }, 5 * 60 * 1000); // 5 分鐘
}

function closeDB() {
    if (checkpointInterval) {
        clearInterval(checkpointInterval);
        checkpointInterval = null;
    }
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
        process.exit(1);
        return Promise.reject(new Error('資料庫未連接'));
    }

    try {
        // 先做 checkpoint，確保 .db 是最新狀態
        db.pragma('wal_checkpoint(FULL)');
        Logger.debug('[資料庫] 備份前執行 WAL checkpoint 完成');
    } catch (err) {
        Logger.error(`[資料庫] 備份前 WAL checkpoint 失敗：${err.message}`);
    }

    const backupPath = `${process.cwd()}/data/backup-${Date.now()}.db`;
    Logger.debug(`[資料庫] 開始備份資料庫到 ${backupPath}`);

    let paused = false;

    return db.backup(backupPath, {
        progress({ totalPages: t, remainingPages: r }) {
            const completedPages = t - r;
            Logger.log(`備份進度：${((completedPages / t) * 100).toFixed(1)}% (${completedPages}/${t} 頁)`);
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
