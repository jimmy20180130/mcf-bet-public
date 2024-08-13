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

async function create_user_data(player_uuid, discord_id) {
    const insertSql = 'INSERT INTO user_data (discord_id, player_uuid, create_time) VALUES (?, ?, ?)';

    if (player_uuid == 'Unexpected Error' || discord_id == 'Unexpected Error') return 'Unexpected Error'

    return await new Promise((resolve, reject) => {
        executeQuery(insertSql, [discord_id, player_uuid, Math.round(new Date() / 1000)], (err) => {
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
    get_all_users
};

// async function remove_user_role(discord_id, role) {
//     const selectSql = 'SELECT roles FROM user WHERE discord_id = ?';
//     const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [discord_id], (err, rows) => {
//                 if (err) {
//                     console.log(err);
//                     resolve('error');

//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('Not Found');
//                 } else {
//                     resolve(rows);
//                 }
//             });
//         });

//         if (rows.length === 0 || rows === 'Not Found' || rows[0].roles === 'error') {
//             return;
//         }

//         let result_roles = rows[0].roles.split(', ').filter(r => r !== role).join(', ');
//         if (result_roles === '' || result_roles === undefined) {
//             result_roles = 'none';
//         }

//         await new Promise((resolve, reject) => {
//             executeQuery(updateSql, [result_roles, discord_id], (err) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve();
//                 }
//             });
//         });
//     } catch (err) {
//         console.error(err);
//     }
// }

// async function set_user_role(discord_id, role) {
//     const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

//     try {
//         await new Promise((resolve, reject) => {
//             executeQuery(updateSql, [role, discord_id], (err) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve();
//                 }
//             });
//         });
//     } catch (err) {
//         console.error(err);
//     }
// }

// async function add_user_role(discord_id, role) {
//     const selectSql = 'SELECT roles FROM user WHERE discord_id = ?';
//     const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [discord_id], (err, rows) => {
//                 if (err) {
//                     reject(err);
//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('Not Found');
//                 } else {
//                     resolve(rows);
//                 }
//             });
//         });

//         if (rows.length === 0 || rows[0].roles === 'Not Found' || rows[0].roles === 'error') {
//             await new Promise((resolve, reject) => {
//                 executeQuery(updateSql, [role, discord_id], (err) => {
//                     if (err) {
//                         reject(err);
//                     } else {
//                         resolve();
//                     }
//                 });
//             });
//         } else {
//             const existing_roles = rows[0].roles.split(', ');
//             if (!existing_roles.includes(role)) {
//                 let new_roles = [...existing_roles, role].filter(r => r !== 'none')
//                 new_roles = new_roles.filter((r, i) => new_roles.indexOf(r) === i).sort().join(', ');
//                 console.log(new_roles)
                
//                 await new Promise((resolve, reject) => {
//                     executeQuery(updateSql, [new_roles, discord_id], (err) => {
//                         if (err) {
//                             reject(err);
//                         } else {
//                             resolve();
//                         }
//                     });
//                 });
//             }
//         }
//     } catch (err) {
//         console.error(err);
//     }
// }

// async function get_user_data(player_uuid) {
//     const selectSql = 'SELECT * FROM user WHERE player_uuid = ?';

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [player_uuid], (err, rows) => {
//                 if (err) {
//                     reject(err);
//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('Not Found');
//                 } else {
//                     resolve(rows);
//                 }
//             });
//         });

//         return rows;
//     } catch (err) {
//         console.error(err);
//         return 'error';
//     }
// }

// async function get_user_data_from_dc(discord_id) {
//     const selectSql = 'SELECT * FROM user WHERE discord_id = ?';

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [discord_id], (err, rows) => {
//                 if (err) {
//                     reject(err);
//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('Not Found');
//                 } else {
//                     resolve(rows);
//                 }
//             });
//         });

//         return rows;
//     } catch (err) {
//         console.error(err);
//         return 'error';
//     }
// }

// async function create_player_data(playerid, player_uuid, discord_id, role) {
//     const updateSql = 'UPDATE user SET discord_id = ? WHERE player_uuid = ?';
//     const insertSql = 'INSERT INTO user (discord_id, realname, wallet, roles, player_uuid, quiet, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)';

//     try {
//         if (await get_user_data(player_uuid) != 'Not Found' && await get_user_data(player_uuid) != 'error') {
//             let rows = await new Promise((resolve, reject) => {
//                 executeQuery(updateSql, [discord_id, player_uuid], (err, rows) => {
//                     if (err) {
//                         console.log(err)
//                         resolve('error')
//                     } else if (rows === undefined || rows.length === 0) {
//                         resolve('Not Found');
//                     } else {
//                         resolve(rows);
//                     }
//                 })
//             })

//             if (role !== 'none') {
//                 await add_user_role(discord_id, role)
//                 await remove_user_role(discord_id, 'none')
//             }
        
//         } else {
//             let rows = await new Promise((resolve, reject) => {
//                 executeQuery(insertSql, [discord_id, playerid, 0, role, player_uuid, 0, Math.round(new Date() / 1000)], (err, rows) => {
//                     if (err) {
//                         console.log(err)
//                         resolve('error')
//                     } else if (rows === undefined || rows.length === 0) {
//                         resolve('Not Found');
//                     } else {
//                         resolve(rows);
//                     }
//                 })
//             })

//             return rows
//         }

//     } catch (err) {
//         console.error(err);
//         return 'error';
//     }
// }

// async function getPlayerRole(player_uuid) {
//     if (player_uuid == 'Not Found') return player_uuid;

//     const selectSql = `SELECT roles FROM user WHERE player_uuid = ?`

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [player_uuid], (err, rows) => {
//                 if (err) {
//                     console.log(err)
//                     resolve('error')
//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('none');
//                 } else {
//                     resolve(rows[0].roles);
//                 }
//             })
//         })

//         return rows

//     } catch (err) {
//         console.log(err)
//         return 'error'
//     }
// }

// async function get_player_wallet(player_uuid) {
//     if (player_uuid === 'Not Found') return player_uuid;

//     const selectSql = 'SELECT wallet FROM user WHERE player_uuid = ?';

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [player_uuid], (err, rows) => {
//                 if (err) {
//                     console.log(err)
//                     resolve('error');
//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('Not Found');
//                 } else {
//                     resolve(rows);
//                 }
//             });
//         });

//         if (rows === 'Not Found' || rows === 'error' || rows.length === 0) {
//             return 'Not Found';
//         } else {
//             return rows[0].wallet;
//         }
//     } catch (err) {
//         console.error(err);
//         return 'error';
//     }
// }

// async function get_player_wallet_discord(discord_id) {

//     const selectSql = 'SELECT wallet FROM user WHERE discord_id = ?';

//     try {
//         let rows = await new Promise((resolve, reject) => {
//             executeQuery(selectSql, [discord_id], (err, rows) => {
//                 if (err) {
//                     console.log(err)
//                     resolve('error');
//                 } else if (rows === undefined || rows.length === 0) {
//                     resolve('Not Found');
//                 } else {
//                     resolve(rows);
//                 }
//             });
//         });

//         if (rows === 'Not Found' || rows === 'error' || rows.length === 0) {
//             return 'Not Found';
//         } else {
//             return rows[0].wallet;
//         }
//     } catch (err) {
//         console.error(err);
//         return 'error';
//     }
// }

// async function create_player_wallet(playerid, player_uuid) {
//     const insertSql = 'INSERT INTO user (discord_id, realname, wallet, roles, player_uuid, quiet, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)'

//     await new Promise((resolve, reject) => {
//         executeQuery(insertSql, [0, playerid, 0, 'none', player_uuid, 0, Math.round(new Date() / 1000)], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             } 

//             resolve()
//         })
//     })
// }

// async function add_player_wallet(player_uuid, amount) {
//     const selectsql = `SELECT wallet FROM user WHERE player_uuid = ?`
//     const updateSql = 'UPDATE user SET wallet = ? WHERE player_uuid = ?';

//     const user_wallet = await new Promise(resolve => {
//         executeQuery(selectsql, [player_uuid], (err, rows) => {
//             if (err) {
//                 console.log(err)
//                 resolve('error')

//             } else if (rows === undefined || rows.length === 0) {
//                 resolve('Not Found');

//             } else {
//                 resolve(rows[0].wallet);

//             }
//         })
//     })

//     if (user_wallet == undefined) return 'Not Found';

//     if (user_wallet === 'Not Found' || user_wallet === 'error') {
//         return user_wallet;
//     }

//     await new Promise(resolve => {
//         executeQuery(updateSql, [parseInt(user_wallet) + parseInt(amount), player_uuid], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             }

//             resolve()
//         })
//     })
// }

// async function add_player_wallet_dc(discord_id, amount) {
//     const selectsql = `SELECT wallet FROM user WHERE discord_id = ?`
//     const updateSql = 'UPDATE user SET wallet = ? WHERE discord_id = ?';

//     const user_wallet = await new Promise(resolve => {
//         executeQuery(selectsql, [discord_id], (err, rows) => {
//             if (err) {
//                 console.log(err)
//                 resolve('error')

//             } else if (rows === undefined || rows.length === 0) {
//                 resolve('Not Found');

//             } else {
//                 resolve(rows[0].wallet);
//             }
//         })
//     })

//     if (user_wallet == undefined) return 'Not Found';

//     if (user_wallet === 'Not Found' || user_wallet === 'error') {
//         return user_wallet;
//     }

//     await new Promise(resolve => {
//         executeQuery(updateSql, [parseInt(user_wallet) + parseInt(amount), discord_id], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             }

//             resolve()
//         })
//     })
// }

// async function clear_player_wallet(player_uuid) {
//     const updateSql = 'UPDATE user SET wallet = 0 WHERE player_uuid = ?';

//     await new Promise(resolve => {
//         executeQuery(updateSql, [player_uuid], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             }

//             resolve()
//         })
//     })
// }

// async function clear_player_wallet_dc(discord_id) {
//     const updateSql = 'UPDATE user SET wallet = 0 WHERE discord_id = ?';

//     await new Promise(resolve => {
//         executeQuery(updateSql, [discord_id], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             }

//             resolve()
//         })
//     })
// }

// async function write_pay_history(amount, win, odds, status, player_uuid, bet_type, uuid) {
//     const insertSql = 'INSERT INTO pay_history (amount, win, odds, time, status, player_uuid, pay_uuid, bet_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

//     await new Promise(resolve => {
//         executeQuery(insertSql, [amount, win, odds, Math.round(new Date() / 1000), status, player_uuid, uuid, bet_type], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             }

//             resolve()
//         })
//     })
// }

// async function get_pay_history(player_uuid) {
//     const insertSql = 'SELECT * FROM pay_history WHERE player_uuid = ?'

//     const rows = await new Promise(resolve => {
//         executeQuery(insertSql, [player_uuid], (err, rows) => {
//             if (err) {
//                 console.log(err)
//                 resolve('error')

//             } else if (rows === undefined || rows.length === 0) {
//                 resolve('Not Found');

//             } else {
//                 resolve(rows);

//             }
//         })
//     })

//     return rows
// }

// async function get_all_pay_history() {
//     const selectSql = 'SELECT * FROM pay_history'

//     const rows = await new Promise(resolve => {
//         executeQuery(selectSql, [], (err, rows) => {
//             if (err) {
//                 console.log(err)
//                 resolve('error')

//             } else if (rows === undefined || rows.length === 0) {
//                 resolve('Not Found');

//             } else {
//                 resolve(rows);

//             }
//         })
//     })

//     return rows
// }

// async function write_errors(amount, win, odds, status, player_uuid, bet_type) {
//     const insertSql = 'INSERT INTO errors (err_uuid, type, reason, amount, odds, result, player_uuid, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
//     const uuid = generateUUID()

//     await new Promise(resolve => {
//         executeQuery(insertSql, [uuid, bet_type, status, amount, odds, win, player_uuid, Math.round(new Date() / 1000)], (err, rows) => {
//             if (err) {
//                 console.log(err)

//             }

//             resolve()
//         })
//     })
// }

// async function getDailyData(player_uuid) {
//     const selectSql = 'SELECT * FROM daily WHERE user_uuid = ?';

//     return await new Promise(resolve => {
//         executeQuery(selectSql, [player_uuid], (err, rows) => {
//             if (err) {
//                 console.log(err)
//                 resolve('error')

//             } else if (rows === undefined || rows.length === 0) {
//                 resolve('Not Found');

//             } else {
//                 resolve(rows[0]);

//             }
//         })
//     })
// }

// async function writeDailyData(player_uuid, amount) {
//     return await new Promise(async (resolve) => {
//         executeQuery('SELECT count, amount, time FROM daily WHERE user_uuid = ?', [player_uuid], (err, row) => {
//             if (err) {
//                 console.log(err)
//                 resolve('error')

//             } else if (row === undefined || row.length === 0) {
//                 resolve('Not Found');

//             }

//             let daily_count = 0;
//             let daily_amount = 0;
//             row = row[0];
        
//             if (row && row.count !== undefined) daily_count = row.count;
//             if (row && row.amount !== undefined) daily_amount = row.amount;
        
//             let query, params;
        
//             if (row) {
//                 query = 'UPDATE daily SET count = ?, amount = ?, time = ? WHERE user_uuid = ?';  
//                 params = [daily_count + 1, daily_amount + amount, Math.floor(new Date().getTime()), player_uuid];
//             } else {
//                 query = 'INSERT INTO daily (user_uuid, count, amount, time) VALUES (?, ?, ?, ?)';
//                 params = [player_uuid, 1, amount, Math.floor(new Date().getTime())];
//             }
        
//             executeQuery(query, params, (err) => {
//                 if (err) {
//                     resolve('error'); 
//                 } else {
//                     resolve('success');
//                 }
//             });
//         });
//     });
// }

// async function get_all_user_data() {
//     let rows = await new Promise(resolve => {
//         executeQuery('SELECT * FROM user', [], (err, row) => {
//             if (err) {
//                 console.error(err);
//                 resolve('error');
//             } else if (row === undefined || row.length == 0) {
//                 resolve('Not Found');
//             } else {
//                 resolve(row);
//             }
//         })
//     })

//     return rows
// }

// async function delete_user_data(player_uuid) {
//     const deleteSql = 'DELETE FROM user WHERE player_uuid = ?';

//     try {
//         await new Promise((resolve, reject) => {
//             executeQuery(deleteSql, [player_uuid], (err) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve();
//                 }
//             });
//         });
//     } catch (err) {
//         console.error(err);
//     }
// }

// async function get_all_user() {
//     let players = []

//     let rows = await new Promise(resolve => {
//         const selectSql = 'SELECT realname FROM user'
//         executeQuery(selectSql, [], (err, row) => {
//             if (err) {
//                 console.error(err);
//                 resolve('error');
//             } else if (row === undefined || row.length == 0) {
//                 resolve('Not Found');
//             } else {
//                 resolve(row);
//             }
//         })
//     })

//     for (let player of rows) {
//         players.push(player.realname)
//     }

//     return players
// }

// async function remove_user_discord_id(discord_id) {
//     // set user's discord to 0

//     const updateSql = 'UPDATE user SET discord_id = 0 WHERE discord_id = ?';

//     try {
//         await new Promise((resolve, reject) => {
//             executeQuery(updateSql, [discord_id], (err) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve();
//                 }
//             });
//         });
//     } catch (err) {
//         console.error(err);
//     }
// }

// module.exports = {
//     getPlayerRole,
//     getDailyData,
//     writeDailyData,
//     get_player_wallet,
//     create_player_wallet,
//     add_player_wallet,
//     clear_player_wallet,
//     write_pay_history,
//     write_errors,
//     get_pay_history,
//     get_user_data,
//     get_user_data_from_dc,
//     create_player_data,
//     get_all_pay_history,
//     remove_user_role,
//     add_user_role,
//     get_player_wallet_discord,
//     add_player_wallet_dc,
//     clear_player_wallet_dc,
//     get_all_user_data,
//     set_user_role,
//     delete_user_data,
//     remove_user_discord_id,
//     get_all_user
// };