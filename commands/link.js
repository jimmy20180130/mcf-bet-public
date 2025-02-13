const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const { generateVerificationCode } = require(`../utils/uuid.js`);
const { add_code } = require(`../utils/link_handler.js`);
const toml = require('toml');

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/data/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.link.display_name,
    name: 'link',
    description: commands.link.description,
    aliases: commands.link.name,
    usage: commands.link.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf8'));
    
    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
        if (configtoml.discord.enabled) {
            const code = generateVerificationCode()
            await add_code(code, await get_player_uuid(playerid))
            await chat(bot, await process_msg(bot, messages.commands.link.start_link.replaceAll('%code%', code), playerid))
        } else {
            await chat(bot, await process_msg(bot, messages.commands.link.discord_disabled, playerid))
        }

    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}