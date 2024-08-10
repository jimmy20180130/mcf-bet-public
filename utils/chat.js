let message_list = []
let mc_bot = undefined;
const fs = require('fs');
const Logger = require('./logger.js');

const start_msg = async (bot=undefined) => {
    if (bot != undefined) mc_bot = bot
    while (mc_bot) {
        for (let i in message_list) {
            try {
                mc_bot.chat(message_list[0]);
                Logger.debug(`[說話] Bot 已發送訊息：${message_list[0]}`)
                message_list.shift()
                let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
                cache.msg.shift()
                fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
            } catch (error) {}

            await new Promise(r => setTimeout(r, 1000));
        }

        await new Promise(r => setTimeout(r, 50))
    }
}

const stop_msg = () => {
    Logger.debug('[說話] Bot 停止說話')
    mc_bot = undefined
}

const chat = async (bot, message) => {
    message_list.push(message)
    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
    cache.msg.push(message)
    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
    mc_bot = bot
    Logger.debug(`[說話] Bot 已接收到發送訊息請求：${message}`)
    return
}

module.exports = {
    chat,
    start_msg,
    stop_msg
}