const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const { pay_handler } = require(`../utils/pay_handler.js`);
const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/data/commands.json`, 'utf8'));
const Logger = require('../utils/logger.js');

module.exports = {
    display_name: commands.cpay.display_name,
    name: 'cpay',
    description: commands.cpay.description,
    aliases: commands.cpay.name,
    usage: commands.cpay.usage,
    async execute(bot, playerid, args, client) {
        await executeCommand(bot, playerid, args, client);
    }
}

async function executeCommand(bot, playerid, args, client) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf8'));

    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
        if (await pay_handler(bot, args.split(' ')[1], args.split(' ')[2], 'coin', client) == 'success') {
            await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.cpay['default'].replaceAll('%coin%', args.split(' ')[2]).replaceAll('%playerid&', args.split(' ')[1]), playerid)}`)
        }
        Logger.log(`[村錠支付] 玩家 ${playerid} 讓 bot 轉帳 ${args.split(' ')[2]} 個村民錠給 ${args.split(' ')[1]}`)
        
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
        Logger.warn(`[村錠支付] 玩家 ${playerid} 沒有權限使用此指令`)
    }
}