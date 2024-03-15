const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);
const { canUseCommand } = require(`${process.cwd()}/utils/permissions.js`);
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { chat } = require(`${process.cwd()}/utils/chat.js`);
const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

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

    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            bot.chat(`/${args.split(' ').slice(1).join(' ')}`)
            const msg_Promise = bot.awaitMessage(/^(?!\[(閒聊|交易|抽獎|設施|公共|~|系統\] 新玩家|系統\] 吉日|系統\] 凶日|系統\] .*凶日|系統\] .*吉日)).*/);
            const timeout_Promise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve(undefined);
                }, 10000);
            });
            Promise.race([msg_Promise, timeout_Promise]).then(async value => {
                if (value) {
                    await chat(bot, `/m ${playerid} ${value}`)
                } else {
                    await chat(bot, `/m ${playerid} ${messages.commands.cmd.no_respond}`)
                }
            })

            for (listener of bot.listeners('messagestr')) {
                bot.removeListener('messagestr', listener);
            }
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}