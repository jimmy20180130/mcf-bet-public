const fs = require('fs');
const { chat } = require(`${process.cwd()}/utils/chat.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { process_msg } = require(`${process.cwd()}/utils/process_msg.js`)
const { pay_handler } = require(`${process.cwd()}/utils/pay_handler.js`)
const { activateBlock } = require(`${process.cwd()}/utils/better-mineflayer.js`)
const { write_pay_history, write_errors } = require(`${process.cwd()}/utils/database.js`)
const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`);
const { bet_win, bet_lose, error_embed } = require(`${process.cwd()}/discord/embed.js`);
const { generateUUID } = require(`${process.cwd()}/utils/uuid.js`)
const Vec3 = require('vec3');
const Decimal = require('decimal.js');

let bet_task = [];
let client = undefined
let bot = undefined

async function add_bet_task(bot, player_id, amount, type) {
    let create_time = Math.round(new Date() / 1000)
    let pay_uuid = generateUUID()

    bet_task.push({
        bot: bot,
        player_id: player_id,
        amount: amount,
        type: type,
        create_time: create_time,
        uuid: pay_uuid
    });

    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'))
    cache.bet.push({
        player_id: player_id,
        amount: amount,
        type: type,
        added: true,
        create_time: create_time,
        uuid: pay_uuid
    })
    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))

    console.log(`[INFO] 收到下注任務 (${pay_uuid}): ${player_id} 下注 ${amount} 個 ${type} ，時間為 ${create_time}`)
}

async function process_bet_task() {
    while (bet_task.length > 0 && bot != undefined) {
        let task_uuid = ''

        const process_task_promise = new Promise(async resolve => {
            const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
            const emeraldRegex = /綠寶石餘額 : (\d[\d,]*)/;
            const coinRegex = /村民錠餘額 : (\d[\d,]*)/;
            let task = bet_task.shift();
            task_uuid = task.uuid
            
            const emerald = bot.tablist.header.toString().match(emeraldRegex)[1].replaceAll(',', '');
            const coin = bot.tablist.header.toString().match(coinRegex)[1].replaceAll(',', '');
            if (task.type == 'emerald' && emerald < task.amount*config.bet.eodds) {
                await mc_error_handler(bot, 'bet', 'no_money', task.player_id)
                await write_errors(0, task.amount, config.bet.eodds, 'bot_no_money', await get_player_uuid(task.player_id), task.type)
                await pay_handler(bot, task.player_id, task.amount, task.type, true)
                let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'))
                cache.bet.shift()
                fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                
                console.log(`[INFO] 下注任務 (${task.uuid}) 超過上限，歸還玩家 ${task.player_id}  ${task.amount} 個 ${task.type}`)

                resolve()
            } else if (task.type == 'coin' && coin < task.amount*config.bet.codds) {
                await mc_error_handler(bot, 'bet', 'no_money', task.player_id)
                await write_errors(0, task.amount, config.bet.codds, 'bot_no_money', await get_player_uuid(task.player_id), task.type)
                await pay_handler(bot, task.player_id, task.amount, task.type, true)
                let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'))
                cache.bet.shift()
                fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                
                console.log(`[INFO] 下注任務 (${task.uuid}) 超過上限，歸還玩家 ${task.player_id}  ${task.amount} 個村民錠`)

                resolve()
            } else {
                if (task.player_id == undefined || task.amount == undefined || task.type == undefined) {
                    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'))
                    cache.bet.shift()
                    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    resolve()
                }

                console.log(`[INFO] 開始處理下注任務 (${task.uuid}): ${task.player_id} 下注 ${task.amount} 個 ${task.type}`)
                await active_redstone(bot, task.player_id, task.amount, task.type);
                let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'))
                cache.bet.shift()
                fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))

            }

            resolve()
        })

        const timeout_promise = new Promise(resolve => {
            setTimeout(() => {
                resolve('timeout')
            }, 30000)
        })

        let stop_handler_function

        const stop_promise = new Promise(resolve => {
            stop_handler_function = function stop_handler() {
                bot.removeListener('end', stop_handler)
                resolve('stop')
            }
            
            bot.once('end', stop_handler_function)
        })
        
        let should_stop = false

        await Promise.race([process_task_promise, timeout_promise, stop_promise]).then(async (value) => {
            if (value == 'timeout') {
                console.log(`[INFO] 處理下注任務 (${task_uuid}) 超時`)
            } else if (value == 'stop') {
                console.log(`[INFO] Bot 離線，停止處理下注任務 (${task_uuid})`)
                should_stop = true
            } else {
                console.log(`[INFO] 下注任務 (${task_uuid}) 處理完成，機器人待命中...`)
            }

            bot.removeListener('end', stop_handler_function)
        })

        if (should_stop) return
    }

    setTimeout(() => {
        process_bet_task();
    }, 100);
}

async function active_redstone(bot, playerid, amount, type, task_uuid) {
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

    try {
        const position = config.bet.bet_position

        if (position == undefined || position.length != 3) {
            position = undefined
        }

        let block = bot.findBlock({
            point: bot.entity.position,
            matching: (block) => {
                return block.name === "redstone_wire";
            },
            maxDistance: 3,
            count: 1
        });

        if (block) {
            try {
                if (position) {
                    await activateBlock(bot, bot.blockAt(new Vec3(position[0], position[1], position[2])));
                } else {
                    await activateBlock(bot, block);
                }
            } catch (error) {
                console.log(error)
            }
            
            let no_permission_Promise = bot.awaitMessage(/^\[領地\] 您沒有(.+)/);
            let bet_result = new Promise(resolve => {
                bot._client.on('entity_metadata', async (entity) => {
                    try {
                        let item_id = JSON.parse(JSON.stringify(entity.metadata[0].value)).itemId;
                        if (item_id == 180) {
                            resolve('yes')
                        } else if (item_id == 195) {
                            resolve('no')
                        }
                    } catch (e) {
                        for (listener of bot._client.listeners('entity_metadata')) {
                            bot._client.removeListener('entity_metadata', listener);
                        }

                        await mc_error_handler(bot, 'bet', 'unexpected_err', playerid, error)

                        if (type == 'coin') {
                            await write_errors(amount, amount, config.bet.codds, e, await get_player_uuid(playerid), type)
                        } else if (type == 'emerald') {
                            await write_errors(amount, amount, config.bet.eodds, e, await get_player_uuid(playerid), type)
                        }

                        const embed = await error_embed(e.msg)
                        const channel = await client.channels.fetch(config.discord_channels.errors);
                        await channel.send({ embeds: [embed] });
                        resolve('error');
                    }
                });
            });

            let timeout_Promise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve('timeout');
                }, 10000);
            });

            await Promise.race([no_permission_Promise, bet_result, timeout_Promise]).then(async (value) => {
                if (value.startsWith('[領地]')) {
                    await mc_error_handler(bot, 'bet', 'no_permission', playerid,)
                    switch (await pay_handler(bot, playerid, amount, type, true)) {
                        case 'success':
                            break
                        case 'no_money':
                            break
                    }
                    const embed = await error_embed(`您沒有足夠的權限 (${task_uuid})`)
                    const channel = await client.channels.fetch(config.discord_channels.errors);
                    await channel.send({ embeds: [embed] });
                } else if (value == 'timeout') {
                    await mc_error_handler(bot, 'bet', 'timeout', playerid)
                    await pay_handler(bot, playerid, amount, type, true)
                    const embed = await error_embed(`操作超時 (${task_uuid})`)
                    const channel = await client.channels.fetch(config.discord_channels.errors);
                    await channel.send({ embeds: [embed] });
                } else if (value == 'error') {
                    await pay_handler(bot, playerid, amount, type, true)
                } else {
                    await process_bet_result(bot, await bet_result, amount, playerid, type, task_uuid);
                }

                for (listener of bot.listeners('messagestr')) {
                    bot.removeListener('messagestr', listener);
                }
                for (listener of bot._client.listeners('entity_metadata')) {
                    bot._client.removeListener('entity_metadata', listener);
                }
            });
        } else {
            await mc_error_handler(bot, 'bet', 'redstone_not_found', playerid)
            await pay_handler(bot, playerid, amount, type, true)
            const embed = await error_embed(`找不到紅石粉 (${task_uuid})`)
            const channel = await client.channels.fetch(config.discord_channels.errors);
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        await mc_error_handler(bot, 'bet', 'unexpected_err', playerid, error)
        
        if (type == 'coin') {
            await write_errors(amount, amount, config.bet.codds, error.message, await get_player_uuid(playerid), type)
        } else if (type == 'emerald') {
            await write_errors(amount, amount, config.bet.eodds, error.message, await get_player_uuid(playerid), type)
        }

        const embed = await error_embed(`${error.message} (${task_uuid})`)
        const channel = await client.channels.fetch(config.discord_channels.errors);
        await channel.send({ embeds: [embed] });
    }
}

async function process_bet_result(bot, wool, amount, player_id, type, task_uuid) {
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
    const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf-8'));

    if (wool == 'yes') {
        if (type == 'emerald') {
            const pay_result = await pay_handler(bot, player_id, Math.floor(new Decimal(amount).mul(new Decimal(config.bet.eodds)).toNumber()), 'e')
            console.log(pay_result)
            await chat(bot, `${await process_msg(bot, messages.bet.ewin.replaceAll('%multiply%', config.bet.eodds).replaceAll('%amount%', amount).replaceAll('%after_amount%', Math.floor(new Decimal(amount).mul(new Decimal(config.bet.eodds)).toNumber())), player_id)}`)
            await write_pay_history(amount, Math.floor(new Decimal(amount).mul(new Decimal(config.bet.eodds)).toNumber()), config.bet.eodds, pay_result, await get_player_uuid(player_id), type)
            const channel = await client.channels.fetch(config.discord_channels.bet_record);
            const embed = await bet_win(player_id, `${amount} -> ${Math.floor(new Decimal(amount).mul(new Decimal(config.bet.eodds)).toNumber())} 個綠寶石 💵 (賠率為 ${config.bet.eodds})`)
            await channel.send({ embeds: [embed] });
            console.log(`[INFO] 下注任務 (${task_uuid}) 完成，支付玩家 ${player_id} ${Math.floor(new Decimal(amount).mul(new Decimal(config.bet.eodds)).toNumber())} 個綠寶石，賠率為 ${config.bet.eodds} ，支付狀態為 ${pay_result}`)
        } else if (type == 'coin') {
            await chat(bot, `/cointrans ${player_id} ${Math.floor(new Decimal(amount).mul(new Decimal(config.bet.codds)).toNumber())}`)
            await chat(bot, player_id)
            await chat(bot, `${await process_msg(bot, messages.bet.cwin.replaceAll('%multiply%', config.bet.codds).replaceAll('%amount%', amount).replaceAll('%after_amount%', Math.floor(new Decimal(amount).mul(new Decimal(config.bet.codds)).toNumber())), player_id)}`)
            await write_pay_history(amount, Math.floor(new Decimal(amount).mul(new Decimal(config.bet.codds)).toNumber()), config.bet.codds, 'success', await get_player_uuid(player_id), type)
            const channel = await client.channels.fetch(config.discord_channels.bet_record);
            const embed = await bet_win(player_id, `${amount} -> ${Math.floor(new Decimal(amount).mul(new Decimal(config.bet.codds)).toNumber())} 個村民錠 🪙 (賠率為 ${config.bet.codds})`)
            await channel.send({ embeds: [embed] });
            console.log(`[INFO] 下注任務 (${task_uuid}) 完成，支付玩家 ${player_id} ${Math.floor(new Decimal(amount).mul(new Decimal(config.bet.eodds)).toNumber())} 個村民錠，賠率為 ${config.bet.eodds} ，支付狀態為 ${pay_result}`)
        }

    } else if (wool == 'no') {
        if (type == 'emerald') {
            await chat(bot, `${await process_msg(bot, messages.bet.elose.replaceAll('%amount%', amount), player_id)}`)
            await write_pay_history(amount, 0, config.bet.eodds, 'success', await get_player_uuid(player_id), type)
            const channel = await client.channels.fetch(config.discord_channels.bet_record);
            const embed = await bet_lose(player_id, `下注 ${amount} 個綠寶石 💵，未中獎 (賠率為 ${config.bet.eodds})`)
            await channel.send({ embeds: [embed] });
            console.log(`[INFO] 下注任務 (${task_uuid}) 完成，支付玩家 ${player_id} 0 個綠寶石，賠率為 ${config.bet.eodds}`)

        } else if (type == 'coin') {
            await chat(bot, `${await process_msg(bot, messages.bet.close.replaceAll('%amount%', amount), player_id)}`)
            await write_pay_history(amount, 0, config.bet.codds, 'success', await get_player_uuid(player_id), type)
            const channel = await client.channels.fetch(config.discord_channels.bet_record);
            const embed = await bet_lose(player_id, `下注 ${amount} 個村民錠 🪙，未中獎 (賠率為 ${config.bet.codds})`)
            await channel.send({ embeds: [embed] });
            console.log(`[INFO] 下注任務 (${task_uuid}) 完成，支付玩家 ${player_id} 0 個綠寶石，賠率為 ${config.bet.eodds}`)

        }
        
    } else if (wool == 'error') {
        if (type == 'emerald') {
            await pay_handler(bot, player_id, amount, 'e')
            console.log(`[INFO] 下注任務 (${task_uuid}) 失敗，退還玩家 ${player_id} ${amount} 個綠寶石，賠率為 ${config.bet.eodds} ，支付狀態為 ${pay_result}`)
        } else if (type == 'coin') {
            await chat(bot, `/cointrans ${player_id} ${amount}`)
            await chat(bot, player_id)
            console.log(`[INFO] 下注任務 (${task_uuid}) 失敗，退還玩家 ${player_id} ${amount} 個村民錠，賠率為 ${config.bet.eodds} ，支付狀態為 ${pay_result}`)
        }
    }
}

const add_client = (dc_client) => {
    client = dc_client;
}

const add_bot = (mc_bot) => {
    bot = mc_bot;
}

module.exports = {
    add_bet_task,
    add_client,
    process_bet_task,
    add_bot
};