const sqlite3 = require('sqlite3').verbose();
const { generateUUID } = require(`${process.cwd()}/utils/uuid.js`)
const { get_player_name } = require(`${process.cwd()}/utils/get_player_info.js`)
const { rejects } = require('assert');
const fs = require('fs');
const { resolve } = require('path');
const { initDB, closeDB, executeQuery } = require(`${process.cwd()}/utils/db_write.js`);

async function remove_user_role(discord_id, role) {
    const selectSql = 'SELECT roles FROM user WHERE discord_id = ?';
    const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [discord_id], (err, rows) => {
                if (err) {
                    console.log(err);
                    resolve('error');

                } else if (rows === undefined || rows.length === 0) {
                    resolve('Not Found');
                } else {
                    resolve(rows);
                }
            });
        });

        if (rows.length === 0 || rows === 'Not Found' || rows[0].roles === 'error') {
            return;
        }

        let result_roles = rows[0].roles.split(', ').filter(r => r !== role).join(', ');
        if (result_roles === '' || result_roles === undefined) {
            result_roles = 'none';
        }

        await new Promise((resolve, reject) => {
            executeQuery('user_data', updateSql, [result_roles, discord_id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

async function set_user_role(discord_id, role) {
    const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

    try {
        await new Promise((resolve, reject) => {
            executeQuery('user_data', updateSql, [role, discord_id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

async function add_user_role(discord_id, role) {
    const selectSql = 'SELECT roles FROM user WHERE discord_id = ?';
    const updateSql = 'UPDATE user SET roles = ? WHERE discord_id = ?';

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [discord_id], (err, rows) => {
                if (err) {
                    reject(err);
                } else if (rows === undefined || rows.length === 0) {
                    resolve('Not Found');
                } else {
                    resolve(rows);
                }
            });
        });

        if (rows.length === 0 || rows[0].roles === 'Not Found' || rows[0].roles === 'error') {
            await new Promise((resolve, reject) => {
                executeQuery('user_data', updateSql, [role, discord_id], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } else {
            const existing_roles = rows[0].roles.split(', ');
            if (!existing_roles.includes(role)) {
                let new_roles = [...existing_roles, role].filter(r => r !== 'none').filter((r, i) => new_roles.indexOf(r) === i).sort().join(', ');
                
                await new Promise((resolve, reject) => {
                    executeQuery('user_data', updateSql, [new_roles, discord_id], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function get_user_data(player_uuid) {
    const selectSql = 'SELECT * FROM user WHERE player_uuid = ?';

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [player_uuid], (err, rows) => {
                if (err) {
                    reject(err);
                } else if (rows === undefined || rows.length === 0) {
                    resolve('Not Found');
                } else {
                    resolve(rows);
                }
            });
        });

        return rows;
    } catch (err) {
        console.error(err);
        return 'error';
    }
}

async function get_user_data_from_dc(discord_id) {
    const selectSql = 'SELECT * FROM user WHERE discord_id = ?';

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [discord_id], (err, rows) => {
                if (err) {
                    reject(err);
                } else if (rows === undefined || rows.length === 0) {
                    resolve('Not Found');
                } else {
                    resolve(rows);
                }
            });
        });

        return rows;
    } catch (err) {
        console.error(err);
        return 'error';
    }
}

async function create_player_data(playerid, player_uuid, discord_id, role) {
    const updateSql = 'UPDATE user SET discord_id = ? WHERE player_uuid = ?';
    const insertSql = 'INSERT INTO user (discord_id, realname, wallet, roles, player_uuid, quiet, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)';

    try {
        if (await get_user_data(player_uuid) != 'Not Found' && await get_user_data(player_uuid) != 'error') {
            let rows = await new Promise((resolve, reject) => {
                executeQuery('user_data', updateSql, [discord_id, player_uuid], (err, rows) => {
                    if (err) {
                        console.log(err)
                        resolve('error')
                    } else if (rows === undefined || rows.length === 0) {
                        resolve('Not Found');
                    } else {
                        resolve(rows);
                    }
                })
            })

            await add_user_role(discord_id, role)
            await remove_user_role(discord_id, 'none')
        
        } else {
            let rows = await new Promise((resolve, reject) => {
                executeQuery('user_data', insertSql, [discord_id, playerid, 0, role, player_uuid, 0, Math.round(new Date() / 1000)], (err, rows) => {
                    if (err) {
                        console.log(err)
                        resolve('error')
                    } else if (rows === undefined || rows.length === 0) {
                        resolve('Not Found');
                    } else {
                        resolve(rows);
                    }
                })
            })

            return rows
        }

    } catch (err) {
        console.error(err);
        return 'error';
    }
}

async function getPlayerRole(player_uuid) {
    if (player_uuid == 'Not Found') return player_uuid;

    const selectSql = `SELECT roles FROM user WHERE player_uuid = ?`

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [player_uuid], (err, rows) => {
                if (err) {
                    console.log(err)
                    resolve('error')
                } else if (rows === undefined || rows.length === 0) {
                    resolve('none');
                } else {
                    resolve(rows[0].roles);
                }
            })
        })

        return rows

    } catch (err) {
        console.log(err)
        return 'error'
    }
}

async function get_player_wallet(player_uuid) {
    if (player_uuid === 'Not Found') return player_uuid;

    const selectSql = 'SELECT wallet FROM user WHERE player_uuid = ?';

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [player_uuid], (err, rows) => {
                if (err) {
                    console.log(err)
                    resolve('error');
                } else if (rows === undefined || rows.length === 0) {
                    resolve('Not Found');
                } else {
                    resolve(rows);
                }
            });
        });

        if (rows === 'Not Found' || rows === 'error' || rows.length === 0) {
            return 'Not Found';
        } else {
            return rows[0].wallet;
        }
    } catch (err) {
        console.error(err);
        return 'error';
    }
}

async function get_player_wallet_discord(discord_id) {

    const selectSql = 'SELECT wallet FROM user WHERE discord_id = ?';

    try {
        let rows = await new Promise((resolve, reject) => {
            executeQuery('user_data', selectSql, [discord_id], (err, rows) => {
                if (err) {
                    console.log(err)
                    resolve('error');
                } else if (rows === undefined || rows.length === 0) {
                    resolve('Not Found');
                } else {
                    resolve(rows);
                }
            });
        });

        if (rows === 'Not Found' || rows === 'error' || rows.length === 0) {
            return 'Not Found';
        } else {
            return rows[0].wallet;
        }
    } catch (err) {
        console.error(err);
        return 'error';
    }
}

async function create_player_wallet(playerid, player_uuid) {
    const insertSql = 'INSERT INTO user (discord_id, realname, wallet, roles, player_uuid, quiet, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)'

    await new Promise((resolve, reject) => {
        executeQuery('user_data', insertSql, [0, playerid, 0, 'none', player_uuid, 0, Math.round(new Date() / 1000)], (err, rows) => {
            if (err) {
                console.log(err)

            } 

            resolve()
        })
    })
}

async function add_player_wallet(player_uuid, amount) {
    const selectsql = `SELECT wallet FROM user WHERE player_uuid = ?`
    const updateSql = 'UPDATE user SET wallet = ? WHERE player_uuid = ?';

    const user_wallet = await new Promise(resolve => {
        executeQuery('user_data', selectsql, [player_uuid], (err, rows) => {
            if (err) {
                console.log(err)
                resolve('error')

            } else if (rows === undefined || rows.length === 0) {
                resolve('Not Found');

            } else {
                resolve(rows[0].wallet);

            }
        })
    })

    if (user_wallet == undefined) return 'Not Found';

    if (user_wallet === 'Not Found' || user_wallet === 'error') {
        return user_wallet;
    }

    await new Promise(resolve => {
        executeQuery('user_data', updateSql, [parseInt(user_wallet) + parseInt(amount), player_uuid], (err, rows) => {
            if (err) {
                console.log(err)

            }

            resolve()
        })
    })
}

async function add_player_wallet_dc(discord_id, amount) {
    const selectsql = `SELECT wallet FROM user WHERE discord_id = ?`
    const updateSql = 'UPDATE user SET wallet = ? WHERE discord_id = ?';

    const user_wallet = await new Promise(resolve => {
        executeQuery('user_data', selectsql, [discord_id], (err, rows) => {
            if (err) {
                console.log(err)
                resolve('error')

            } else if (rows === undefined || rows.length === 0) {
                resolve('Not Found');

            } else {
                resolve(rows[0].wallet);
            }
        })
    })

    if (user_wallet == undefined) return 'Not Found';

    if (user_wallet === 'Not Found' || user_wallet === 'error') {
        return user_wallet;
    }

    await new Promise(resolve => {
        executeQuery('user_data', updateSql, [parseInt(user_wallet) + parseInt(amount), discord_id], (err, rows) => {
            if (err) {
                console.log(err)

            }

            resolve()
        })
    })
}

async function clear_player_wallet(player_uuid) {
    const updateSql = 'UPDATE user SET wallet = 0 WHERE player_uuid = ?';

    await new Promise(resolve => {
        executeQuery('user_data', updateSql, [player_uuid], (err, rows) => {
            if (err) {
                console.log(err)

            }

            resolve()
        })
    })
}

async function clear_player_wallet_dc(discord_id) {
    const updateSql = 'UPDATE user SET wallet = 0 WHERE discord_id = ?';

    await new Promise(resolve => {
        executeQuery('user_data', updateSql, [discord_id], (err, rows) => {
            if (err) {
                console.log(err)

            }

            resolve()
        })
    })
}

async function write_pay_history(amount, win, odds, status, player_uuid, bet_type) {
    const insertSql = 'INSERT INTO pay_history (amount, win, odds, time, status, player_uuid, pay_uuid, bet_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    await new Promise(resolve => {
        executeQuery('pay_history', insertSql, [amount, win, odds, Math.round(new Date() / 1000), status, player_uuid, generateUUID(), bet_type], (err, rows) => {
            if (err) {
                console.log(err)

            }

            resolve()
        })
    })
}

async function get_pay_history(player_uuid) {
    const insertSql = 'SELECT * FROM pay_history WHERE player_uuid = ?'

    const rows = await new Promise(resolve => {
        executeQuery('pay_history', insertSql, [player_uuid], (err, rows) => {
            if (err) {
                console.log(err)
                resolve('error')

            } else if (rows === undefined || rows.length === 0) {
                resolve('Not Found');

            } else {
                resolve(rows);

            }
        })
    })

    return rows
}

async function get_all_pay_history() {
    const selectSql = 'SELECT * FROM pay_history'

    const rows = await new Promise(resolve => {
        executeQuery('pay_history', selectSql, [], (err, rows) => {
            if (err) {
                console.log(err)
                resolve('error')

            } else if (rows === undefined || rows.length === 0) {
                resolve('Not Found');

            } else {
                resolve(rows);

            }
        })
    })

    return rows
}

async function write_errors(amount, win, odds, status, player_uuid, bet_type) {
    const insertSql = 'INSERT INTO errors (err_uuid, type, reason, amount, odds, result, player_uuid, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const uuid = generateUUID()

    await new Promise(resolve => {
        executeQuery('errors', insertSql, [uuid, bet_type, status, amount, odds, win, player_uuid, Math.round(new Date() / 1000)], (err, rows) => {
            if (err) {
                console.log(err)

            }
        })
    })
}

async function getDailyData(player_uuid) {
    const selectSql = 'SELECT * FROM daily WHERE user_uuid = ?';

    return await new Promise(resolve => {
        executeQuery('user_data', selectSql, [player_uuid], (err, rows) => {
            if (err) {
                console.log(err)
                resolve('error')

            } else if (rows === undefined || rows.length === 0) {
                resolve('Not Found');

            } else {
                resolve(rows[0]);

            }
        })
    })
}

async function writeDailyData(player_uuid, amount) {
    return await new Promise(async (resolve) => {
        executeQuery('user_data', 'SELECT count, amount, time FROM daily WHERE user_uuid = ?', [player_uuid], (err, row) => {
            if (err) {
                console.log(err)
                resolve('error')

            } else if (row === undefined || row.length === 0) {
                resolve('Not Found');

            }

            let daily_count = 0;
            let daily_amount = 0;
            row = row[0];
        
            if (row && row.count !== undefined) daily_count = row.count;
            if (row && row.amount !== undefined) daily_amount = row.amount;
        
            let query, params;
        
            if (row) {
                query = 'UPDATE daily SET count = ?, amount = ?, time = ? WHERE user_uuid = ?';  
                params = [daily_count + 1, daily_amount + amount, Math.floor(new Date().getTime()), player_uuid];
            } else {
                query = 'INSERT INTO daily (user_uuid, count, amount, time) VALUES (?, ?, ?, ?)';
                params = [player_uuid, 1, amount, Math.floor(new Date().getTime())];
            }
        
            executeQuery('user_data', query, params, (err) => {
                if (err) {
                    resolve('error'); 
                } else {
                    resolve('success');
                }
            });
        });
    });
}

async function get_all_user_data() {
    let rows = await new Promise(resolve => {
        executeQuery('user_data', 'SELECT * FROM user', [], (err, row) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (row === undefined || row.length == 0) {
                resolve('Not Found');
            } else {
                resolve(row);
            }
        })
    })

    return rows
}

async function delete_user_data(player_uuid) {
    const deleteSql = 'DELETE FROM user WHERE player_uuid = ?';

    try {
        await new Promise((resolve, reject) => {
            executeQuery('user_data', deleteSql, [player_uuid], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

async function get_all_user() {
    let players = []

    let rows = await new Promise(resolve => {
        executeQuery('pay_history', 'SELECT player_id FROM pay_history', [], (err, row) => {
            if (err) {
                console.error(err);
                resolve('error');
            } else if (row === undefined || row.length == 0) {
                resolve('Not Found');
            } else {
                resolve(row);
            }
        })
    })
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
    clear_player_wallet_dc,
    get_all_user_data,
    set_user_role,
    delete_user_data
};