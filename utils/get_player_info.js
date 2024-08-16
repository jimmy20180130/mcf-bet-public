const Logger = require('./logger');
const axios = require('axios');
const fs = require('fs');
const { update_player_id } = require('./database');

// [{"uuid": "uuid", "playerid": "name", "time": 12345}]
let uuids = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8')).player_names;

async function get_player_uuid(playerid) {
    for (const item of uuids) {
        if (item['playerid'] == playerid && item['time'] + 900000 > Date.now()) {
            Logger.debug(`[玩家資料] 從快取取得玩家 ${playerid} 的 UUID: ${item['uuid']}`)
            return item['uuid']
        }
    }

    let result;

    await axios.get(`https://api.mojang.com/users/profiles/minecraft/${playerid}`)
        .then(response => {
            if (response.data && response.data.id) {
                result = response.data.id
                Logger.debug(`[玩家資料] 玩家 ${playerid} 的 UUID: ${result}`)
            } else {
                Logger.warn(`[玩家資料] 無法取得玩家 ${playerid} 的 UUID: ${response.data.errorMessage}`)
                result = 'Not Found'
            }
        })
        .catch(error => {
            Logger.error(`[玩家資料] 查詢玩家 UUID 時發現錯誤: ${error}`)
            result = 'Unexpected Error'
        });

    if (!result || result == 'Not Found' || result == 'Unexpected Error') {
        await axios.get(`https://playerdb.co/api/player/minecraft/${playerid}`)
            .then(response => {
                if (response.data) {
                    result = response.data.data.player.id
                    Logger.debug(`[玩家資料] 玩家 ${playerid} 的 UUID: ${result}`)
                } else {
                    Logger.warn(`[玩家資料] 無法取得玩家 ${playerid} 的 UUID: ${response.data.errorMessage}`)
                    result = 'Not Found'
                }
            })
            .catch(error => {
                Logger.error(`[玩家資料] 查詢玩家 UUID 時發現錯誤: ${error}`)
                result = 'Unexpected Error'
            });
    }

    if (result && result != 'Not Found' && result != 'Unexpected Error') {
        uuids.push({"uuid": result, "playerid": playerid, "time": Date.now()})
        await update_player_id(result, playerid);
    }

    return result
}

async function get_player_name(uuid) {
    let result = undefined;

    for (const item of uuids) {
        if (item['uuid'] == uuid && item['time'] + 900000 > Date.now()) {
            Logger.debug(`[玩家資料] 從快取取得玩家 ${uuid} 的名稱: ${item['playerid']}`)
            return item['playerid']
        }
    }

    await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
        .then(response => {
            if (response.data) {
                result = response.data.name
                Logger.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`)
            } else {
                result = 'Not Found'
                Logger.warn(`[玩家資料] 無法取得玩家 ${uuid} 的名稱: ${response.data.errorMessage}`)
            }
        })
        .catch(error => {
            result = 'Unexpected Error'
            Logger.error(`[玩家資料] 查詢玩家名稱時發現錯誤: ${error}`)
        });

    if (!result || result == 'Not Found' || result == 'Unexpected Error') {
        await axios.get(`https://playerdb.co/api/player/minecraft/${uuid}`)
            .then(response => {
                if (response.data) {
                    result = response.data.data.player.username
                    Logger.debug(`[玩家資料] 玩家 ${uuid} 的名稱: ${result}`)
                } else {
                    result = 'Not Found'
                    Logger.warn(`[玩家資料] 無法取得玩家 ${uuid} 的名稱: ${response.data.errorMessage}`)
                }
            })
            .catch(error => {
                result = 'Unexpected Error'
                Logger.error(`[玩家資料] 查詢玩家名稱時發現錯誤: ${error}`)
            });
    }

    if (result && result != 'Not Found' && result != 'Unexpected Error') {
        uuids.push({
            playerid: result,
            'uuid': uuid,
            time: Date.now()
        })
        await update_player_id(uuid, result);
    }
    
    return result
}

let update1 = setInterval(async () => {
    Logger.debug('[玩家資料] 開始更新玩家資料快取');
    const now = Date.now();
    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));

    for (const item of cache.player_names) {
        if (item.time + 900000 < now) {
            await get_player_uuid(item.playerid);
            
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}, 1200000);

let update2 = setInterval(() => {
    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
    cache.player_names = uuids;
    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4), 'utf8');
}, 1200000);

function clear_interval() {
    clearInterval(update1);
    clearInterval(update2);
}

module.exports = {
    get_player_uuid,
    get_player_name,
    clear_interval
};