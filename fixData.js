if (process.argv.includes('--spawned')) {
    const sqlite3 = require('sqlite3').verbose();
    const axios = require('axios');

    let data = null;

    function initDB() {
        data = new sqlite3.Database(`${process.cwd()}/data/data.db`);
        console.log(`[資料庫] 已連接至資料庫 ${process.cwd()}/data/data.db`);
    }

    function closeDB() {
        if (data) {
            data.close((err) => {
                if (err) {
                    console.error(`[資料庫] 關閉資料庫時發生錯誤：${err.message}`);
                } else {
                    console.log(`[資料庫] 已關閉資料庫`);
                }
            });
        }
    }

    function executeQuery(query, params, callback) {
        let db = data

        db.serialize(() => {
            db.all(query, params, (err, rows) => {
                console.log(`[資料庫] 已執行查詢："${query}" ，參數為 "${params}"`);
                callback(err, rows);
            });
        });
    }

    async function checkDB() {
        const db = new sqlite3.Database('data/data.db', (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                //check if there r player_id in table user_data, if not, modify the table
                db.run(`ALTER TABLE user_data ADD COLUMN player_id TEXT`, (err) => {
                    if (err) {
                        console.debug('Column player_id already exists');
                    }
                });
            }
        });
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            }
        });   
    }

    async function get_player_name(uuid) {
        if (uuid == '所有人' || uuid == 'Unexpected Error') return 'Unexpected Error';

        let result = undefined;

        await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
            .then(response => {
                if (response.data) {
                    result = response.data.name
                    console.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`)
                } else {
                    result = 'Not Found'
                    console.warn(`[玩家資料] 無法取得玩家 ${uuid} 的名稱: ${response.data.errorMessage}`)
                }
            })
            .catch(error => {
                result = 'Unexpected Error'
                console.error(`[玩家資料] 查詢玩家名稱時發現錯誤: ${error}`)
            });

        if (!result || result == 'Not Found' || result == 'Unexpected Error') {
            await axios.get(`https://playerdb.co/api/player/minecraft/${uuid}`)
                .then(response => {
                    if (response.data) {
                        result = response.data.data.player.username
                        console.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`)
                    } else {
                        result = 'Not Found'
                        console.warn(`[玩家資料] 無法取得玩家 ${uuid} 的名稱: ${response.data.errorMessage}`)
                    }
                })
                .catch(error => {
                    result = 'Unexpected Error'
                    console.error(`[玩家資料] 查詢玩家名稱時發現錯誤: ${error}`)
                });
        }
        
        return result
    }

    async function get_all_user_data() {
        const selectSql = 'SELECT * FROM user_data';

        return await new Promise((resolve, reject) => {
            executeQuery(selectSql, [], (err, rows) => {
                if (err) {
                    console.error(err);
                    reject('Unexpected Error');
                } else if (rows === undefined || rows.length === 0) {
                    reject('Not Found');
                } else {
                    resolve(rows);
                }
            });
        })
        .then(rows => {
            console.debug(`[資料庫] 找到所有玩家資料: ${rows.length}`);
            return rows;
        })
        .catch(err => {
            return err
        });
    }

    async function update_player_id(player_uuid, player_id) {
        const updateSql = 'UPDATE user_data SET player_id = ? WHERE player_uuid = ?';

        return await new Promise((resolve, reject) => {
            executeQuery(updateSql, [player_id, player_uuid], (err) => {
                if (err) {
                    console.error(err);
                    reject('Unexpected Error');
                } else {
                    resolve();
                }
            });
        })
        .then(() => {
            console.debug(`[資料庫] 更新玩家 ID: ${player_uuid} (${player_id})`);
        })
        .catch(err => {
            console.warn(`[資料庫] 無法更新玩家 ID: ${err}`);
        });
    }

    async function init_username() {
        const userdata = await get_all_user_data();
        if (!userdata || userdata == 'Not Found' || userdata == 'Unexpected Error') return;

        for (const player of userdata) {
            if (!player.player_id) {
                await update_player_id(player.player_uuid, await get_player_name(player.player_uuid))
                console.debug(`[資料庫] 玩家 ${player.player_uuid} 的名稱已更新`)
            }
        }   
    }

    async function clean_wallet_data() {
        const selectSql = 'SELECT * FROM wallet';

        return await new Promise((resolve, reject) => {
            executeQuery(selectSql, [], (err, rows) => {
                if (err) {
                    console.error(err);
                    reject('Unexpected Error');
                } else if (rows === undefined || rows.length === 0) {
                    reject('Not Found');
                } else {
                    resolve(rows);
                }
            });
        })
        .then(async rows => {
            console.log(`[資料庫] 找到錢包資料: ${JSON.stringify(rows)}`);

            const playerUuids = [...new Set(rows.map(row => row.player_uuid))];

            for (const playerUuid of playerUuids) {
                const playerRows = rows.filter(row => row.player_uuid === playerUuid);

                if (playerRows.length > 1) {
                    let maxRow = playerRows[0];

                    for (const row of playerRows) {
                        if (row.emerald_amount > maxRow.emerald_amount || row.coin_amount > maxRow.coin_amount) {
                            maxRow = row;
                        }
                    }

                    const deleteIds = playerRows.filter(row => row.id !== maxRow.id).map(row => row.id);
                    const retainedRow = maxRow;

                    for (const id of deleteIds) {
                        const deleteSql = 'DELETE FROM wallet WHERE id = ?';
                        await new Promise((resolve, reject) => {
                            executeQuery(deleteSql, [id], (err) => {
                                if (err) {
                                    console.error(err);
                                    reject('Unexpected Error');
                                } else {
                                    console.log(`[資料庫] 刪除資料: id = ${id}`);
                                    resolve();
                                }
                            });
                        });
                    }

                    console.log(`[資料庫] 保留資料: ${JSON.stringify(retainedRow)}`);
                }
            }

            return 'Cleanup completed';
        })
        .catch(err => {
            console.log(`[資料庫] 無法清理錢包資料: ${err}`);
            return err;
        });
    }

    async function removeHyphensFromPlayerUuid(tableName) {
        const selectSql = `SELECT * FROM ${tableName} WHERE player_uuid LIKE '%-%'`;
        const updateSql = `UPDATE ${tableName} SET player_uuid = ? WHERE player_uuid = ?`;

        return await new Promise((resolve, reject) => {
            executeQuery(selectSql, [], (err, rows) => {
                if (err) {
                    console.error(err);
                    reject('Unexpected Error');
                } else if (rows === undefined || rows.length === 0) {
                    resolve(`No rows with hyphens in ${tableName}`);
                } else {
                    const updatePromises = rows.map(row => {
                        const newPlayerUuid = row.player_uuid.replace(/-/g, '');
                        return new Promise((resolve, reject) => {
                            executeQuery(updateSql, [newPlayerUuid, row.player_uuid], (err) => {
                                if (err) {
                                    console.error(err);
                                    reject('Unexpected Error');
                                } else {
                                    resolve();
                                }
                            });
                        });
                    });

                    Promise.all(updatePromises)
                        .then(() => resolve(`Updated ${tableName}`))
                        .catch(err => reject(err));
                }
            });
        });
    }

    async function run() {
        initDB();
        await checkDB();
        await init_username();
        await clean_wallet_data()
            .then(maxRow => {
                console.log(`保留的資料: ${JSON.stringify(maxRow)}`);
            })
            .catch(err => {
                console.error(`錯誤: ${err}`);
            });

        try {
            await removeHyphensFromPlayerUuid('bet_history');
            await removeHyphensFromPlayerUuid('pay_history');
            await removeHyphensFromPlayerUuid('user_data');
            await removeHyphensFromPlayerUuid('wallet');
            console.log('All tables updated successfully');
        } catch (err) {
            console.error(`Error updating tables: ${err}`);
        }

        closeDB();
    }

    run()
        .then(() => process.exit(0))
        .catch((e) => console.error('Unexpected Error', e));
}