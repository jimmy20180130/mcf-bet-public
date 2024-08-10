const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const Logger = require('../utils/logger.js');
const { pay_handler } = require(`../utils/pay_handler.js`);
const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.epay.display_name,
    name: 'epay',
    description: commands.epay.description,
    aliases: commands.epay.name,
    usage: commands.epay.usage,
    async execute(bot, playerid, args, client) {
        await executeCommand(bot, playerid, args, client);
    }
}

async function executeCommand(bot, playerid, args, client) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));

    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
        await pay_handler(bot, playerid, args.split(' ')[2], 'e', client);
        await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.epay.default.replaceAll('%emerald%', args.split(' ')[2]), playerid)}`)
        Logger.log(`[綠寶石支付] 玩家 ${playerid} 讓 bot 轉帳 ${args.split(' ')[2]} 個綠寶石給 ${args.split(' ')[1]}`)
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
        Logger.warn(`[綠寶石支付] 玩家 ${playerid} 沒有權限使用此指令`)
    }
}