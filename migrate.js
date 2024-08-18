const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const https = require('https');
const path = require('path');

// 輔助函數：確保目錄存在
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// 輔助函數：安全地移動檔案
function safeRename(oldPath, newPath) {
    return new Promise((resolve, reject) => {
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                if (err.code === 'EBUSY' || err.code === 'ENOENT') {
                    console.log(`無法移動 ${oldPath}，嘗試複製然後刪除...`);
                    fs.copyFile(oldPath, newPath, (copyErr) => {
                        if (copyErr) {
                            reject(copyErr);
                        } else {
                            fs.unlink(oldPath, (unlinkErr) => {
                                if (unlinkErr) {
                                    console.warn(`無法刪除原始檔案 ${oldPath}: ${unlinkErr}`);
                                }
                                resolve();
                            });
                        }
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve();
            }
        });
    });
}

// 輔助函數：從 URL 下載檔案
function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(`${dest} 下載完成`));
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function migrateDatabase() {
    console.log('開始資料庫遷移...');

    // 確保資料目錄存在
    ensureDirectoryExistence('./data');

    // 檢查 data/data.db 是否存在
    if (!fs.existsSync('data/data.db')) {
        console.log('創建新的 data.db...');
        const data_db = new sqlite3.Database('./data/data.db');

        // 創建表格
        await new Promise((resolve, reject) => {
            data_db.serialize(() => {
                data_db.run('CREATE TABLE "bet_history" ("amount" INTEGER,"result_amount" INTEGER,"odds" INTEGER,"bet_type" TEXT,"time" INTEGER,"result" TEXT,"player_uuid" TEXT,"bet_uuid" TEXT)');
                data_db.run('CREATE TABLE "daily" ("player_uuid" INTEGER,"date_code" TEXT)');
                data_db.run('CREATE TABLE "data_change_history" ("discord_id" INTEGER,"player_uuid" TEXT,"table" TEXT,"change_type" TEXT,"original_value" TEXT,"after_value" TEXT)');
                data_db.run('CREATE TABLE "pay_history" ("pay_uuid" TEXT,"player_uuid" TEXT,"amount" INTEGER,"result" TEXT,"time" INTEGER, "type" TEXT)');
                data_db.run('CREATE TABLE "user_data" ("discord_id" TEXT,"player_uuid" TEXT, "create_time" INTEGER, "player_id" TEXT)');
                data_db.run('CREATE TABLE "wallet" ("player_uuid" TEXT,"emerald_amount" INTEGER,"coin_amount" INTEGER)', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        data_db.close();
    }

    if (fs.existsSync('data/pay_history.db')) {
        // 遷移 pay_history.db 的資料
        console.log('遷移 pay_history.db 的資料...');
        const pay_history_db = new sqlite3.Database('./data/pay_history.db');
        const rows = await new Promise((resolve, reject) => {
            pay_history_db.all('SELECT * FROM pay_history', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const data_db = new sqlite3.Database('./data/data.db');
        await new Promise((resolve, reject) => {
            data_db.serialize(() => {
                data_db.run('BEGIN TRANSACTION');
                const stmt = data_db.prepare('INSERT INTO bet_history (amount, result_amount, odds, bet_type, time, result, player_uuid, bet_uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        
                rows.forEach((row) => {
                    console.log(JSON.stringify(row))
                    stmt.run(row.amount, row.win, row.odds, row.bet_type, row.time, row.status, row.player_uuid, row.pay_uuid);
                });
        
                stmt.finalize((err) => {
                    if (err) {
                        data_db.run('ROLLBACK');
                        reject(err);
                    } else {
                        data_db.run('COMMIT', (commitErr) => {
                            if (commitErr) reject(commitErr);
                            else resolve();
                        });
                    }
                });
            });
        });
        

        data_db.close();
        pay_history_db.close();   
    }

    if (fs.existsSync('data/user_data.db')) {
        // 遷移 user_data.db 的資料
        console.log('遷移 user_data.db 的資料...');
        const user_data_db = new sqlite3.Database('./data/user_data.db');
        const userRows = await new Promise((resolve, reject) => {
            user_data_db.all('SELECT * FROM user', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const data_db2 = new sqlite3.Database('./data/data.db');
        await new Promise((resolve, reject) => {
            data_db2.serialize(() => {
                const stmt = data_db2.prepare('INSERT INTO user_data VALUES (?, ?, ?, ?)');
                userRows.forEach((row) => {
                    if (row.discord_id == 0 || row.discord_id == '0') return;

                    console.log(JSON.stringify(row));
                    stmt.run(row.discord_id, row.player_uuid, row.create_time, '');
                });
                stmt.finalize((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        data_db2.close();
        user_data_db.close();
    }

    // 創建備份文件夾
    ensureDirectoryExistence('backup');

    // 移動舊資料庫檔案到備份文件夾
    console.log('移動舊資料庫檔案到備份文件夾...');
    await safeRename('data/pay_history.db', 'backup/pay_history.db');
    await safeRename('data/user_data.db', 'backup/user_data.db');

    // 刪除 errors.db
    if (fs.existsSync('data/errors.db')) {
        fs.unlinkSync('data/errors.db');
        console.log('已刪除 errors.db');
    }

    // 移動 config 文件夾中的所有檔案到備份文件夾
    console.log('移動 config 檔案到備份文件夾...');
    const configFiles = fs.readdirSync('config');
    for (const file of configFiles) {
        await safeRename(`config/${file}`, `backup/${file}`);
    }

    // 從 GitHub 下載新的配置檔案
    console.log('從 GitHub 下載新的配置檔案...');
    const files = ['commands.json', 'messages.json', 'roles.json', 'config.json'];
    for (const file of files) {
        const url = `https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/config/${file}`;
        const dest = `config/${file}`;
        try {
            await download(url, dest);
        } catch {
            console.log(`下載失敗，請自行至 https://github.com/jimmy20180130/mcf-bet-public 下載 config 資料夾中的 ${file}`)
        }
    }

    console.log('遷移完成');
}

async function migrate_config() {
    const old_config = JSON.parse(fs.readFileSync(`${process.cwd()}/backup/config.json`, 'utf8'));
    const new_config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
    // if old config includes key that new config has, then migrate

    for (const key of Object.keys(old_config)) {
        if (new_config[key]) {
            new_config[key] = old_config[key];
        }
    }

    fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(new_config, null, 4));
}

migrateDatabase().then(() => {
    migrate_config();
    console.log('遷移完成');
}).catch((err) => {
    console.error(`遷移失敗: ${err}`);
});