const { chat } = require(`../utils/chat.js`);
const { mc_error_handler } = require(`../error/mc_handler.js`)
const { get_player_wallet, set_player_wallet, create_player_wallet, write_pay_history } = require(`../utils/database.js`)
const { get_player_uuid } = require(`../utils/get_player_info.js`)
const { generateUUID } = require(`../utils/uuid.js`)
const fs = require('fs');
const { pay_error } = require(`../discord/embed.js`)
const Logger = require('../utils/logger.js');

async function pay_handler(bot, player_id, amount, type, client, isDaily=false, data) {
    const pay_uuid = generateUUID()

    Logger.log(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} (UUID: ${pay_uuid})`)

    if (type == 'e' || type == 'emerald') {
        await chat(bot, `/pay ${player_id} ${amount}`)
        const wait_Promise = bot.awaitMessage(/^\[系統] 正在處理您的其他請求, 請稍後/);
        const no_emerald_Promise = bot.awaitMessage(/\[系統] 綠寶石不足, 尚需(.+)/);
        const not_same_place_Promise = bot.awaitMessage(/\[系統] 只能轉帳給同一分流的線上玩家\. 請檢查對方的ID與所在分流(.*)/);
        const success_Promise = bot.awaitMessage(/\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/);
        const negative_Promise = bot.awaitMessage(/^\[系統\] 轉帳金額需為正數/)
        const can_not_send_msg_Promise = bot.awaitMessage(/^\[系統\] 無法傳送訊息/)

        let timeout;
        
        const timeout_Promise = new Promise((resolve) => {
            timeout = setTimeout(() => {
                resolve('timeout');
            }, 10000);
        });

        let player_wallet = await get_player_wallet(await get_player_uuid(player_id), 'emerald')

        if (player_wallet == 'Not Found') {
            await create_player_wallet(await get_player_uuid(player_id))
            player_wallet = await get_player_wallet(await get_player_uuid(player_id), 'emerald')
        }

        player_wallet = parseInt(player_wallet)
        amount = parseInt(amount)

        return new Promise(async resolve => {
            await Promise.race([negative_Promise, no_emerald_Promise, success_Promise, not_same_place_Promise, wait_Promise, timeout_Promise, can_not_send_msg_Promise]).then(async (string) => {
                wait_Promise.cancel()
                no_emerald_Promise.cancel()
                success_Promise.cancel()
                not_same_place_Promise.cancel()
                negative_Promise.cancel()
                can_not_send_msg_Promise.cancel()

                clearTimeout(timeout);

                // if 
                
                if (string.startsWith('[系統] 成功轉帳')) {
                    Logger.log(`[轉帳] 成功轉帳 ${amount} 個 ${type} 給 ${player_id} (UUID: ${pay_uuid})`)
                    await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'success', Math.floor((new Date()).getTime() / 1000), type, data)
                    resolve('success')

                } else if (string.startsWith('[系統] 綠寶石不足, 尚需')) {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 機器人綠寶石不足 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'no_money', player_id, '', pay_uuid)

                    await set_player_wallet(await get_player_uuid(player_id), player_wallet + amount, 'emerald')
                    if (client) await pay_error(client, pay_uuid, player_id, amount, 'emerald', 'no_money')
                    await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'no_money', Math.floor((new Date()).getTime() / 1000), type, data)
                    resolve('bot_no_money')

                } else if (string.startsWith('[系統] 只能轉帳給同一分流的線上玩家. 請檢查對方的ID與所在分流')) {
                    if (isDaily) {
                        Logger.warn(`[轉帳] 玩家 ${player_id} 簽到時發生錯誤: 不在同一分流 (UUID: ${pay_uuid})`)
                        await mc_error_handler(bot, 'pay', 'dailyNotSamePlace', player_id, '', pay_uuid)

                        if (client) await pay_error(client, pay_uuid, player_id, amount, 'emerald', 'dailyNotSamePlace')
                        await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'dailyNotSamePlace', Math.floor((new Date()).getTime() / 1000), type, data)
                        
                        resolve('dailyNotSamePlace')
                    } else {
                        Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 不在同一分流 (UUID: ${pay_uuid})`)
                        await mc_error_handler(bot, 'pay', 'not_same_place', player_id, '', pay_uuid)

                        await set_player_wallet(await get_player_uuid(player_id), player_wallet + amount, 'emerald')
                        if (client) await pay_error(client, pay_uuid, player_id, amount, 'emerald', 'not_same_place')
                        await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'not_same_place', Math.floor((new Date()).getTime() / 1000), type, data)

                        resolve('not_same_place')
                    }

                } else if (string.startsWith('[系統] 正在處理您的其他請求, 請稍後')) {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 系統忙碌 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'busy', player_id, '', pay_uuid)

                    await set_player_wallet(await get_player_uuid(player_id), player_wallet + amount, 'emerald')
                    if (client) await pay_error(client, pay_uuid, player_id, amount, type, 'busy')
                    await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'busy', Math.floor((new Date()).getTime() / 1000), type, data)

                    resolve('busy')

                } else if (string.startsWith('[系統] 轉帳金額需為正數')) {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 金額需為正數 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'negative', player_id, '', pay_uuid)

                    await set_player_wallet(await get_player_uuid(player_id), player_wallet + amount, 'emerald')
                    if (client) await pay_error(client, pay_uuid, player_id, amount, type, 'negative')
                    await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'negative', Math.floor((new Date()).getTime() / 1000), type, data)

                    resolve('negative')

                } else if (string == 'timeout') {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 逾時 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'timeout', player_id, '', pay_uuid)
                    if (client) await pay_error(client, pay_uuid, player_id, amount, type, 'timeout')
                    await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'timeout', Math.floor((new Date()).getTime() / 1000), type, data)

                    resolve('timeout')

                } else if (string.startsWith('[系統] 無法傳送訊息')) {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 無法傳送訊息 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'can\'t send msg', player_id, '', pay_uuid)

                    await set_player_wallet(await get_player_uuid(player_id), player_wallet + amount, 'emerald')
                    if (client) await pay_error(client, pay_uuid, player_id, amount, type, 'can\'t send msg')
                    await write_pay_history(pay_uuid, await get_player_uuid(player_id), amount, 'can\'t send msg', Math.floor((new Date()).getTime() / 1000), type, data)

                    resolve('can\'t send msg')
                }
            })
        })
    } else if (type == 'c' || type == 'coin') {
        await chat(bot, `/cointrans ${player_id} ${Math.floor(amount)}`)
        await chat(bot, player_id)
        //[系統] 兩次所輸入的玩家名稱不一致!
        //[系統] 轉帳成功! (使用了 2 村民錠, 剩餘 995 )
        const success_Promise = bot.awaitMessage(/^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/)
        const not_same_player_Promise = bot.awaitMessage(/^\[系統\] 兩次所輸入的玩家名稱不一致!/)

        let timeout;
        
        const timeout_Promise = new Promise((resolve) => {
            timeout = setTimeout(() => {
                resolve('timeout');
            }, 10000);
        });

        let player_wallet = await get_player_wallet(await get_player_uuid(player_id), 'coin')

        if (player_wallet == 'Not Found') {
            await create_player_wallet(await get_player_uuid(player_id))
            player_wallet = await get_player_wallet(await get_player_uuid(player_id), 'coin')
        }

        player_wallet = parseInt(player_wallet)
        amount = parseInt(amount)

        return new Promise(async resolve => {
            await Promise.race([success_Promise, not_same_player_Promise, timeout_Promise]).then(async (string) => {
                success_Promise.cancel()
                not_same_player_Promise.cancel()

                clearTimeout(timeout);
                
                if (string.startsWith('[系統] 轉帳成功!')) {
                    Logger.log(`[轉帳] 成功轉帳 ${amount} 個 ${type} 給 ${player_id}`)
                    resolve('success')

                } else if (string.startsWith('[系統] 兩次所輸入的玩家名稱不一致!')) {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 兩次所輸入的玩家名稱不一致 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'not_same_player', player_id, '', pay_uuid)
                    await set_player_wallet(await get_player_uuid(player_id), player_wallet + amount, 'coin')
                    if (client) await pay_error(client, pay_uuid, player_id, amount, type, 'not_same_player')

                    resolve('not_same_player')

                } else if (string == 'timeout') {
                    Logger.warn(`[轉帳] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 逾時 (UUID: ${pay_uuid})`)
                    await mc_error_handler(bot, 'pay', 'timeout', player_id, '', pay_uuid)
                    if (client) await pay_error(client, pay_uuid, player_id, amount, type, 'timeout')

                    resolve('timeout')
                }
            })
        })
    }
}

module.exports = {
    pay_handler
}