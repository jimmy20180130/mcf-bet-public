const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);
const { canUseCommand } = require(`${process.cwd()}/utils/permissions.js`);
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);
const { process_msg } = require(`${process.cwd()}/utils/process_msg.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { chat } = require(`${process.cwd()}/utils/chat.js`);
const { generateVerificationCode } = require(`${process.cwd()}/utils/uuid.js`);
const { add_code } = require(`${process.cwd()}/utils/link_handler.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

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
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));
    
    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            const code = generateVerificationCode()
            await add_code(code, await get_player_uuid(playerid))
            await chat(bot, await process_msg(bot, messages.commands.link.start_link.replaceAll('%code%', code), playerid))
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}