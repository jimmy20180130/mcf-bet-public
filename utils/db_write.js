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
    params = preventSQLInjection(params)

    db.serialize(() => {
        db.all(query, params, (err, rows) => {
            Logger.debug(`[資料庫] 已執行查詢："${query}" ，參數為 "${params}"`);
            callback(err, rows);
        });
    });
}

function preventSQLInjection(param_array) {
    return param_array.map(param => {
      return param
        .replace(/'/g, "''")            // 單引號轉成兩個單引號
        .replace(/--/g, "")             // 移除雙連字符 (SQL註解)
        .replace(/;/g, "")              // 移除分號
        .replace(/[\x00-\x1f\x7f]/g, "") // 移除控制字符
        .replace(/\\/g, "\\\\");        // 將反斜杠轉成兩個反斜杠
    });
}

module.exports = {
    initDB,
    closeDB,
    executeQuery
};