const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { getPlayerRole } = require(`../utils/database.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const { generateVerificationCode } = require(`../utils/uuid.js`);
const { add_code } = require(`../utils/link_handler.js`);

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
            let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
            
            if (config.roles.link_role_dc == '' || !config.roles.link_role_dc) {
                await chat(bot, `/m ${playerid} &c&l目前綁定功能尚未開放，請聯絡管理員。`)
                return
            }

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