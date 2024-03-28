const { chat } = require(`${process.cwd()}/utils/chat.js`);
const { mc_error_handler } = require(`${process.cwd()}/error/mc_handler.js`)
const { write_errors } = require(`${process.cwd()}/utils/database.js`)
const { get_player_uuid } = require(`${process.cwd()}/utils/get_player_info.js`)
const fs = require('fs');

async function pay_handler(bot, player_id, amount, type, is_bet) {
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

    console.log(`[INFO] 轉帳 ${amount} 個 ${type} 給 ${player_id} (是否為下注石的轉帳: ${is_bet})`)

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

        return new Promise(async resolve => {
            await Promise.race([negative_Promise, no_emerald_Promise, success_Promise, not_same_place_Promise, wait_Promise, timeout_Promise, can_not_send_msg_Promise]).then(async (string) => {
                for (listener of bot.listeners('messagestr')) {
                    bot.removeListener('messagestr', listener);
                }

                clearTimeout(timeout);
                
                if (string.startsWith('[系統] 成功轉帳')) {
                    resolve('success')
                } else if (string.startsWith('[系統] 綠寶石不足, 尚需')) {
                    if (is_bet) {
                        const uuid = await write_errors(0, amount, config.bet.eodds, 'bot_no_money', await get_player_uuid(player_id), type)
                        await mc_error_handler(bot, 'pay', 'no_money', player_id, '', uuid)
                    } else {
                        await mc_error_handler(bot, 'pay', 'no_money', player_id)
                    }
                    resolve('bot_no_money')

                } else if (string.startsWith('[系統] 只能轉帳給同一分流的線上玩家. 請檢查對方的ID與所在分流')) {
                    if (is_bet) {
                        const uuid = await write_errors(0, amount, config.bet.eodds, 'not_same_place', await get_player_uuid(player_id), type)
                        await mc_error_handler(bot, 'pay', 'not_same_place', player_id, '', uuid)
                    } else {
                        await mc_error_handler(bot, 'pay', 'not_same_place', player_id)
                    }
                    resolve('not_same_place')

                } else if (string.startsWith('[系統] 正在處理您的其他請求, 請稍後')) {
                    if (is_bet) {
                        const uuid = await write_errors(0, amount, config.bet.eodds, 'busy', await get_player_uuid(player_id), type)
                        await mc_error_handler(bot, 'pay', 'busy', player_id, '', uuid)
                    } else {
                        await mc_error_handler(bot, 'pay', 'busy', player_id)
                    }
                    resolve('busy')

                } else if (string.startsWith('[系統] 轉帳金額需為正數')) {
                    if (is_bet) {
                        const uuid = await write_errors(0, amount, config.bet.eodds, 'negative', await get_player_uuid(player_id), type)
                        await mc_error_handler(bot, 'pay', 'negative', player_id, '', uuid)
                    } else {
                        await mc_error_handler(bot, 'pay', 'negative', player_id)
                    }
                    resolve('negative')
                } else if (string == 'timeout') {
                    console.log(`[ERROR] 轉帳 ${amount} 個 ${type} 給 ${player_id} 時發生錯誤: 操作超時`)
                    
                    if (is_bet) {
                        const uuid = await write_errors(0, amount, config.bet.eodds, 'timeout', await get_player_uuid(player_id), type)
                        await mc_error_handler(bot, 'pay', 'timeout', player_id, '', uuid)
                    } else {
                        await mc_error_handler(bot, 'pay', 'timeout', player_id)
                    }
                    resolve('timeout')
                } else if (string.startsWith('[系統] 無法傳送訊息')) {
                    if (is_bet) {
                        const uuid = await write_errors(0, amount, config.bet.eodds, 'can\'t send msg', await get_player_uuid(player_id), type)
                        await mc_error_handler(bot, 'pay', 'can\'t send msg', player_id, '', uuid)
                    } else {
                        await mc_error_handler(bot, 'pay', 'can\'t send msg', player_id)
                    }
                    resolve('can\'t send msg')
                }
            })
        })
    } else if (type == 'c' || type == 'coin') {
        await chat(bot, `/cointrans ${player_id} ${Math.floor(amount)}`)
        await chat(bot, player_id)
        return 'success'
    }
}

module.exports = {
    pay_handler
}