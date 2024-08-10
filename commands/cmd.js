const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));
const Logger = require('../utils/logger.js');

module.exports = {
    display_name: commands.cmd.display_name,
    name: 'cmd',
    description: commands.cmd.description,
    aliases: commands.cmd.name,
    usage: commands.cmd.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));

    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
        await chat(bot, `/${args.split(' ').slice(1).join(' ')}`)
        const msg_Promise = bot.awaitMessage(/^(?!\[(閒聊|交易|抽獎|設施|公共|~|系統\] 新玩家|系統\] 吉日|系統\] 凶日|系統\] .*凶日|系統\] .*吉日)).*/);
        const timeout_Promise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(undefined);
            }, 10000);
        });
        Promise.race([msg_Promise, timeout_Promise]).then(async value => {
            if (value) {
                await chat(bot, `/m ${playerid} ${value}`)
                Logger.log(`[指令] 玩家 ${playerid} 使用指令 ${args.split(' ').slice(1).join(' ')} 的回應: ${value}`)
            } else {
                await chat(bot, `/m ${playerid} ${messages.commands.cmd.no_respond}`)
                Logger.warn(`[指令] 玩家 ${playerid} 使用指令 ${args.split(' ').slice(1).join(' ')} 的回應: ${messages.commands.cmd.no_respond}`)
            }
        })

        for (listener of bot.listeners('messagestr')) {
            bot.removeListener('messagestr', listener);
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
        Logger.warn(`[指令] 玩家 ${playerid} 沒有權限使用指令 ${args.split(' ').slice(1).join(' ')}`)
    }
}