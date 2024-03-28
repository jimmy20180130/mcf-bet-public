const readline = require('readline')
const { chat } = require(`${process.cwd()}/utils/chat.js`);
let bot_is_on = false;

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout   
});

rl.on('line', async function (line) {
    if (line.startsWith('direct')) {
        if (bot_is_on) bot_is_on.chat(line.replace('direct', ''))
    } else if (bot_is_on) {
        await chat(bot_is_on, line.replaceAll('\n', ''))
    }

});

const start_rl = (bot) => {
    bot_is_on = bot
}

const stop_rl = () => {
    bot_is_on = false
}

module.exports = {
    start_rl,
    stop_rl
}