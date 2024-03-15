const sqlite3 = require('sqlite3').verbose();
const user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);

// [{"uuid": "uuid", "playerid": "name", "time": 12345}]
let uuids = [];

async function get_player_uuid(playerid) {
    for (const item of uuids) {
        if (item['playerid'] == playerid && item['time'] + 900000 > Date.now()) {
            return item['uuid']
        }
    }

    let player_uuid = await new Promise(async (resolve, reject) => {
        let result;
        await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerid}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.id) {
                    result = data.id
                    user_data.run(`UPDATE user SET realname = ? WHERE player_uuid = ?`, [data.name, result]);
                    uuids.push({"uuid": result, "playerid": playerid, "time": Date.now()})
                } else {
                    result = 'Not Found'
                }
            })
            .catch(error => console.log('Error:', error));
        
        resolve(result)
    });

    return player_uuid
}

async function get_player_name(uuid) {
    let result = undefined;
    for (const item of uuids) {
        if (item['result'] == result) {
            result = item['playerid']
            break
        }
    }
    await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
        .then(response => response.json())
        .then(data => {
            if (data) {
                result = data.name
            } else {
                result = 'error'
            }
        })
        .catch(error => console.error('Error fetching username:', error));

    if (result != '無法取得' && result != undefined) {
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