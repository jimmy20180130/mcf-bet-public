const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);
const { canUseCommand } = require(`${process.cwd()}/utils/permissions.js`);
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);
const { process_msg } = require(`${process.cwd()}/utils/process_msg.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { chat } = require(`${process.cwd()}/utils/chat.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.help.display_name,
    name: 'help',
    description: commands.help.description,
    aliases: commands.help.name,
    usage: commands.help.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            if (args.split(' ').length == 1) {
                let all_commands = Object.keys(commands);
                all_commands.filter((item, index) => all_commands.indexOf(item) !== index);
                all_commands = await Promise.all(all_commands.map(async item => ({
                    command: item,
                    canUse: await canUseCommand(await get_player_uuid(playerid), item)
                })));
                
                all_commands = all_commands.filter(item => item.canUse === true).map(item => item.command);
                all_commands = all_commands.map(function(element) {
                    return `&6${element}`;
                });

                function combineStrings(strings) {
                    const maxLength = 255;
                    const separator = ' &7|| ';
                    let resultArray = [];
                    let currentString = '';
                    
                    strings.forEach((str) => {
                        if (currentString.length + separator.length + 4 + playerid.length + str.length <= maxLength) {
                            if (currentString.length > 0) {
                                currentString += separator;
                            }
                            currentString += str;
                        } else {
                            resultArray.push(currentString);
                            currentString = str;
                        }
                    });
                    
                    if (currentString.length > 0) {
                        resultArray.push(currentString);
                    }
                    
                    return resultArray;
                }

                for (item of combineStrings(all_commands)) {
                    await chat(bot, `/m ${playerid} ${await process_msg(bot, item, playerid)}`)
                }
            } else {

            }
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}