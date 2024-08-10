const { create_user_data, get_user_data } = require(`../utils/database.js`);
const fs = require('fs');
const Logger = require('../utils/logger.js');

let codes = []

const validate_code = async (code, discord_id) => {
    let result = codes.filter(code_item => code_item.code == code)
    if (result.length > 0) {
        const user_data = await get_user_data(discord_id)

        if (user_data && user_data != 'Not Found' && user_data != 'Unexpected Error') {
            Logger.debug(`[綁定] ${discord_id} 綁定失敗: 已經綁定過了`)
            return 'already_linked'
        }

        codes = codes.filter(code_item => code_item.code != code)
        const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
        cache.link = cache.link.filter(code_item => code_item.code != code)
        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 2), 'utf8');
        result = result[0]
        await create_user_data(result.player_uuid, discord_id)
        Logger.debug(`[綁定] ${discord_id} 綁定成功，綁定的 UUID 為 ${result.player_uuid}`);
        return result.player_uuid
    } else {
        return false
    }
}

const add_code = async (code, player_uuid) => {
    const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
    codes = codes.filter(code_item => code_item.player_uuid != player_uuid)
    cache.link = cache.link.filter(code_item => code_item.player_uuid != player_uuid)
    codes.push({time: Math.round(new Date() / 1000), code: code, player_uuid: player_uuid})
    cache.link.push({time: Math.round(new Date() / 1000), code: code, player_uuid: player_uuid})
    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 2), 'utf8');
    Logger.debug(`[綁定] 已新增驗證碼 ${code} 並綁定至 ${player_uuid}`);
}

const check_codes = async () => {
    while (true) {
        const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
        codes = codes.filter(code_item => code_item.time + 600 > Math.round(new Date() / 1000))

        if (codes.length < cache.link.length) {
            Logger.debug(`[綁定] 已清除 ${cache.link.length - codes.length} 個過期的驗譋碼`)
        }

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