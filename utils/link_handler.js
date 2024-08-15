const { create_user_data, get_user_data } = require(`../utils/database.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);
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
        result = result[0]
        await create_user_data(result.player_uuid, discord_id, await get_player_name(result.player_uuid))
        Logger.debug(`[綁定] ${discord_id} 綁定成功，綁定的 UUID 為 ${result.player_uuid}`);
        return result.player_uuid
    } else {
        return false
    }
}

const add_code = async (code, player_uuid) => {
    codes = codes.filter(code_item => code_item.player_uuid != player_uuid)
    codes.push({time: Math.round(new Date() / 1000), code: code, player_uuid: player_uuid})
    Logger.debug(`[綁定] 已新增驗證碼 ${code} 並綁定至 ${player_uuid}`);
}

const check_codes = async () => {
    while (true) {
        codes = codes.filter(code_item => code_item.time + 600 > Math.round(new Date() / 1000))

        await new Promise(r => setTimeout(r, 5000))
    }
}

module.exports = {
    add_code,
    check_codes,
    validate_code
}