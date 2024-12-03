const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const { pay_handler } = require(`../utils/pay_handler.js`);
const moment = require('moment-timezone');
const Logger = require('../utils/logger.js')

const {
    create_daily_data,
    get_daily_data,
    write_daily_data,
    get_user_data
} = require(`../utils/database.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.daily.display_name,
    name: 'daily',
    description: commands.daily.description,
    aliases: commands.daily.name,
    usage: commands.daily.usage,
    async execute(bot, playerid, args, client) {
        await executeCommand(bot, playerid, args, client);
    }
}

let processList = []

async function executeCommand(bot, playerid, args, client) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));
    const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
    const player_data = await get_user_data(await get_player_uuid(playerid))

    if (processList.includes(playerid)) {
        await chat(bot, `/m ${playerid} &c&l${await process_msg(bot, messages.commands.daily.already_signed, playerid)}`)
        return;
    }

    processList.push(playerid)

    if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0].toLowerCase())) {
        if (!config.discord.enabled) {
            await chat(bot, `/m ${playerid} &c&l${await process_msg(bot, messages.commands.daily.disabled, playerid)}`)
            processList.splice(processList.indexOf(playerid), 1)
            return;
        }

        let daily_data = await get_daily_data(await get_player_uuid(playerid))

        if (daily_data == 'Not Found') {
            await create_daily_data(await get_player_uuid(playerid), '')
            daily_data = await get_daily_data(await get_player_uuid(playerid))
        }

        // if daily_data is string
        if (typeof daily_data === 'string') {
            switch (daily_data) {
                case 'Unexpected Error':
                    Logger.error(`[每日簽到] 玩家 ${playerid} 簽到時發生錯誤: ${daily_data}`)
                    await chat(bot, `/m ${playerid} &c&l${await process_msg(bot, messages.commands.daily.failed.replaceAll('%err%', 'Unexpected Error'), playerid)}`)
                    processList.splice(processList.indexOf(playerid), 1)
                    return;
                case 'Already Signed':
                    Logger.debug(`[每日簽到] 玩家 ${playerid} 已經簽到過了`)
                    await chat(bot, `/m ${playerid} &c&l${await process_msg(bot, messages.commands.daily.already_signed, playerid)}`)
                    processList.splice(processList.indexOf(playerid), 1)
                    return;
                default:
                    processList.splice(processList.indexOf(playerid), 1)
                    break;
            }

            return;
        } else {
            // player_uuid roles amount
            const guild = await client.guilds.fetch(config.discord.guild_id)
            const member = await guild.members.fetch(player_data.discord_id)

            const player_roles = (await member).roles.cache.map(role => role.id).filter((role) => {
                if (Object.keys(roles).includes(role) && roles[role].daily > 0) return true
                else return false
            })
            
            if (!player_roles || player_roles.length == 0) {
                Logger.debug(`[每日簽到] 玩家 ${playerid} 無簽到身份組`)
                await chat(bot, `/m ${playerid} &c&l您目前無簽到金額可領取，如有疑問請詢問場地管理員`)
                processList.splice(processList.indexOf(playerid), 1)
                return
            }

            const first_role = await guild.roles.fetch(player_roles[0]).then(role => { return role.name })

            let amount = 0

            for (let role of player_roles) {
                amount += roles[role].daily
            }

            await write_daily_data(await get_player_uuid(playerid), first_role, amount)

            await pay_handler(bot, playerid, amount, 'emerald', client, true)

            await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.daily.success.replaceAll('%amount%', amount).replaceAll('%time%', moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')).replaceAll('%role%', first_role), playerid)}`)
            await chat(bot, `&b&l${playerid} &6&l領取了身份組 ${first_role} 的每日簽到 &a&l${amount} &6&l元`)
            Logger.debug(`[每日簽到] 玩家 ${playerid} 領取了身份組 ${first_role} 的每日簽到 ${amount} 元`)
        }
    } else {
        await mc_error_handler(bot, 'general', 'not_linked', playerid)
    }

    processList.splice(processList.indexOf(playerid), 1)
}