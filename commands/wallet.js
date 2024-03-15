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
            if (
                commands.wallet.sub_commands.withdraw.name.includes(args.split(' ')[1]) &&
                await canUseCommand(await get_player_uuid(playerid), args.split(' ').slice(0, 3).join(' '))
            ) {
                if (args.split(' ')[2]) {
                    if (parseInt(args.split(' ')[2]) < await get_player_wallet(await get_player_uuid(playerid))) {
                        await add_player_wallet(await get_player_uuid(playerid), parseInt('-' + args.split(' ')[2]))
                        const pay_result = await pay_handler(bot, playerid, parseInt(args.split(' ')[2]), 'e')
                        if (pay_result != 'success') {
                            await add_player_wallet(await get_player_uuid(playerid), parseInt(args.split(' ')[2]))
                        }
                    } else {
                        await chat(bot, await process_msg(bot, messages.commands.wallet.not_enough_money, playerid))
                    }
                } else {
                    const now_money = await get_player_wallet(await get_player_uuid(playerid))
                    if (now_money > 0) {
                        await clear_player_wallet(await get_player_uuid(playerid))
                        const pay_result = await pay_handler(bot, playerid, await get_player_wallet(await get_player_uuid(playerid)), 'e')
                        if (pay_result != 'success') {
                            await add_player_wallet(await get_player_uuid(playerid), now_money)
                        }
                    } else {
                        await chat(bot, await process_msg(bot, messages.commands.wallet.not_enough_money, playerid))
                    }
                }
            } else if (
                commands.wallet.sub_commands.amount.name.includes(args.split(' ')[1]) &&
                await canUseCommand(await get_player_uuid(playerid), args.split(' ').slice(0, 3).join(' '))
            ) {
                await chat(bot, `${await process_msg(bot, messages.commands.wallet.amount, playerid)}`)
            } else if (
                commands.wallet.sub_commands.add.name.includes(args.split(' ')[1]) &&
                await canUseCommand(await get_player_uuid(playerid), args.split(' ').slice(0, 3).join(' '))
            ) {
                if (args.split(' ')[2] && args.split(' ')[3]) {
                    if (await get_player_wallet(await get_player_uuid(args.split(' ')[2])) != undefined) {
                        await add_player_wallet(await get_player_uuid(args.split(' ')[2]), parseInt(args.split(' ')[3]))
                    } else {
                        await create_player_wallet(args.split(' ')[2], await get_player_uuid(args.split(' ')[2]))
                        await add_player_wallet(await get_player_uuid(args.split(' ')[2]), parseInt(args.split(' ')[3]))
                    }

                    await chat(bot, await process_msg(bot, messages.commands.wallet.add_success.replaceAll('%playerid1%', args.split(' ')[2]).replaceAll('%amount%', parseInt(args.split(' ')[3])), playerid))
                } else {
                    await mc_error_handler(bot, 'general', 'not_completed', playerid)
                }
            } else {
                await chat(bot, `/m ${playerid} ${commands.wallet.usage}`)
            }
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'no_permission', playerid)
    }
}
