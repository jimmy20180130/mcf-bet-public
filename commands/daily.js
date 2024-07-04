const { get_player_uuid } = require(`../utils/get_player_info.js`);
const { canUseCommand } = require(`../utils/permissions.js`);
const { process_msg } = require(`../utils/process_msg.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { chat } = require(`../utils/chat.js`);
const { pay_handler } = require(`../utils/pay_handler.js`);
const { generateUUID } = require(`../utils/uuid.js`);
const moment = require('moment-timezone');

const {
    getPlayerRole,
    getDailyData,
    writeDailyData
} = require(`../utils/database.js`);

const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.daily.display_name,
    name: 'daily',
    description: commands.daily.description,
    aliases: commands.daily.name,
    usage: commands.daily.usage,
    async execute(bot, playerid, args) {
        await executeCommand(bot, playerid, args);
    }
}

async function executeCommand(bot, playerid, args) {
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf8'));
    const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));

    if (await getPlayerRole(await get_player_uuid(playerid))) {
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0].toLowerCase())) {
            let daily_data = await getDailyData(await get_player_uuid(playerid))

            console.log(daily_data)

            if (daily_data != 'Not Found' && moment.tz(daily_data['time'], 'Asia/Taipei').isSame(moment(new Date()), 'day')) {
                await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.daily.already_signed, playerid)}`)
                return;
            } else {
                const player_role = (await getPlayerRole(await get_player_uuid(playerid))).split(', ')
                
                let total_money = 0
                for (const role of player_role) {
                    if (roles[role] === undefined) continue;
                    total_money += roles[role].daily
                }
                
                if (total_money == 0) {
                    await chat(bot, `/m ${playerid} &c&l您目前無簽到金額可領取，如有疑問請詢問場地管理員`)
                    return
                }

                await writeDailyData(await get_player_uuid(playerid), total_money);
                
                const result = await pay_handler(bot, playerid, total_money, 'emerald', false)

                if (result != 'success') {
                    let uuid = generateUUID()
                    await mc_error_handler(bot, 'general', 'pay', playerid, messages.errors.pay[result], uuid)
                    await chat(bot, `/m ${playerid} ${(await process_msg(bot, messages.commands.daily.failed, playerid)).replaceAll('%time%', moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')).replaceAll('%uuid%', uuid)}`)
                    return;
                }

                daily_data = await getDailyData(await get_player_uuid(playerid))
                await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.daily.success.replaceAll('%count%', daily_data['count']).replaceAll('%amount%', total_money).replaceAll('%time%', moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')).replaceAll('%role%', roles[player_role[0]].name), playerid)}`)
                await chat(bot, `&b&l${playerid} &6&l領取了 ${roles[player_role[0]].name} 的每日簽到 &a&l${total_money} &6&l元`)
            }
        } else {
            await mc_error_handler(bot, 'general', 'not_linked', playerid)
        }
    } else {
        await mc_error_handler(bot, 'general', 'not_linked', playerid)
    }
}