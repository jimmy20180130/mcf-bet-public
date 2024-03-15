const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);
const { canUseCommand } = require(`${process.cwd()}/utils/permissions.js`);
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);
const { process_msg } = require(`${process.cwd()}/utils/process_msg.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { chat } = require(`${process.cwd()}/utils/chat.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.money.display_name,
    name: 'money',
    description: commands.money.description,
    aliases: commands.money.name,
    usage: commands.money.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));

    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            const emeraldRegex = /綠寶石餘額 : (\d[\d,]*)/;
            const coinRegex = /村民錠餘額 : (\d[\d,]*)/;
            const emerald = bot.tablist.header.toString().match(emeraldRegex)[1].replaceAll(',', '');
            const coin = bot.tablist.header.toString().match(coinRegex)[1].replaceAll(',', '');
            await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.money['default'].replaceAll("%emerald%", emerald).replaceAll("%coin%", coin), playerid)}`)
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}