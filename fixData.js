const sqlite3 = require('sqlite3').verbose();

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