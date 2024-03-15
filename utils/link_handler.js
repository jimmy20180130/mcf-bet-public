const { create_player_data, get_pay_history, getPlayerRole, get_user_data } = require(`${process.cwd()}/utils/database.js`);
const { get_player_uuid, get_player_name } = require(`${process.cwd()}/utils/get_player_info.js`);
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const sqlite3 = require('sqlite3').verbose();

let codes = []

const validate_code = async (code, discord_id) => {
    let result = codes.filter(code_item => code_item.code == code)
    if (result.length > 0) {
        const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
        const query = `SELECT * FROM user WHERE discord_id = ?`

        const check_linked_promise = await new Promise(
            async (resolve, reject) => {
                user_data.all(query, [discord_id], async (err, row) => {
                    if (err) {
                        console.log(err)
                        reject(err)
                    } else {
                        if (row.length >= 1) {
                            resolve('already_linked')
                        }
                        resolve('not_linked')
                    }
                })
            }
        )

        if (check_linked_promise == 'already_linked') {
            return 'already_linked'
        }

        codes = codes.filter(code_item => code_item.code != code)
        const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
        cache.link = cache.link.filter(code_item => code_item.code != code)
        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 2), 'utf8');
        result = result[0]
        await create_player_data(await get_player_name(result.player_uuid), result.player_uuid, discord_id, config.roles.link_role)
        return result.player_uuid
    } else {
        return false
    }
}

const add_code = async (code, player_uuid) => {
    const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
    codes.push({time: Math.round(new Date() / 1000), code: code, player_uuid: player_uuid})
    cache.link.push({time: Math.round(new Date() / 1000), code: code, player_uuid: player_uuid})
    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 2), 'utf8');
}

const check_codes = async () => {
    while (true) {
        codes = codes.filter(code_item => code_item.time + 600 > Math.round(new Date() / 1000))
        const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
        cache.link = cache.link.filter(code_item => code_item.time + 600 > Math.round(new Date() / 1000))
        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 2), 'utf8');
        await new Promise(r => setTimeout(r, 5000))
    }
}

module.exports = {
    add_code,
    check_codes,
    validate_code
}