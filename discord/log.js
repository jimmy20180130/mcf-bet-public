const fs = require('fs');
let client
let msgs = [];
let lastMessage;

function encodeToANSI(jsonMessage) {
    const ansiColors = {
        'black': '30',
        'dark_blue': '34',
        'dark_green': '32',
        'dark_aqua': '36',
        'dark_red': '31',
        'dark_purple': '35',
        'gold': '33',
        'gray': '37',
        'dark_gray': '90',
        'blue': '94',
        'green': '92',
        'aqua': '96',
        'red': '91',
        'light_purple': '95',
        'yellow': '93',
        'white': '97'
    };

    function convertColorToAnsi(color) {
        return ansiColors[color] || '37'; // Default to white if color is not found
    }

    function convertFormatToAnsi(format) {
        switch (format) {
            case 'bold':
                return '1';
            case 'italic':
                return '3'; // Discord doesn't support italic, use underline instead
            case 'underlined':
                return '4';
            default:
                return '0'; // Normal
        }
    }

    function convertMinecraftJsonToAnsi(textComponent) {
        let ansiCode = '';

        if (textComponent.color) {
            ansiCode += `\u001b[${convertFormatToAnsi(textComponent.format)};${convertColorToAnsi(textComponent.color)}m`;
        } else {
            ansiCode += '\u001b[0m'; // Reset to default color
        }

        if (textComponent.text) {
            ansiCode += textComponent.text;
        }

        if (textComponent.extra && textComponent.extra.length > 0) {
            for (const extraComponent of textComponent.extra) {
                ansiCode += convertMinecraftJsonToAnsi(extraComponent);
            }
        }

        return ansiCode;
    }

    return convertMinecraftJsonToAnsi(jsonMessage);
}

const discord_console = async (discord_client=undefined) => {
    if (discord_client !== undefined) client = discord_client;
    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
    let current_msg = msgs[0];
    if (current_msg != undefined) {
        let console_channel = client.channels.cache.get(config.discord_channels.console);
        if (console_channel !== undefined) {
            if (lastMessage != undefined) {
                if (`${lastMessage.content.replace('```ansi\n', '').replace('\n```', '')}\n${encodeToANSI(current_msg)}`.length < 1500) {
                    let newContent = '';
                    if (lastMessage.content.replace('```ansi\n', '').replace('\n```', '').replace(/ \[\d+\]$/g, '').endsWith(encodeToANSI(current_msg))) {
                        var regex = /\[\d+\]$/
                        if (regex.exec(lastMessage.content.replace('```ansi\n', '').replace('\n```', ''))) {
                            newContent = `${lastMessage.content.replace('```ansi\n', '').replace('\n```', '').replace(regex.exec(lastMessage.content.replace('```ansi\n', '').replace('\n```', ''))[0], `[${Number(regex.exec(lastMessage.content.replace('```ansi\n', '').replace('\n```', ''))[0].replace('[', '').replace(']', '')) + 1}]`)}`
                        } else {
                            newContent = `${lastMessage.content.replace('```ansi\n', '').replace('\n```', '')} [2]`
                        }
                    } else {
                        newContent = `${lastMessage.content.replace('```ansi\n', '').replace('\n```', '')}\n${encodeToANSI(current_msg)}`;
                    }
                    lastMessage = await lastMessage.edit(`\`\`\`ansi\n${newContent}\n\`\`\``)
                    msgs.shift();
                } else {
                    lastMessage = await console_channel.send(`\`\`\`ansi\n${encodeToANSI(current_msg)}\n\`\`\``)
                    msgs.shift();
                }
            } else {
                lastMessage = await console_channel.send(`\`\`\`ansi\n${encodeToANSI(current_msg)}\n\`\`\``)
                msgs.shift();
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log('找不到頻道')
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        current_msg = undefined;
    } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    discord_console();
};

const discord_console_2 = async (discord_client=undefined) => {
    if (discord_client !== undefined) client = discord_client;
    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
    let current_msg = msgs[0];
    if (current_msg != undefined) {
        let console_channel = client.channels.cache.get(config.discord_channels.console);
        if (console_channel !== undefined) {
            await console_channel.send(`\`\`\`ansi\n${encodeToANSI(current_msg)}\n\`\`\``)
            msgs.shift();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log('找不到頻道')
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        current_msg = undefined;
    } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    discord_console_2();
};

const add_msg = (message) => {
    msgs.push(message);
}

const clear_last_msg = () => {
    lastMessage = undefined
}

module.exports = {
    add_msg,
    discord_console,
    clear_last_msg,
    discord_console_2
}