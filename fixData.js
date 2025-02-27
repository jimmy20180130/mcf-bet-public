if (process.argv.includes('--spawned')) {
    const sqlite3 = require('sqlite3').verbose();
    const axios = require('axios');

    let db = null;

    // 初始化資料庫連線
    function initDB() {
        db = new sqlite3.Database(`${process.cwd()}/data/data.db`, (err) => {
            if (err) {
                console.error(`[資料庫] 無法連接至資料庫: ${err.message}`);
            } else {
                console.log(`[資料庫] 已連接至資料庫 ${process.cwd()}/data/data.db`);
            }
        });
    }

    // 關閉資料庫連線
    function closeDB() {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error(`[資料庫] 關閉資料庫時發生錯誤：${err.message}`);
                } else {
                    console.log(`[資料庫] 已關閉資料庫`);
                }
            });
        }
    }

    // 封裝 db.run 為 Promise
    function runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            db.run(query, params, function (err) {
                if (err) {
                    if (!err.message.includes('duplicate column name: player_id')) {
                        console.error(`[資料庫] 執行查詢錯誤: ${query}, 參數: ${params}, 錯誤: ${err.message}`);
                    }
                    return reject(err);
                }
                console.log(`[資料庫] 已執行查詢: "${query}" with params: "${params}"`);
                resolve(this);
            });
        });
    }

    // 封裝 db.all 為 Promise
    function getAll(query, params = []) {
        return new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error(`[資料庫] 執行查詢錯誤: ${query}, 參數: ${params}, 錯誤: ${err.message}`);
                    return reject(err);
                }
                console.log(`[資料庫] 已取得資料: "${query}" with params: "${params}"`);
                resolve(rows);
            });
        });
    }

    // 更新資料庫結構：為 user_data 新增 player_id 欄位
    async function checkDB() {
        try {
            await runQuery(`ALTER TABLE user_data ADD COLUMN player_id TEXT`);
            console.log('[資料庫] user_data 已新增 player_id 欄位');
        } catch (err) {
            // 若錯誤原因為欄位已存在，則略過
            if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
                console.debug('[資料庫] player_id 欄位已存在');
            } else {
                console.error('[資料庫] 更新 user_data 表格時發生錯誤:', err.message);
            }
        }
    }

    async function addData() {
        // check if column data exists in pay_history
        const checkColumnSql = 'PRAGMA table_info(pay_history)';
        const checkColumnResult = await getAll(checkColumnSql);
        const columnExists = checkColumnResult.some(column => column.name === 'data');

        if (!columnExists) {
            // add column data to pay_history
            const addColumnSql = 'ALTER TABLE pay_history ADD COLUMN data TEXT';
            try {
                await runQuery(addColumnSql);
                console.log('[資料庫] pay_history 已新增 data 欄位');
            } catch (err) {
                console.error('[資料庫] 更新 pay_history 表格時發生錯誤:', err.message);
            }
        } else {
            console.log('[資料庫] pay_history data 欄位已存在');
        }
    }

    // 建立 blacklist 表格
    async function add_blacklist() {
        const createSql = 'CREATE TABLE IF NOT EXISTS blacklist (player_uuid TEXT, time INTEGER, last INTEGER, reason TEXT, notified TEXT)';
        try {
            await runQuery(createSql);
            console.log('[資料庫] blacklist 表格確認/建立完成');
        } catch (err) {
            console.error('[資料庫] 建立 blacklist 表格失敗:', err.message);
            throw err;
        }
    }

    // 取得玩家名稱，優先使用 primary API，失敗則呼叫備用 API
    async function get_player_name(uuid) {
        if (uuid === '所有人' || uuid === 'Unexpected Error') return 'Unexpected Error';
        let result = null;
        try {
            let response = await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
            if (response.data && response.data.name) {
                result = response.data.name;
                console.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`);
            }
        } catch (e) {
            console.error(`[玩家資料] 查詢玩家名稱失敗，嘗試備用 API: ${e}`);
        }
        if (!result) {
            try {
                let response = await axios.get(`https://playerdb.co/api/player/minecraft/${uuid}`);
                if (response.data && response.data.data && response.data.data.player && response.data.data.player.username) {
                    result = response.data.data.player.username;
                    console.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`);
                }
            } catch (e) {
                console.error(`[玩家資料] 備用 API 查詢失敗: ${e}`);
                result = 'Unexpected Error';
            }
        }
        return result || 'Not Found';
    }

    // 取得所有 user_data 資料
    async function get_all_user_data() {
        const selectSql = 'SELECT * FROM user_data';
        try {
            let rows = await getAll(selectSql);
            if (!rows || rows.length === 0) throw new Error('Not Found');
            console.debug(`[資料庫] 找到所有玩家資料: ${rows.length}`);
            return rows;
        } catch (err) {
            console.error('[資料庫] 取得 user_data 失敗:', err.message);
            throw err;
        }
    }

    // 更新指定玩家的 player_id 欄位
    async function update_player_id(player_uuid, player_id) {
        const updateSql = 'UPDATE user_data SET player_id = ? WHERE player_uuid = ?';
        try {
            await runQuery(updateSql, [player_id, player_uuid]);
            console.debug(`[資料庫] 更新玩家 ID: ${player_uuid} (${player_id})`);
        } catch (err) {
            console.error(`[資料庫] 更新玩家 ID 失敗: ${err.message}`);
            throw err;
        }
    }

    // 初始化所有玩家名稱 (player_id)
    async function init_username() {
        try {
            const userdata = await get_all_user_data();
            for (const player of userdata) {
                if (!player.player_id) {
                    const playerName = await get_player_name(player.player_uuid);
                    await update_player_id(player.player_uuid, playerName);
                    console.debug(`[資料庫] 玩家 ${player.player_uuid} 的名稱已更新`);
                }
            }
        } catch (err) {
            console.error('[資料庫] 初始化玩家名稱失敗:', err.message);
        }
    }

    // 清理 wallet 資料：針對相同 player_uuid 保留最高數值資料，其他刪除，並以交易方式執行
    async function clean_wallet_data() {
        try {
            await runQuery('BEGIN TRANSACTION');
            const rows = await getAll('SELECT * FROM wallet');
            if (!rows || rows.length === 0) {
                console.log('[資料庫] wallet 表無資料');
                await runQuery('COMMIT');
                return;
            }
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
                    for (const id of deleteIds) {
                        await runQuery('DELETE FROM wallet WHERE id = ?', [id]);
                        console.log(`[資料庫] 刪除 wallet 資料: id = ${id}`);
                    }
                    console.log(`[資料庫] 保留 wallet 資料: ${JSON.stringify(maxRow)}`);
                }
            }
            await runQuery('COMMIT');
            console.log('[資料庫] wallet 清理完成');
        } catch (err) {
            console.error('[資料庫] 清理 wallet 資料失敗:', err.message);
            await runQuery('ROLLBACK');
            throw err;
        }
    }

    // 移除指定資料表中 player_uuid 的連字符，並以交易方式執行
    async function removeHyphensFromPlayerUuid(tableName) {
        try {
            await runQuery('BEGIN TRANSACTION');
            const rows = await getAll(`SELECT * FROM ${tableName} WHERE player_uuid LIKE '%-%'`);
            if (!rows || rows.length === 0) {
                console.log(`[資料庫] ${tableName} 無包含連字符的 player_uuid`);
                await runQuery('COMMIT');
                return;
            }
            for (const row of rows) {
                const newPlayerUuid = row.player_uuid.replace(/-/g, '');
                await runQuery(`UPDATE ${tableName} SET player_uuid = ? WHERE player_uuid = ?`, [newPlayerUuid, row.player_uuid]);
                console.log(`[資料庫] ${tableName} 更新 player_uuid: ${row.player_uuid} -> ${newPlayerUuid}`);
            }
            await runQuery('COMMIT');
            console.log(`[資料庫] ${tableName} player_uuid 更新完成`);
        } catch (err) {
            console.error(`[資料庫] ${tableName} 更新 player_uuid 失敗:`, err.message);
            await runQuery('ROLLBACK');
            throw err;
        }
    }

    // 主流程：依序執行各項更新與清理作業
    async function run() {
        initDB();
        // 等待連線初始化（可依需求調整等待時間）
        await new Promise(resolve => setTimeout(resolve, 100));
        await checkDB();
        await addData()
        await init_username();
        await clean_wallet_data();
        try {
            await add_blacklist();
            await removeHyphensFromPlayerUuid('bet_history');
            await removeHyphensFromPlayerUuid('pay_history');
            await removeHyphensFromPlayerUuid('user_data');
            await removeHyphensFromPlayerUuid('wallet');
            console.log('所有表格更新成功');
        } catch (err) {
            console.error(`更新表格時發生錯誤: ${err.message}`);
        }
        closeDB();
    }

    run()
        .then(() => process.exit(0))
        .catch((e) => console.error('Unexpected Error', e));
}
