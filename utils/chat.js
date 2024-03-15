let message_list = []
let mc_bot = undefined;
const fs = require('fs');

const start_msg = async (bot=undefined) => {
    if (bot != undefined) mc_bot = bot
    while (mc_bot) {
        for (let i in message_list) {
            try {
                mc_bot.chat(message_list[0]);
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
    mc_bot = undefined
}

const chat = async (bot, message) => {
    message_list.push(message)
    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
    cache.msg.push(message)
    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
    mc_bot = bot
    return
}

module.exports = {
    chat,
    start_msg,
    stop_msg
}