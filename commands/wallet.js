const fs = require('fs');
const { now } = require('moment-timezone');
const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info`);
const { canUseCommand } = require(`${process.cwd()}/utils/permissions`);
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);
const { process_msg } = require(`${process.cwd()}/utils/process_msg`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { chat } = require(`${process.cwd()}/utils/chat.js`);
const { pay_handler } = require(`${process.cwd()}/utils/pay_handler.js`);
const commands = require(`${process.cwd()}/config/commands.json`);

const {
    get_player_wallet,
    create_player_wallet,
    add_player_wallet,
    clear_player_wallet
} = require(`${process.cwd()}/utils/database.js`);

module.exports = {
    display_name: commands.wallet.display_name,
    name: 'wallet',
    description: commands.wallet.description,
    aliases: commands.wallet.name,
    usage: commands.wallet.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));

    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            const now_money = await get_player_wallet(await get_player_uuid(playerid))
            if (now_money > 0) {
                const pay_result = await pay_handler(bot, playerid, await get_player_wallet(await get_player_uuid(playerid)), 'e')
                await clear_player_wallet(await get_player_uuid(playerid))
                if (pay_result != 'success') {
                    await add_player_wallet(await get_player_uuid(playerid), now_money)
                }
            } else {
                await chat(bot, await process_msg(bot, messages.commands.wallet.not_enough_money, playerid))
            }
            
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}
