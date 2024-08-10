const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// check if data/data.db exists
if (!fs.existsSync('data/data.db')) {
    const data_db = new sqlite3.Database('./data/data.db');

    //create table
    data_db.serialize(() => {
        data_db.run('CREATE TABLE "bet_history" ("amount" INTEGER,"result_amount" INTEGER,"odds" INTEGER,"bet_type" TEXT,"time" INTEGER,"result" TEXT,"player_uuid" TEXT,"bet_uuid" TEXT)');
        data_db.run('CREATE TABLE "daily" ("player_uuid" INTEGER,"date_code" TEXT)')
        data_db.run('CREATE TABLE "data_change_history" ("discord_id" INTEGER,"player_uuid" TEXT,"table" TEXT,"change_type" TEXT,"original_value" TEXT,"after_value" TEXT)')
        data_db.run('CREATE TABLE "pay_history" ("pay_uuid" TEXT,"player_uuid" TEXT,"amount" INTEGER,"result" TEXT,"time" INTEGER, "type" TEXT)')
        data_db.run('CREATE TABLE "user_data" ("discord_id" TEXT,"player_uuid" TEXT, "create_time" INTEGER)')
        data_db.run('CREATE TABLE "wallet" ("player_uuid" TEXT,"emerald_amount" INTEGER,"coin_amount" INTEGER)')
    });

    data_db.close();
}

// open data/pay_history.db

const pay_history_db = new sqlite3.Database('./data/pay_history.db');

// get all data from data/pay_history.db
pay_history_db.all('SELECT * FROM pay_history', (err, rows) => {
    if (err) {
        console.error(err);
    }

    // open data/data.db
    const data_db = new sqlite3.Database('./data/data.db');

    // insert all data from data/pay_history.db to data/data.db
    data_db.serialize(() => {
        const stmt = data_db.prepare('INSERT INTO bet_history VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

        rows.forEach((row) => {
            stmt.run(row.amount, row.win, row.odds, row.bet_type, row.time, row.status, row.player_uuid, row.pay_uuid);
        });

        stmt.finalize();
    });

    data_db.close();
});

pay_history_db.close();

const user_data_db = new sqlite3.Database('./data/user_data.db');

// get all data from data/user_data.db
user_data_db.all('SELECT * FROM user', (err, rows) => {
    if (err) {
        console.error(err);
    }

    // open data/data.db
    const data_db = new sqlite3.Database('./data/data.db');

    // insert all data from data/user_data.db to data/data.db
    data_db.serialize(() => {
        const stmt = data_db.prepare('INSERT INTO user_data VALUES (?, ?, ?)');

        rows.forEach((row) => {
            stmt.run(row.discord_id, row.player_uuid, row.create_time);
        });

        stmt.finalize();
    });

    data_db.close();
});

user_data_db.close();

// create a folder called backup
if (!fs.existsSync('backup')) {
    fs.mkdirSync('backup');
}

// move data/pay_history.db to backup/pay_history.db
fs.renameSync('data/pay_history.db', 'backup/pay_history.db');
// move data/user_data.db to backup/user_data.db
fs.renameSync('data/user_data.db', 'backup/user_data.db');
// remove data/errors.db
fs.unlinkSync('data/errors.db');
// move all files in config to backup
fs.readdirSync('config').forEach(file => {
    fs.renameSync(`config/${file}`, `backup/${file}`);
});

// download json file from github (config, messages, roles, commands)
const https = require('https');

const download = (url, dest, cb) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(cb);
        });
    });
}

download('https://raw.githubusercontent.com/mcf-bet/mcf-bet-public/main/config/commands.json', 'config/commands.json', () => {
    console.log('commands.json downloaded');
});

download('https://raw.githubusercontent.com/mcf-bet/mcf-bet-public/main/config/messages.json', 'config/messages.json', () => {
    console.log('messages.json downloaded');
});

download('https://raw.githubusercontent.com/mcf-bet/mcf-bet-public/main/config/roles.json', 'config/roles.json', () => {
    console.log('roles.json downloaded');
});

download('https://raw.githubusercontent.com/mcf-bet/mcf-bet-public/main/config/config.json', 'config/config.json', () => {
    console.log('config.json downloaded');
});

// finished migration
console.log('Migration finished');