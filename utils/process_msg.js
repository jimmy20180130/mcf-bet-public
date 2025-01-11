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
        "%wallet_e_amount%": await get_player_wallet(await get_player_uuid(playerid), 'emerald'),
        "%wallet_c_amount%": await get_player_wallet(await get_player_uuid(playerid), 'coin')
    }
    
    for (placeholder of Object.keys(placeholders)) {
        message = message.replaceAll(placeholder, placeholders[placeholder]);
    }

    return message;
}

function add_comma_to_number(number) {
    const [integerPart, decimalPart] = number.toString().split("."); // 分開整數與小數部分
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // 對整數部分加上逗號
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger; // 組合結果
}

module.exports = {
    process_msg,
    add_comma_to_number
}