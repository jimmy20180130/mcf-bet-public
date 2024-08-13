const fs = require('fs');
const { get_player_uuid } = require(`../utils/get_player_info`);
const { canUseCommand } = require(`../utils/permissions`);
const { process_msg } = require(`../utils/process_msg`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const { pay_handler } = require(`../utils/pay_handler.js`);
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

const {
    get_player_wallet,
    set_player_wallet,
    create_player_wallet
} = require(`../utils/database.js`);

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

    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
        let now_money_e = await get_player_wallet(await get_player_uuid(playerid), 'emerald')

        if (!now_money_e || now_money_e == 'Not Found' || now_money_e == 'Unexpected Error') {
            const player_uuid = await get_player_uuid(playerid)
            if (player_uuid == 'Not Found' || player_uuid == 'Unexpected Error') {
                await mc_error_handler(bot, 'general', 'no_permission', playerid)
                await chat(bot, `/m ${playerid} &c&l災難性的錯誤`)
                return
            }

            await create_player_wallet(player_uuid)
            now_money_e = await get_player_wallet(await get_player_uuid(playerid), 'emerald')
        }

        const now_money_c = await get_player_wallet(await get_player_uuid(playerid), 'coin')
        
        if (now_money_e > 0) {
            await pay_handler(bot, playerid, await get_player_wallet(await get_player_uuid(playerid), 'emerald'), 'e', false)
            await set_player_wallet(await get_player_uuid(playerid), 0, 'emerald')

        } else if (now_money_c > 0) {
            await pay_handler(bot, playerid, await get_player_wallet(await get_player_uuid(playerid), 'coin'), 'c', false)
            await set_player_wallet(await get_player_uuid(playerid), 0, 'coin')

        } else {
            await chat(bot, await process_msg(bot, messages.commands.wallet.not_enough_money, playerid))
        }
        
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}
