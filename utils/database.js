const fs = require('fs');
const { executeQuery } = require(`../utils/db_write.js`);
const Logger = require('../utils/logger.js');
const moment = require('moment-timezone');

async function get_user_data(player_uuid = undefined, discord_id = undefined) {
    const selectSql = 'SELECT * FROM user_data WHERE player_uuid = ? OR discord_id = ?';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [player_uuid, discord_id], (err, row) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');

            } else if (row === undefined || row.length === 0) {
                reject('Not Found');
            } else {
                resolve(row[0]);
            }
        });
    })
    .then(row => {
        Logger.debug(`[資料庫] 找到玩家資料: ${JSON.stringify(row)}`);
        return row;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到玩家資料: ${err}`);
        return err
    });
};

async function create_user_data(player_uuid, discord_id, player_id) {
    const insertSql = 'INSERT INTO user_data (discord_id, player_uuid, create_time, player_id) VALUES (?, ?, ?, ?)';

    if (player_uuid == 'Unexpected Error' || discord_id == 'Unexpected Error') return 'Unexpected Error'

    return await new Promise((resolve, reject) => {
        executeQuery(insertSql, [discord_id, player_uuid, Math.round(new Date() / 1000), player_id], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 新增玩家資料: ${player_uuid} (${discord_id})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法新增玩家資料: ${err}`);
    });
}

async function remove_user_data(player_uuid = undefined, discord_id = undefined) {
    const deleteSql = 'DELETE FROM user_data WHERE player_uuid = ? OR discord_id = ?';

    return await new Promise((resolve, reject) => {
        executeQuery(deleteSql, [player_uuid, discord_id], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 刪除玩家資料: ${player_uuid} (${discord_id})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法刪除玩家資料: ${err}`);
    });
}

async function create_daily_data(player_uuid) {
    const insertSql = 'INSERT INTO daily (player_uuid, date_code) VALUES (?, ?)';

    if (player_uuid == 'Unexpected Error') return 'Unexpected Error'

    return await new Promise((resolve, reject) => {
        executeQuery(insertSql, [player_uuid, ''], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 新增每日資料: ${player_uuid}`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法新增每日資料: ${err}`);
    });
}

async function get_daily_data(player_uuid) {
    // ex: 20240805
    const date_code = moment(new Date()).tz('Asia/Taipei').format('YYYYMMDD').toLocaleString().slice(0, 10).replace(/-/g, '');
    const selectSql = 'SELECT * FROM daily WHERE player_uuid = ?';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [player_uuid], (err, row) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (row === undefined || row.length === 0) {
                reject('Not Found');
                
            } else if (row[0].date_code.split(', ').filter(item => item.startsWith(date_code)).length > 0) {
                reject('Already Signed');
            } else {
                resolve(row[0]);
            }
        });
    })
    .then(row => {
        Logger.debug(`[資料庫] 找到每日資料: ${JSON.stringify(row)}`);
        return row;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到每日資料: ${err}`);
        return err
    });
}

async function write_daily_data(player_uuid, role, amount) {
    if (player_uuid == 'Unexpected Error') return 'Unexpected Error'

    const date_code = moment(new Date()).tz('Asia/Taipei').format('YYYYMMDD').toLocaleString().slice(0, 10).replace(/-/g, '');
    // 20240805|rolename|amount
    const daily_data = `${date_code}|${role}|${amount}`;
    const updateSql = 'UPDATE daily SET date_code = ? WHERE player_uuid = ?';

    return await new Promise((resolve, reject) => {
        executeQuery(updateSql, [daily_data, player_uuid], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 更新每日資料: ${player_uuid} (${daily_data})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法更新每日資料: ${err}`);
    });
}

async function create_player_wallet(player_uuid) {
    if (player_uuid == 'Unexpected Error') return 'Unexpected Error'

    const insertSql = 'INSERT INTO wallet (player_uuid, emerald_amount, coin_amount) VALUES (?, ?, ?)';
    const default_amount = 0;

    return await new Promise((resolve, reject) => {
        executeQuery(insertSql, [player_uuid, default_amount, default_amount], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 建立玩家錢包: ${player_uuid} (${default_amount})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法新增玩家錢包: ${err}`);
    });
}

async function get_player_wallet(player_uuid, type) {
    const selectSql = `SELECT ${type}_amount FROM wallet WHERE player_uuid = ?`;

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [player_uuid], (err, row) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error')
            } else if (row === undefined || row.length === 0) {
                reject('Not Found');
            } else {
                resolve(row[0][`${type}_amount`]);
            }
        })
    })
    .then(row => {
        Logger.debug(`[資料庫] 找到玩家錢包: ${type}: ${row}`);
        return row;
    })
    .catch(async err => {
        Logger.warn(`[資料庫] 無法找到玩家錢包: ${err}`);
        return err
    })
}

async function set_player_wallet(player_uuid, amount, type) {
    const updateSql = `UPDATE wallet SET ${type}_amount = ? WHERE player_uuid = ?`;

    return await new Promise((resolve, reject) => {
        executeQuery(updateSql, [amount, player_uuid], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 更新玩家錢包: ${player_uuid} (${amount})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法更新玩家錢包: ${err}`);
    });
}

async function write_pay_history(pay_uuid, player_uuid, amount, result, time, type) {
    if (player_uuid == 'Unexpected Error') return 'Unexpected Error'

    const insertSql = 'INSERT INTO pay_history (amount, type, result, time, player_uuid, pay_uuid) VALUES (?, ?, ?, ?, ?, ?)';

    return await new Promise((resolve, reject) => {
        executeQuery(insertSql, [amount, type, result, time, player_uuid, pay_uuid], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 新增一筆轉帳紀錄: ${player_uuid} (${amount})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法新增轉帳紀錄: ${err}`);
    });
}

async function write_bet_record(bet_uuid, player_uuid, amount, odds, return_amount, type, result, time) {
    if (player_uuid == 'Unexpected Error') return 'Unexpected Error'

    const insertSql = 'INSERT INTO bet_history (amount, result_amount, odds, bet_type, time, result, player_uuid, bet_uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    return await new Promise((resolve, reject) => {
        executeQuery(insertSql, [amount, return_amount, odds, type, time, result, player_uuid, bet_uuid], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 新增一筆下注紀錄: ${player_uuid} (${bet_uuid})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法新增下注紀錄: ${err}`);
    });
}

async function get_all_user_data() {
    const selectSql = 'SELECT * FROM user_data';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [], (err, rows) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (rows === undefined || rows.length === 0) {
                reject('Not Found');
            } else {
                resolve(rows);
            }
        });
    })
    .then(rows => {
        Logger.debug(`[資料庫] 找到所有玩家資料: ${rows.length}`);
        return rows;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到所有玩家資料: ${err}`);
        return err
    });
}

async function get_all_bet_record() {
    const selectSql = 'SELECT * FROM bet_history';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [], (err, rows) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (rows === undefined || rows.length === 0) {
                reject('Not Found');
            } else {
                resolve(rows);
            }
        });
    })
    .then(rows => {
        Logger.debug(`[資料庫] 找到所有下注紀錄: ${rows.length}`);
        return rows;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到所有下注紀錄: ${err}`);
        return err
    });
}

async function get_bet_record(player_uuid) {
    const selectSql = 'SELECT * FROM bet_history WHERE player_uuid = ?';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [player_uuid], (err, rows) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (rows === undefined || rows.length === 0) {
                reject('Not Found');
            } else {
                resolve(rows);
            }
        });
    })
    .then(rows => {
        Logger.debug(`[資料庫] 找到玩家下注紀錄: ${rows.length}`);
        return rows;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到玩家下注紀錄: ${err}`);
        return err
    });
}

async function get_all_users() {
    const selectSql = 'SELECT * FROM user_data';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [], (err, rows) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (rows === undefined || rows.length === 0) {
                reject('Not Found');
            } else {
                resolve(rows);
            }
        });
    })
    .then(rows => {
        Logger.debug(`[資料庫] 找到所有玩家資料: ${rows.length}`);
        // put all discord_id into a array
        const discord_ids = rows.map(row => row.discord_id);
        return discord_ids;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到所有玩家資料: ${err}`);
        return err
    });
}

async function get_all_players() {
    const selectSql = 'SELECT * FROM user_data';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [], (err, rows) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (rows === undefined || rows.length === 0) {
                reject('Not Found');
            } else {
                resolve(rows);
            }
        });
    })
    .then(rows => {
        Logger.debug(`[資料庫] 找到所有玩家資料: ${rows.length}`);
        // put all player_uuid into a array
        const player_ids = rows.map(row => row.player_id);
        return player_ids;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到所有玩家資料: ${err}`);
        return err
    });
}

async function update_player_id(player_uuid, player_id) {
    const updateSql = 'UPDATE user_data SET player_id = ? WHERE player_uuid = ?';

    return await new Promise((resolve, reject) => {
        executeQuery(updateSql, [player_id, player_uuid], (err) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else {
                resolve();
            }
        });
    })
    .then(() => {
        Logger.debug(`[資料庫] 更新玩家 ID: ${player_uuid} (${player_id})`);
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法更新玩家 ID: ${err}`);
    });
}

async function get_all_user_data() {
    const selectSql = 'SELECT * FROM user_data';

    return await new Promise((resolve, reject) => {
        executeQuery(selectSql, [], (err, rows) => {
            if (err) {
                Logger.error(err);
                reject('Unexpected Error');
            } else if (rows === undefined || rows.length === 0) {
                reject('Not Found');
            } else {
                resolve(rows);
            }
        });
    })
    .then(rows => {
        Logger.debug(`[資料庫] 找到所有玩家資料: ${rows.length}`);
        return rows;
    })
    .catch(err => {
        Logger.warn(`[資料庫] 無法找到所有玩家資料: ${err}`);
        return err
    });
}

module.exports = {
    get_user_data,
    create_user_data,
    remove_user_data,
    create_daily_data,
    get_daily_data,
    write_daily_data,
    create_player_wallet,
    get_player_wallet,
    set_player_wallet,
    write_pay_history,
    write_bet_record,
    get_all_user_data,
    get_all_bet_record,
    get_bet_record,
    get_all_users,
    get_all_players,
    update_player_id,
    get_all_user_data
};