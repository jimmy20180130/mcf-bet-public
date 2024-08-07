const moment = require('moment-timezone');
const { get_player_uuid } = require(`../utils/get_player_info`);
const { get_player_wallet } = require(`../utils/database.js`);

async function process_msg(bot, message, playerid) {
    let placeholders = {
        "%playerid%": playerid,
        "%botname%": bot.username,
        "%botuuid%": bot.uuid,
        "%time%": moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
        "%simple_time%": moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss'),
        "%wallet_amount%": await get_player_wallet(await get_player_uuid(playerid))
    }
    
    for (placeholder of Object.keys(placeholders)) {
        message = message.replaceAll(placeholder, placeholders[placeholder]);
    }

    return message;
}

async function add_comma_to_number(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {
    process_msg,
    add_comma_to_number
}