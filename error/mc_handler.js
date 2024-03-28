const fs = require('fs')
const { chat } = require(`${process.cwd()}/utils/chat.js`);
const { process_msg } = require(`${process.cwd()}/utils/process_msg.js`)

async function mc_error_handler(bot, type, error_code, playerid, err_msg = '', uuid = '') {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));
    const error_msg = messages.errors
    if (uuid != '' && uuid != undefined) {
        uuid = `，錯誤 ID 為 ${uuid}`
    }

    await chat(bot, `/m ${playerid} ${await process_msg(bot, error_msg[type][error_code].replaceAll('%error_msg%', err_msg), playerid)} ${uuid}`)
}

module.exports = {
    mc_error_handler
}