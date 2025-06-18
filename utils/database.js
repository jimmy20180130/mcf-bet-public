const { executeQuery } = require(`../utils/db_write.js`);
const Logger = require("../utils/logger.js");
const moment = require("moment-timezone");

// Helper to wrap queries
async function query(sql, params = [], single = false) {
    try {
        const rows = await new Promise((resolve, reject) => {
            executeQuery(sql, params, (err, result) =>
                err ? reject(err) : resolve(result)
            );
        });
        Logger.debug(`[DB] Executed: ${sql} Params: ${JSON.stringify(params)}`);
        if (!rows || rows.length === 0) throw new Error("NotFound");
        return single ? rows[0] : rows;
    } catch (err) {
        Logger.warn(`[DB] Query failed: ${err.message}`);
        return err.message === "NotFound" ? "Not Found" : "Unexpected Error";
    }
}

// Helper to run non-select statements
async function execute(sql, params = []) {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(sql, params, (err) => (err ? reject(err) : resolve()));
        });
        Logger.debug(`[DB] Executed: ${sql} Params: ${JSON.stringify(params)}`);
    } catch (err) {
        Logger.warn(`[DB] Execute failed: ${err.message}`);
        return "Unexpected Error";
    }
}

// User Data
async function get_user_data(player_uuid = undefined, discord_id = undefined) {
    return await query(
        "SELECT * FROM user_data WHERE player_uuid = ? OR discord_id = ?",
        [player_uuid, discord_id],
        true
    );
}

async function create_user_data(player_uuid, discord_id, player_id) {
    return await execute(
        "INSERT INTO user_data (discord_id, player_uuid, create_time, player_id) VALUES (?, ?, ?, ?)",
        [discord_id, player_uuid, Math.floor(Date.now() / 1000), player_id]
    );
}

async function remove_user_data(
    player_uuid = undefined,
    discord_id = undefined
) {
    return await execute(
        "DELETE FROM user_data WHERE player_uuid = ? OR discord_id = ?",
        [player_uuid, discord_id]
    );
}

// Daily Data
async function create_daily_data(player_uuid) {
    return await execute(
        "INSERT INTO daily (player_uuid, date_code) VALUES (?, ?)",
        [player_uuid, ""]
    );
}

async function get_daily_data(player_uuid) {
    const row = await query(
        "SELECT * FROM daily WHERE player_uuid = ?",
        [player_uuid],
        true
    );
    
    const date_code = moment().tz("Asia/Taipei").format("YYYYMMDD");
    if ((row.date_code || "").split(",").some((d) => d.startsWith(date_code))) {
        return "Already Signed";
    }

    return row;
}

async function write_daily_data(player_uuid, role, amount) {
    const date_code = moment().tz("Asia/Taipei").format("YYYYMMDD");
    const daily_data = `${date_code}|${role}|${amount}`;
    return await execute("UPDATE daily SET date_code = ? WHERE player_uuid = ?", [
        daily_data,
        player_uuid,
    ]);
}

// Wallet
async function create_player_wallet(player_uuid) {
    return await execute(
        "INSERT INTO wallet (player_uuid, emerald_amount, coin_amount) VALUES (?, ?, ?)",
        [player_uuid, 0, 0]
    );
}

async function get_player_wallet(player_uuid, type) {
    const row = await query(
        `SELECT ${type}_amount FROM wallet WHERE player_uuid = ?`,
        [player_uuid],
        true
    );
    return row[`${type}_amount`];
}

async function set_player_wallet(player_uuid, amount, type) {
    return await execute(
        `UPDATE wallet SET ${type}_amount = ? WHERE player_uuid = ?`,
        [amount, player_uuid]
    );
}

async function get_all_player_wallet() {
    return await query("SELECT * FROM wallet");
}

// History
async function write_pay_history(
    pay_uuid,
    player_uuid,
    amount,
    result,
    time,
    type,
    data
) {
    return await execute(
        "INSERT INTO pay_history (amount, type, result, time, player_uuid, pay_uuid, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [amount, type, result, time, player_uuid, pay_uuid, data]
    );
}

async function write_bet_record(
    bet_uuid,
    player_uuid,
    amount,
    odds,
    return_amount,
    type,
    result,
    time
) {
    return await execute(
        "INSERT INTO bet_history (amount, result_amount, odds, bet_type, time, result, player_uuid, bet_uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [amount, return_amount, odds, type, time, result, player_uuid, bet_uuid]
    );
}

// Generic
async function customsql(sql, params) {
    return await query(sql, params);
}

async function get_all_user_data() {
    return await query("SELECT * FROM user_data");
}

async function get_all_bet_record() {
    return await query("SELECT * FROM bet_history");
}

async function get_bet_record(player_uuid) {
    return await query("SELECT * FROM bet_history WHERE player_uuid = ?", [
        player_uuid,
    ]);
}

async function get_all_users() {
    const rows = await query("SELECT * FROM user_data");
    return rows.map((r) => r.discord_id);
}

async function get_all_players() {
    const rows = await query("SELECT * FROM user_data");
    return rows.map((r) => r.player_id);
}

async function update_player_id(player_uuid, player_id) {
    return await execute(
        "UPDATE user_data SET player_id = ? WHERE player_uuid = ?",
        [player_id, player_uuid]
    );
}

// Blacklist
async function get_blacklist() {
    return await query("SELECT * FROM blacklist");
}

async function add_blacklist(player_uuid, last, reason) {
    return await execute(
        "INSERT INTO blacklist (player_uuid, time, last, reason, notified) VALUES (?, ?, ?, ?, ?)",
        [player_uuid, Math.floor(Date.now() / 1000), last, reason, false]
    );
}

async function remove_blacklist(player_uuid) {
    return await execute("DELETE FROM blacklist WHERE player_uuid = ?", [
        player_uuid,
    ]);
}

async function notified_blacklist(player_uuid) {
    return await execute(
        "UPDATE blacklist SET notified = ? WHERE player_uuid = ?",
        [true, player_uuid]
    );
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
    get_all_bet_record,
    get_bet_record,
    get_all_users,
    get_all_players,
    update_player_id,
    get_all_user_data,
    get_blacklist,
    add_blacklist,
    remove_blacklist,
    notified_blacklist,
    get_all_player_wallet,
    customsql,
};
