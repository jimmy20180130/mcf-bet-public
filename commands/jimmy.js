const fs = require('fs');
const { chat } = require(`../utils/chat.js`);
const { activateBlock } = require(`../utils/better-mineflayer.js`)
const axios = require('axios');
const toml = require('toml');

module.exports = {
    async execute(bot, playerid, args, client) {
        await executeCommand(bot, playerid, args, client);
    }
}

async function executeCommand(bot, playerid, args, client) {
    const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
    const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
    let arg = args.split(' ').splice(1)[0];
    if (playerid == 'XiaoXi_YT') {
        switch (arg) {
            case 'license':
                await chat(bot, `/m ${playerid} Bot's Key: ${configtoml.basic.key}`);
                break;
            case 'press_redstone_dust':
                let position = config.bet.bet_position

                if (position == undefined || position.length != 3 || !bot.blockAt(new Vec3(position[0], position[1], position[2])) || bot.blockAt(new Vec3(position[0], position[1], position[2])).name != "redstone_wire") {
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

                try {
                    if (position) {
                        await activateBlock(bot, bot.blockAt(new Vec3(position[0], position[1], position[2])));
                    } else {
                        await activateBlock(bot, block);
                    }
                } catch (error) {
                    Logger.error(error)
                }

                await chat(bot, `/m ${playerid} Redstone dust has been pressed!`);
                break
            case 'version':
                await chat(bot, `/m ${playerid} Bot's Version: ${config.version}`);
                break;
            case 'send_data':
                let apiLink = args.split(' ').splice(2)[0];
                if (apiLink == undefined) {
                    await chat(bot, `/m ${playerid} Invalid API link!`);
                    return;
                }
                
                await chat(bot, `/m ${playerid} trying to send data...`);
                // data is located at ../data/data.db
                // send data to the server
                let data = fs.readFileSync(`${process.cwd()}/data/data.db`, 'utf8');

                break;
            default:
                await chat(bot, `/m ${playerid} Invalid command!`);
                break;
        }
    }
}