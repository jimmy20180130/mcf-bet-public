const fs = require('fs')
const { chat } = require(`../utils/chat.js`);
const { process_msg } = require(`../utils/process_msg.js`)

async function mc_error_handler(bot, type, error_code, playerid, err_msg = '', uuid = '') {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf8'));
    const error_msg = messages.errors
    
    await chat(bot, `/m ${playerid} ${await process_msg(bot, error_msg[type][error_code].replaceAll('%error_msg%', err_msg).replaceAll('%uuid%', uuid), playerid)}`)
}

module.exports = {
    mc_error_handler
}