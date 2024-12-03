const sqlite3 = require('sqlite3').verbose();
const Logger = require('./logger.js');

let data = null;

function initDB() {
    data = new sqlite3.Database(`${process.cwd()}/data/data.db`);
    Logger.debug(`[資料庫] 已連接至資料庫 ${process.cwd()}/data/data.db`);
}

function closeDB() {
    if (data) {
        data.close((err) => {
            if (err) {
                Logger.error(`[資料庫] 關閉資料庫時發生錯誤：${err.message}`);
            } else {
                Logger.debug(`[資料庫] 已關閉資料庫`);
            }
        });
    }
}

function executeQuery(query, params, callback) {
    let db = data

    db.serialize(() => {
        db.all(query, params, (err, rows) => {
            Logger.debug(`[資料庫] 已執行查詢："${query}" ，參數為 "${params}"`);
            callback(err, rows);
        });
    });
}

module.exports = {
    initDB,
    closeDB,
    executeQuery
};