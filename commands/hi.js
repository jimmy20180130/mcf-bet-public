const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/data/commands.json`, 'utf8'));

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
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf8'));

    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
        await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.hi['default'], playerid)}`)
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}