const sqlite3 = require('sqlite3').verbose();
const { generateUUID } = require(`${process.cwd()}/utils/uuid.js`)
const { get_player_name } = require(`${process.cwd()}/utils/get_player_info.js`)
const fs = require('fs');

async function remove_user_role(discord_id, role) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
    const selectsql = `SELECT roles FROM user WHERE discord_id = ?`
    const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

    const user_roles = await new Promise(async resolve => {
        user_data.all(selectsql, [discord_id], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('Not Found');
            rows.forEach((row) => {
                resolve(row.roles);
            });
        });
    })
    
    let result_role = user_roles.split(', ').filter(rolee => rolee != role).join(', ')
    if (result_role == undefined || result_role == '') result_role = 'none' 

    user_data.run(updateSql, result_role, discord_id, function (err) {
        if (err) console.log(err)
    });

    user_data.close()
}

async function add_user_role(discord_id, role) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
    const selectsql = `SELECT roles FROM user WHERE discord_id = ?`
    const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

    const user_roles = await new Promise(async resolve => {
        user_data.all(selectsql, [discord_id], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('Not Found');
            rows.forEach((row) => {
                resolve(row.roles);
            });
        });
    })
    
    if (user_roles == '' || user_roles == null || user_roles == 'none' || user_roles == 'Not Found' || user_roles == 'error') {
        user_data.run(updateSql, role, discord_id, function (err) {
            if (err) console.log(err)
        });
    } else {
        user_data.run(updateSql, user_roles + ', ' + role, discord_id, function (err) {
            if (err) console.log(err)
        });
    }

    user_data.close()
}

async function get_user_data(player_uuid) {
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.all('SELECT * FROM user WHERE player_uuid = ?', [player_uuid], (err, rows) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (rows === undefined || rows.length == 0) {
                resolve('Not Found');
            } else {
                resolve(rows);
            }

            user_data.close();
        });
    });
}

async function get_user_data_from_dc(discord_id) {
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.all('SELECT * FROM user WHERE discord_id = ?', [discord_id], (err, rows) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (rows === undefined || rows.length == 0) {
                resolve('Not Found');
            } else {
                resolve(rows);
            }

            user_data.close();
        });
    });
}

async function create_player_data(playerid, player_uuid, discord_id, role) {
    if (await get_user_data(player_uuid) != 'Not Found' && await get_user_data(player_uuid) != 'error') {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        const updateSql = 'UPDATE user SET discord_id = ? WHERE player_uuid = ?';

        user_data.run(updateSql, [discord_id, player_uuid], function (err) {
            if (err) console.log(err)
        });

        user_data.close()

        await add_user_role(discord_id, role)
        await remove_user_role(discord_id, 'none')

    } else {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        const insertSql = 'INSERT INTO user (discord_id, realname, wallet, roles, player_uuid, quiet, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)';

        user_data.run(insertSql, [discord_id, playerid, 0, role, player_uuid, 0, Math.round(new Date() / 1000)], function (err) {
            if (err) console.log(err)
        });

        user_data.close()
    }
}

async function getPlayerRole(player_uuid) {
    if (player_uuid == 'Not Found') return player_uuid;
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.all(`SELECT roles FROM user WHERE player_uuid = ?`, [player_uuid], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('none');
            rows.forEach((row) => {
                resolve(row.roles);
            });
        });
        user_data.close();
    });
}

async function get_player_wallet(player_uuid) {
    if (player_uuid == 'Not Found') return player_uuid;
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.all(`SELECT wallet FROM user WHERE player_uuid = ?`, [player_uuid], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('Not Found');
            rows.forEach((row) => {
                resolve(row.wallet);
            });
        });
        user_data.close();
    });
}

async function get_player_wallet_discord(discord_id) {
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.all(`SELECT wallet FROM user WHERE discord_id = ?`, [discord_id], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('Not Found');
            rows.forEach((row) => {
                resolve(row.wallet);
            });
        });
        user_data.close();
    });
}

async function create_player_wallet(playerid, player_uuid) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
    const insertSql = 'INSERT INTO user (discord_id, realname, wallet, roles, player_uuid, quiet, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)';

    user_data.run(insertSql, [0, playerid, 0, 'none', player_uuid, 0, Math.round(new Date() / 1000)], function (err) {
        if (err) console.log(err)
    });

    user_data.close()
}

async function add_player_wallet(player_uuid, amount) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);

    const selectsql = `SELECT wallet FROM user WHERE player_uuid = ?`
    const updateSql = 'UPDATE user SET wallet = ? WHERE player_uuid = ?';

    const user_wallet  = await new Promise(async resolve => {
        user_data.all(selectsql, [player_uuid], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('Not Found');
            rows.forEach((row) => {
                resolve(row.wallet);
            });
        });
    })

    user_data.run(updateSql, [parseInt(user_wallet) + parseInt(amount), player_uuid], function (err) {
        if (err) console.log(err)
    });

    user_data.close()
}

async function add_player_wallet_dc(discord_id, amount) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);

    const selectsql = `SELECT wallet FROM user WHERE discord_id = ?`
    const updateSql = 'UPDATE user SET wallet = ? WHERE discord_id = ?';

    const user_wallet  = await new Promise(async resolve => {
        user_data.all(selectsql, [player_uuid], (err, rows) => {
            if (err) resolve('error');
            if (!rows || rows.length == 0) resolve('Not Found');
            rows.forEach((row) => {
                resolve(row.wallet);
            });
        });
    })

    user_data.run(updateSql, [parseInt(user_wallet) + parseInt(amount), player_uuid], function (err) {
        if (err) console.log(err)
    });

    user_data.close()
}

async function clear_player_wallet(player_uuid) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);

    const updateSql = 'UPDATE user SET wallet = 0 WHERE player_uuid = ?';
    user_data.run(updateSql, [player_uuid], function (err) {
        if (err) console.log(err)
    });

    user_data.close()
}

async function clear_player_wallet_dc(discord_id) {
    const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);

    const updateSql = 'UPDATE user SET wallet = 0 WHERE discord_id = ?';
    user_data.run(updateSql, [player_uuid], function (err) {
        if (err) console.log(err)
    });

    user_data.close()
}

async function write_pay_history(amount, win, odds, status, player_uuid, bet_type) {
    const pay_history = new sqlite3.Database(`${process.cwd()}/data/pay_history.db`);
    const insertSql = 'INSERT INTO pay_history (amount, win, odds, time, status, player_uuid, pay_uuid, bet_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    pay_history.run(insertSql, [amount, win, odds, Math.round(new Date() / 1000), status, player_uuid, generateUUID(), bet_type], function (err) {
        if (err) console.log(err)
    });

    pay_history.close()
}

async function get_pay_history(player_uuid) {
    return new Promise((resolve) => {
        const pay_history = new sqlite3.Database(`${process.cwd()}/data/pay_history.db`);
        pay_history.all('SELECT * FROM pay_history WHERE player_uuid = ?', [player_uuid], (err, rows) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (rows === undefined) {
                resolve('Not Found');
            } else {
                resolve(rows);
            }

            pay_history.close();
        });
    });
}

async function get_all_pay_history() {
    return new Promise((resolve) => {
        const pay_history = new sqlite3.Database(`${process.cwd()}/data/pay_history.db`);
        pay_history.all('SELECT * FROM pay_history', (err, rows) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (rows === undefined) {
                resolve('Not Found');
            } else {
                resolve(rows);
            }

            pay_history.close();
        });
    });
}

async function write_errors(amount, win, odds, status, player_uuid, bet_type) {
    const errors = new sqlite3.Database(`${process.cwd()}/data/errors.db`);
    const insertSql = 'INSERT INTO errors (err_uuid, type, reason, amount, odds, result, player_uuid, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const uuid = generateUUID()
    errors.run(insertSql, [uuid, bet_type, status, amount, odds, win, player_uuid, Math.round(new Date() / 1000)], function (err) {
        if (err) console.log(err)
    });

    errors.close()
    return uuid
}

async function getDailyData(player_uuid) {
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.get('SELECT * FROM daily WHERE user_uuid = ?', [player_uuid], (err, row) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (row === undefined) {
                resolve('Not Found');
            } else {
                resolve(row);
            }

            user_data.close();
        });
    });
}


async function writeDailyData(player_uuid, amount) {
    return new Promise((resolve) => {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        user_data.serialize(() => {
            user_data.get('SELECT count, amount, time FROM daily WHERE user_uuid = ?', [player_uuid], (err, row) => {
                if (err) resolve(err);

                let daily_count = 0;
                let daily_amount = 0;

                if (row && row.count !== undefined) daily_count = row.count;
                if (row && row.amount !== undefined) daily_amount = row.amount;

                const insertSql = 'INSERT INTO daily (user_uuid, count, amount, time) VALUES (?, ?, ?, ?)';
                const updateSql = 'UPDATE daily SET count = ?, amount = ?, time = ? WHERE user_uuid = ?';

                if (row) {
                    user_data.run(updateSql, [daily_count + 1, daily_amount + amount, Math.floor(new Date().getTime()), player_uuid], function (err) {
                        if (err) {
                            console.log(err);
                            user_data.close();
                            resolve('error');
                        } else {
                            user_data.close();
                            resolve('success');
                        }
                    });
                } else {
                    user_data.run(insertSql, [player_uuid, 1, amount, Math.floor(new Date().getTime())], function (err) {
                        if (err) {
                            console.log(err);
                            user_data.close();
                            resolve('error');
                        } else {
                            user_data.close();
                            resolve('success');
                        }
                    });
                }
            });
        });
    });
}

module.exports = {
    getPlayerRole,
    getDailyData,
    writeDailyData,
    get_player_wallet,
    create_player_wallet,
    add_player_wallet,
    clear_player_wallet,
    write_pay_history,
    write_errors,
    get_pay_history,
    get_user_data,
    get_user_data_from_dc,
    create_player_data,
    get_all_pay_history,
    remove_user_role,
    add_user_role,
    get_player_wallet_discord,
    add_player_wallet_dc,
    clear_player_wallet_dc
};