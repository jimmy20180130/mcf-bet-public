const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);
const { canUseCommand } = require(`${process.cwd()}/utils/permissions.js`);
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);
const { process_msg } = require(`${process.cwd()}/utils/process_msg.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { chat } = require(`${process.cwd()}/utils/chat.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.hi.display_name,
    name: 'hi',
    description: commands.hi.description,
    aliases: commands.hi.name,
    usage: commands.hi.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));

    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.hi['default'], playerid)}`)
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}