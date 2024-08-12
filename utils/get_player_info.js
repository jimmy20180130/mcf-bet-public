const Logger = require('./logger');
const axios = require('axios');

// [{"uuid": "uuid", "playerid": "name", "time": 12345}]
let uuids = [];

async function get_player_uuid(playerid) {
    for (const item of uuids) {
        if (item['playerid'] == playerid && item['time'] + 900000 > Date.now()) {
            Logger.debug(`[玩家資料] 從快取取得玩家 ${playerid} 的 UUID: ${item['uuid']}`)
            return item['uuid']
        }
    }

    return await new Promise(async (resolve, reject) => {
        let result;
        await axios.get(`https://api.mojang.com/users/profiles/minecraft/${playerid}`)
            .then(response => {
                if (response.data && response.data.id) {
                    result = response.data.id
                    uuids.push({"uuid": result, "playerid": playerid, "time": Date.now()})
                    Logger.debug(`[玩家資料] 玩家 ${playerid} 的 UUID: ${result}`)
                } else {
                    Logger.warn(`[玩家資料] 無法取得玩家 ${playerid} 的 UUID: ${response.data.errorMessage}`)
                    result = 'Not Found'
                }
            })
            .catch(error => {
                Logger.error(`[玩家賳料] 查詢玩家 UUID 時發現錯誤: ${error}`)
                result = 'Unexpected Error'
            });
        
        resolve(result)
    })
    .then(result => result)
    .catch(error => Logger.error(`[玩家資料] 無法取得玩家 ${playerid} 的 UUID: ${error}`));
}

async function get_player_name(uuid) {
    let result = undefined;

    for (const item of uuids) {
        if (item['result'] == result) {
            Logger.debug(`[玩家資料] 從快取取得玩家 ${uuid} 的名稱: ${item['playerid']}`)
            result = item['playerid']
            break
        }
    }

    axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
        .then(response => {
            if (response.data) {
                result = response.data.name
                Logger.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`)
            } else {
                result = 'Not Found'
                Logger.warn(`[玩家賳料] 無法取得玩家 ${uuid} 的名稱: ${response.data.errorMessage}`)
            }
        })
        .catch(error => {
            result = 'Unexpected Error'
            Logger.error(`[玩家賳料] 查詢玩家名稱時發現錯誤: ${error}`)
        });

    if (result && result != '無法取得') {
        uuids.push({
            playerid: result,
            result: uuid
        })
    }
    
    return result
}

module.exports = {
    get_player_uuid,
    get_player_name
};