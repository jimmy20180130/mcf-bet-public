const mineflayer = require('mineflayer');
const fs = require('fs');
let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const { add_bet_task, add_client, add_bot, process_bet_task } = require(`./bet/bet.js`);
const { chat } = require(`./utils/chat.js`);
const { get_player_uuid, get_player_name, clear_interval } = require(`./utils/get_player_info.js`);
const { start_rl, stop_rl } = require(`./utils/readline.js`);
const { process_msg } = require(`./utils/process_msg.js`);
const { mc_error_handler } = require(`./error/mc_handler.js`)
const { start_msg, stop_msg } = require(`./utils/chat.js`);
const { add_msg, discord_console, clear_last_msg, discord_console_2 } = require(`./discord/log.js`);
const { Client, GatewayIntentBits, Collection, Events, Partials, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { check_codes } = require(`./utils/link_handler.js`);
const { command_records, dc_command_records } = require(`./discord/command_record.js`);
const { bot_on, bot_off, bot_kicked } = require(`./discord/embed.js`);
const { get_user_data, get_all_players, get_all_user_data, update_player_id } = require(`./utils/database.js`);
const { canUseCommand } = require(`./utils/permissions.js`);
const { check_token } = require(`./auth/auth.js`);
const moment = require('moment-timezone');
const { initDB, closeDB } = require(`./utils/db_write.js`);
const path = require('path');
const Logger = require(`./utils/logger.js`);
const { pay_handler } = require('./utils/pay_handler.js');

initDB()

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    auth: 'microsoft',
    version: '1.20.1',
    checkTimeoutInterval:360000
};

const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
const commands = {}
let is_on_timeout;
let intervals = [];
let ads = [];
let auto_check_ad

let bot;
let client;
let is_on = false;

const filePath = 'cache/cache.json';
const defaultContent = {
    "bet": [],
    "msg": [],
    "player_names": []
};

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        Logger.error('Error reading file:', err);
        return;
    }

    try {
        JSON.parse(data);

    } catch (e) {
        Logger.error('Invalid JSON format:', e.message);
        fs.writeFile(filePath, JSON.stringify(defaultContent, null, 4), 'utf8', (writeErr) => {
            if (writeErr) {
                Logger.error('Error writing file:', writeErr);
            } else {
                Logger.log('The file content has been reset to default JSON format.');
            }
        });
    }
});

const cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
if (!cache.bet) {
    cache.bet = [];
}
if (!cache.msg) {
    cache.msg = [];
}
if (!cache.player_names) {
    cache.player_names = [];
}
fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4));

// open data/data.db
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/data.db', (err) => {
    if (err) {
        Logger.error('Error opening database:', err.message);
    } else {
        //check if there r player_id in table user_data, if not, modify the table
        db.run(`ALTER TABLE user_data ADD COLUMN player_id TEXT`, (err) => {
            if (err) {
                Logger.debug('Column player_id already exists');
            }
        });
    }
});

db.close((err) => {
    if (err) {
        Logger.error('Error closing database:', err.message);
    }
});

async function init_username() {
    const userdata = await get_all_user_data();
    if (!userdata || userdata == 'Not Found' || userdata == 'Unexpected Error') return;

    for (const player of userdata) {
        if (!player.player_id) {
            await update_player_id(player.player_uuid, await get_player_name(player.player_uuid))
            Logger.debug(`[資料庫] 玩家 ${player.player_uuid} 的名稱已更新`)
        }
    }   
}

init_username()

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (!command.name) continue;
    commands[command.name] = command.aliases;
}

const init_bot = async () => {
    Logger.log('正在讓 Minecraft 機器人上線...')
    const donate_list = [];
    bot = mineflayer.createBot(botArgs);
    
    bot.on('message', async (jsonMsg) => {
        config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/config/messages.json`, 'utf-8'));
        if (/^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(jsonMsg.toString())) {
            const msg = jsonMsg.toString()
            const pattern = /^\[([A-Za-z0-9_]+) -> 您\] .*/;
            const match = pattern.exec(msg);
            if (match) {
                let playerid = match[1];
                if (playerid === bot.username) {return};
                let args = msg.slice(8 + playerid.length);
                const commandName = args.split(' ')[0].toLowerCase();

                if (commandName == 'debug') {
                    await command_records(client, playerid, args)
                    require(`./commands/jimmy.js`).execute(bot, playerid, args, client);
                    return
                }

                for (item of Object.keys(commands)) {
                    if (commands[item].includes(commandName) || item == commandName) {
                        if (require(`./commands/donate.js`).name == commandName || require(`./commands/donate.js`).aliases.includes(commandName) && !donate_list.includes(playerid)) {
                            await command_records(client, playerid, args)
                            donate_list.push(playerid)
                            await chat(bot, `/m ${playerid} ${messages.commands.donate.start_donate}`)
                            const pay_msg_Promise = bot.awaitMessage(/^\[系統\] 您收到了/)
                            const timeout_Promise = new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('timeout');
                                }, 20000);
                            });
                            await Promise.race([pay_msg_Promise, timeout_Promise]).then(async string => {
                                if (string == 'timeout' && donate_list.includes(playerid)) {
                                    await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_timeout}`)
                                    donate_list.shift()
                                    return
                                } else {
                                    const msg = string;
                                    const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
                                    const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/
                                    const ematch = e_regex.exec(msg);
                                    const cmatch = c_regex.exec(msg);

                                    if (ematch) {
                                        let playeridd = ematch[1];
                                        if (!donate_list.includes(playeridd)) {
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.wait_until_no_ppl}`)
                                            donate_list.shift()
                                            return
                                        } else {
                                            let amount = parseInt(ematch[2].split(',').join(''))
                                            if (playeridd === bot.username) {return};
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_e_success.replaceAll('%amount%', amount)}`)
                                            donate_list.shift()
                                        }
                                    } else if (cmatch) {
                                        let playeridd = cmatch[1];
                                        if (!donate_list.includes(playeridd)) {
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.wait_until_no_ppl}`)
                                            donate_list.shift()
                                            return
                                        } else {
                                            let amount = parseInt(cmatch[2].split(',').join(''))
                                            if (playeridd === bot.username) {return};
                                            await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_c_success.replaceAll('%amount%', amount)}`)
                                            donate_list.shift()
                                        }
                                    }
                                }
                            })
                        } else if (require(`./commands/donate.js`).name == commandName || require(`./commands/donate.js`).aliases.includes(commandName) && donate_list.includes(playerid)) {
                            await command_records(client, playerid, args)
                            donate_list.shift()
                            await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_cancel}`)

                        } else if (require(`./commands/stop.js`).name == commandName || require(`./commands/stop.js`).aliases.includes(commandName)) {
                            await command_records(client, playerid, args)
                            if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
                                await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.stop['default'], playerid)}`)
                                await new Promise(r => setTimeout(r, 5000))
                                process.exit(135)
                            } else {
                                await mc_error_handler(bot, 'general', 'no_permission', playerid)
                            }

                        } else if (require(`./commands/reload.js`).name == commandName || require(`./commands/reload.js`).aliases.includes(commandName)) {
                            await command_records(client, playerid, args)
                            if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
                                await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.reload['default'], playerid)}`)
                                await new Promise(r => setTimeout(r, 5000))
                                process.exit(246)
                            } else {
                                await mc_error_handler(bot, 'general', 'no_permission', playerid)
                            }

                        } else {
                            await command_records(client, playerid, args)
                            require(`./commands/${item}.js`).execute(bot, playerid, args, client);
                        }
                        return
                    }
                }
            }
        } else if (jsonMsg.toString().startsWith(`[系統] 您收到了 `)) {
            const msg = jsonMsg.toString();
            const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
            const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/
            const ematch = e_regex.exec(msg);
            const cmatch = c_regex.exec(msg);

            if (ematch) {
                let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
                let playerid = ematch[1];
                if (donate_list.includes(playerid)) return
                let amount = parseInt(ematch[2].split(',').join(''))

                if (playerid === bot.username) {return};
                if (amount > config.bet.emax || amount < config.bet.emin) {
                    await chat(bot, `/m ${playerid} ${messages.errors.bet.e_over_limit.replaceAll('%emin%', config.bet.emin).replaceAll('%emax%', config.bet.emax)}`);
                    await pay_handler(bot, playerid, amount, 'emerald', client)
                    return
                }

                if (!is_on) {
                    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
                    cache.bet.push({"player_id": playerid, "amount": amount, "type": 'emerald', "added": false})
                    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    return
                }

                await add_bet_task(bot, playerid, amount, 'emerald');

            } else if (cmatch) {
                let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
                let playerid = cmatch[1];
                if (donate_list.includes(playerid)) return
                let amount = parseInt(cmatch[2].split(',').join(''))

                if (playerid === bot.username) {return};
                if (amount > config.bet.cmax || amount < config.bet.cmin) {
                    await chat(bot, `/m ${playerid} ${messages.errors.bet.c_over_limit.replaceAll('%cmin%', config.bet.cmin).replaceAll('%cmax%', config.bet.cmax)}`);
                    await pay_handler(bot, playerid, amount, 'coin', client)
                    return
                }

                if (!is_on) {
                    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
                    cache.bet.push({"player_id": playerid, "amount": amount, "type": 'coin', "added": false})
                    fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    return
                }

                await add_bet_task(bot, playerid, amount, 'coin');
            }
        } else if (jsonMsg.toString().startsWith(`[系統] `) && jsonMsg.toString().toLowerCase().includes(`想要你傳送到 該玩家 的位置`) || jsonMsg.toString().toLowerCase().includes(`想要傳送到 你 的位置`)) {
            //將字串以空格切開，例如 '1 2 3' => [1, 2, 3]
            let msg = jsonMsg.toString().split(" ")
            //取得玩家 id (訊息切開的第一個，例如 [1, 2, 3] => 2)
            let playerid = msg[1]
            //判斷玩家是否在白名單內，是的話就說 /tok ，否的話 /tno
            
            if (config.whitelist.includes(playerid) || config.whitelist.includes(playerid.toLowerCase())) {
                await chat(bot, '/tok')
            } else {
                await chat(bot, '/tno')
            }
        }
    });

    bot.on('message', async function (jsonMsg) {
        const textMessage = jsonMsg.toString()
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        const shouldSkipMessage = (textMessage) => {
            if (!config.console.public && /^\[公共\]/.test(textMessage) || /^\[\!\]/.test(textMessage)) return true;
            if (!config.console.trade && /^\[交易\]/.test(textMessage) || /^\[\$\]/.test(textMessage)) return true;
            if (!config.console.chat && /^\[閒聊\]/.test(textMessage) || /^\[\@\]/.test(textMessage)) return true;
            if (!config.console.lottery && /^\[抽獎\]/.test(textMessage) || /^\[\%\]/.test(textMessage)) return true;
            if (!config.console.region && /^\[區域\]/.test(textMessage)) return true;
            if (!config.console.facility && /^\[設施\]/.test(textMessage) || /^\[\!\]/.test(textMessage) || /^\[\*\]/.test(textMessage)) return true;
            if (!config.console.claim && /^\[領地\]/.test(textMessage)) return true;
            if (config.lottery_text && config.lottery_text != "" && textMessage.includes(config.lottery_text.replaceAll(/&[0-9a-f]/gi, ''))) return true
            if (config.trade_text && config.trade_text != "" && textMessage.includes(config.trade_text.replaceAll(/&[0-9a-f]/gi, ''))) return true
            if (config.facility_text && config.facility_text != "" && textMessage.includes(config.facility_text.replaceAll(/&[0-9a-f]/gi, ''))) return true
            if (config.claim_text && config.claim_text != "" && textMessage.includes(config.claim_text.replaceAll(/&[0-9a-f]/gi, ''))) return true

            if (!config.console.system) {
                if (/^\[系統\] 新玩家|系統\] 吉日|系統\] 凶日|系統\] .*凶日|系統\] .*吉日/.test(textMessage)) return true;
                if (/^ \> /.test(textMessage)) return true;
                if (/^\[系統\] .*提供了 小幫手提示/.test(textMessage)) return true;
                if (/^┌─回覆自/.test(textMessage)) return true;
                if (/^.* (has made the advancement|has completed the challenge|has reached the goal)/.test(textMessage)) return true;
                if (/players sleeping$/.test(textMessage)) return true;
                if (/目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)/g.test(textMessage)) return true;
                if (/^\[\?\]/.test(textMessage)) return true;
                if (/^\=\=/.test(textMessage)) return true;
                if (/^ >/.test(textMessage)) return true;
                if (/\[~\]/.test(textMessage)) return true;
            }

            return false;
        };

        if (shouldSkipMessage(textMessage)) return
        
        Logger.log(jsonMsg.toAnsi())
        add_msg(jsonMsg.json)
    });

    bot.once('spawn', async () => {
        Logger.log('Minecraft 機器人已上線!');
        
        if (config.discord.enabled) {
            Logger.debug('Discord 機器人已啟用')
            init_dc()
        } else {
            Logger.debug('Discord 機器人未啟用')
        }

        //wait until dc bot is ready
        while (!client) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));

        for (let item of cache.bet) {
            item.added = false
        }

        let botSocket = bot._client.socket;
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            const roundedX = Math.round(bot.entity.position.x);
            const roundedY = Math.round(bot.entity.position.y);
            const roundedZ = Math.round(bot.entity.position.z);
            const string = `【登入時間】${time}\n【連線位址】${botSocket.server ? botSocket.server : botSocket._host}\n【玩家名稱】${bot.username}\n【我的座標】(${roundedX}, ${roundedY}, ${roundedZ})`
            if (config.discord_channels.status) {
                const embed = await bot_on(string)
                const channel = await client.channels.fetch(config.discord_channels.status);
                await channel.send({ embeds: [embed] });
            }

            add_bot(bot)

            if (cache.msg.length > 0) {
                for (const item of cache.msg) {
                    await chat(bot, item);
                }
        
                cache.msg = []
                fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
            }

            await chat(bot, `[${moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')}] Jimmy Bot 已上線!`)
            await chat(bot, `如果剛剛有尚未處理的任務，請稍待 10 秒鐘，機器人應會繼續執行，感謝您的配合`)

            is_on_timeout = setTimeout(() => {
                is_on = true;

                process_bet_task()

                new Promise(async (resolve) => {
                    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
                    
                    if (cache.bet.length > 0) {
                        let cache_bet = cache.bet
                
                        for (const item of cache_bet) {
                            if (item.added == true) continue
                            
                            const playerid = item.player_id
                            const amount = item.amount
                            const type = item.type
                            await add_bet_task(bot, playerid, amount, type);
                        }
                
                        cache.bet = []
                        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    }
                
                    resolve()
                })
            }, 10000);

            const ad = async () => {
                let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                for (let item of config.advertisement) {
                    intervals.push(setInterval(async () => {
                        try {
                            let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                            if (config.advertisement.some(adObject => adObject.text == item.text && adObject.interval == item.interval)) {
                                await chat(bot, item.text)
                                Logger.debug(`發送廣告: ${item.text}`)
                            }
                        } catch (e) {Logger.error(e)}
                    }, item.interval))

                    ads.push(item)
                }

                
                auto_check_ad = setInterval(async () => {
                    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    for (let item of config.advertisement) {
                        if (!ads.some(adObj => adObj.text == item.text && adObj.interval == item.interval)) {
                            await chat(bot, item.text)
                            Logger.debug(`發送廣告: ${item.text}`)
                            intervals.push(setInterval(async () => {
                                try {
                                    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                                    if (config.advertisement.some(adObject => adObject.text == item.text && adObject.interval == item.interval)) {
                                        await chat(bot, item.text)
                                        Logger.debug(`發送廣告: ${item.text}`)
                                    }
                                } catch {}
                            }, item.interval))
                        }
                    }

                    ads = config.advertisement
                }, 5000)
            }

            for (let item of config.advertisement) {
                await chat(bot, item.text)
            }
    
            setTimeout(async () => {
                await ad()
            }, 5000)
        } catch (e) {
            Logger.error(e)
            process.exit(1000)
        }
    });

    bot.once('login', async () => {
        start_rl(bot)
        check_codes()
        Logger.log('Minecraft 機器人已成功登入伺服器');
        await start_msg(bot)
    });

    bot.once('error', async (err) => {
        Logger.error(err.message)
        clear_interval()
        clearInterval(auto_check_ad)

        for (let item of intervals) {
            clearInterval(item)
        }

        if (err.message == 'read ECONNRESET') {
            bot.end()
        } else {
            Logger.error(`Minecraft 機器人發生錯誤，原因如下: ${err.message}`)
            is_on = false;
            closeDB()
            process.exit(1000)
        }
    })

    bot.once('kicked', async (reason) => {
        clearTimeout(is_on_timeout)
        clearInterval(auto_check_ad)
        clear_interval()
        stop_rl()
        stop_msg()
        Logger.warn('Minecraft 機器人被伺服器踢出了!');
        Logger.warn(`原因如下: ${reason}`);
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        if (is_on == true) {
            const string = `【踢出時間】${time}\n【踢出原因】${reason}`
            const embed = await bot_kicked(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
        }

        bot.end();
    });

    bot.once('end', async () => {
        clearInterval(auto_check_ad)
        clearTimeout(is_on_timeout)
        stop_rl()
        stop_msg()
        clear_interval()

        for (let item of intervals) {
            clearInterval(item)
        }

        Logger.warn('Minecraft 機器人下線了!');
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        const string = `【下線時間】${time}`
        if (is_on == true) {
            const embed = await bot_off(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
            is_on = false;
        }
        await new Promise(r => setTimeout(r, 5000))
        process.exit(246)
    });
}

async function init_dc() {
    try {
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.GuildScheduledEvent,
                Partials.Message,
                Partials.Reaction,
                Partials.ThreadMember,
                Partials.User
            ]
        });

        add_client(client)

        client.commands = new Collection();

        const dc_commands = []
        const commandFiles = fs.readdirSync(path.join(__dirname, 'discord')).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(__dirname, `discord/${file}`));
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                dc_commands.push(command.data.toJSON());
            }
        }

        // Construct and prepare an instance of the REST module
        const rest = new REST().setToken(config.discord.bot_token);

        // and deploy your commands!
        (async () => {
            try {
                Logger.log(`Discord 機器人正在載入 ${dc_commands.length} 個斜線指令`);

                // The put method is used to fully refresh all commands in the guild with the current set
                const data = await rest.put(
                    Routes.applicationCommands(config.discord.bot_client_id),
                    { body: dc_commands },
                );

                Logger.log(`Discord 機器人成功載入 ${data.length} 個斜線指令`);
            } catch (error) {
                Logger.error(error);
            }
        })();

        client.once(Events.ClientReady, async c => {
            Logger.log(`Discord 機器人成功以 ${c.user.tag} 的名稱登入`)
            const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

            if (config.console.mode == 1) {
                discord_console(client)
            } else {
                discord_console_2(client)
            }
        })

        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (message.channel.type === 0) {
                let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                if (message.channel.id !== config.discord_channels.console) return;
                await chat(bot, message.content)
                clear_last_msg()
            }
        });
        // add role

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;
        
            const command = interaction.client.commands.get(interaction.commandName);

            let logMessage = `/${interaction.commandName}`;

            // 處理子命令組
            if (interaction.options.getSubcommandGroup(false)) {
                const subcommandGroup = interaction.options.getSubcommandGroup();
                logMessage += ` ${subcommandGroup}`;
            }

            // 處理子命令
            if (interaction.options.getSubcommand(false)) {
                const subcommand = interaction.options.getSubcommand();
                logMessage += ` ${subcommand}`;
            }

            // 處理參數
            const commandArgs = interaction.options._hoistedOptions.map(option => option.value);
            if (commandArgs.length > 0) {
                logMessage += ` ${commandArgs.join(' ')}`;
            }

            await dc_command_records(client, `<@${interaction.user.id}>`, logMessage)
        
            if (!command) {
                Logger.warn(`Discord 機器人的指令 ${interaction.commandName} 並不存在`);
                return;
            }
        
            try {
                await command.execute(interaction);
            } catch (error) {
                Logger.error(`Discord 機器人發生錯誤，錯誤如下: ${error.message}`);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: `執行指令時發生了錯誤，錯誤原因為: ${error.message} ，請將此截圖並回報給管理員`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `執行指令時發生了錯誤，錯誤原因為: ${error.message} ，請將此截圖並回報給管理員`, ephemeral: true });
                }
            }
        });

        // client.on(Events.InteractionCreate, async interaction => {
        //     if (!interaction.isButton()) return;
        //     if (interaction.customId != 'giveaway_join' && interaction.customId != 'giveaway_total' && !interaction.customId.startsWith('giveaway_leave')) return;

        //     if (interaction.customId === 'giveaway_join') {
        //         let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, 'utf-8'));
        //         let giveaway = giveaways[Object.keys(giveaways).filter(giveaway => giveaways[giveaway].message_id == interaction.message.id)[0]]

        //         if (!giveaway || giveaway.length == 0) {
        //             await interaction.reply({ content: '此抽獎活動不存在!', ephemeral: true });
        //             return;
        //         }

        //         const leave = new ButtonBuilder()
        //             .setCustomId('giveaway_leave' + giveaway.message_id)
        //             .setLabel('離開抽獎')
        //             .setStyle(ButtonStyle.Danger)
        //             .setDisabled(false)

        //         const leave_actionRow = new ActionRowBuilder()
        //             .addComponents(leave)

        //         if (giveaway.entries.includes(interaction.user.id)) {
        //             await interaction.reply({ content: '您已在參與抽獎人員的名單中!', ephemeral: true, components: [leave_actionRow] });
        //             return;
        //         }

        //         if (giveaway.excluded_role && interaction.member.roles.cache.has(giveaway.excluded_role) || giveaway.include_role && !interaction.member.roles.cache.has(giveaway.include_role)) {
        //             await interaction.reply({ content: '您無參與此次抽獎的權限!', ephemeral: true });
        //             return;
        //         }

        //         giveaway.entries.push(interaction.user.id);

        //         fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

        //         interaction.message.components[0].components[1].data.label = `參加人數 ${giveaway.entries.length}`

        //         await interaction.update({ components: [new ActionRowBuilder().addComponents(interaction.message.components[0].components[0]).addComponents(interaction.message.components[0].components[1])] })

        //         await interaction.followUp({ content: `您已成功參與抽獎`, ephemeral: true, components: [leave_actionRow] });

        //     } else if (interaction.customId.startsWith('giveaway_leave')) {
        //         let message_id = interaction.customId.replace('giveaway_leave', '')
        //         let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, 'utf-8'));
        //         let giveaway = giveaways[Object.keys(giveaways).filter(giveaway => giveaways[giveaway].message_id == message_id)[0]]

        //         interaction.message.components[0].components[0].data.disabled = true
        //         await interaction.update({ components: [new ActionRowBuilder().addComponents(interaction.message.components[0].components[0])] });

        //         if (!giveaway || giveaway.length == 0) {
        //             await interaction.reply({ content: '此抽獎活動不存在!', ephemeral: true });
        //             return;
        //         }

        //         if (!giveaway.entries.includes(interaction.user.id)) {
        //             if (interaction.replied) {
        //                 await interaction.followUp({ content: '您並未在參與抽獎人員的名單中!', ephemeral: true, components: [] });
        //             } else {
        //                 await interaction.reply({ content: '您並未在參與抽獎人員的名單中!', ephemeral: true, components: [] });
        //             }
        //             return;
        //         }

        //         giveaway.entries = giveaway.entries.filter(entry => entry != interaction.user.id);

        //         fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

        //         if (interaction.replied) {
        //             await interaction.followUp({ content: `您已成功離開抽獎`, ephemeral: true, components: [] });
        //         } else {
        //             await interaction.reply({ content: `您已成功離開抽獎`, ephemeral: true, components: [] });
        //         }

        //         // challel
        //         let channel = await client.channels.cache.get(giveaway.channel)
        //         let message = await channel.messages.fetch(giveaway.message_id)

        //         message.components[0].components[1].data.label = `參加人數 ${giveaway.entries.length}`

        //         await message.edit({ components: [new ActionRowBuilder().addComponents(message.components[0].components[0]).addComponents(message.components[0].components[1])] })
        //     } else if (interaction.customId.startsWith('giveaway_total')) {}
        // })

        //auto complete
        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isAutocomplete()) return

            let focused_value = ''
            let result = []
            let results = []
            const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

            switch (interaction.commandName) {
                case 'record':
                    try {
                        focused_value = interaction.options.getFocused().toLowerCase()

                        let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));
                        const user_roles = roles[client.guilds.cache.get(config.discord.guild_id).members.cache.get(interaction.member.id).roles.cache.map(role => role.id).filter((role) => {
                            if (Object.keys(roles).includes(role)) return true
                            else return false
                        })[0]]

                        const user_player_uuid = await get_user_data(undefined, interaction.member.id)

                        const user_player_name = await get_player_name(user_player_uuid.player_uuid)

                        if (!config.whitelist.includes(user_player_name) && (!user_roles || !user_roles.record_settings.others)) {
                            if (user_player_name.toLowerCase() != 'undefined' && focused_value.startsWith(user_player_name.toLowerCase()) || focused_value == '') {
                                await interaction.respond([{ name: user_player_name, value: user_player_name }])
                                return
                            } else {
                                await interaction.respond([{ name: '找不到玩家資料', value: '找不到玩家資料' }])
                                return
                            }
                        }

                        // 這個會返回一堆 Discord ID ，有個白癡以為這是玩家 ID
                        // 後來改成返回玩家 ID 了
                        let players = await get_all_players()
                        // 轉成玩家 ID，希望不要被 Mojang 429

                        players = players.filter(player => player && player != 'Not Found' && player != 'Unexpected Error')

                        if (players == 'Not Found' || players == 'Unexpected Error' || players == undefined) {
                            await interaction.respond([{ name: '找不到玩家資料', value: '找不到玩家資料' }])
                            return
                        }

                        if (config.whitelist.includes(user_player_name) || user_roles.record_settings.others) {
                            results.push({
                                name: '所有人',
                                value: '所有人'
                            })
                        }

                        result = players.filter(player => player.toLowerCase().startsWith(focused_value))
                        
                        results.push(...result.map(player => {
                            return {
                                name: player,
                                value: player
                            }   
                        }))

                        interaction.respond(results.slice(0, 25)).catch((e) => {Logger.error(e)})
                    } catch (e) {
                        Logger.error(e)
                        console.log(e)
                        interaction.respond([{ name: '查詢玩家資料時發生錯誤', value: '查詢玩家資料時發生錯誤' }]).catch(() => {})
                    }

                    break

                case '設定':
                    focused_value = interaction.options.getFocused()
                    result = config.advertisement.filter(ad => ad.text.startsWith(focused_value))
                    
                    if (focused_value == '') {
                        result = config.advertisement
                    }

                    results = result.map(ad => {
                        return {
                            name: ad.text.slice(0, 25),
                            value: ad.text.slice(0, 25)
                        }
                    })

                    interaction.respond(results.slice(0, 25)).catch(() => {})
                    break
            }
        })  

        // auto_ckeck_giveaway = setInterval(async () => {
        //     let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, 'utf-8'));
            
        //     for (const giveaway of Object.keys(giveaways)) {
        //         if (new Date() / 1000 > giveaways[giveaway].duration + giveaways[giveaway].start_time && !giveaways[giveaway].ended) {
        //             let giveaway_copy = giveaways[giveaway] 
        //             giveaways[giveaway].ended == true
        //             fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

        //             let entries = giveaway_copy.entries
        //             let winners = []

        //             for (let i=0; i<giveaway_copy.winners; i++) {
        //                 winners.push(entries[Math.floor(Math.random() * entries.length)])
        //             }
                    
        //             let channel = await client.channels.fetch(giveaway_copy.channel)
        //             let message = await channel.messages.fetch(giveaway_copy.message_id)
        //             let prize = giveaway_copy.prize
        //             let user = await client.users.fetch(winner)

        //             message.components[0].components[0].data.disabled = true

        //             await message.edit({ components: [new ActionRowBuilder().addComponents(message.components[0].components[0]).addComponents(message.components[0].components[1])] })
                    
        //             if (winners.length == 0) {
        //                 await message.reply({ content: '抽獎已結束，無人中獎' })
        //             } else {
        //                 winners = winners.map(winner => `- <@${winner}> \n`)

        //                 await message.reply({ content: `抽獎已結束，獲獎者為 \n${winners.join(', ')} 獎品已自動新增至您的錢包中，私訊 ${bot.username} 領錢 即可領取` })

        //                 const { add_player_wallet_dc, get_player_wallet_discord } = require('./utils/database.js')

        //                 for (let winner of winners) {
        //                     await add_player_wallet_dc(winner, Number(prize))
        //                     await new Promise(resolve => setTimeout(resolve, 1000))
        //                     wallet = await get_player_wallet_discord(winner)

        //                     switch (wallet) {
        //                         case 'error':
        //                             await channel.send('新增錢至錢包時發生錯誤')
        //                             break
        //                         case 'Not Found':
        //                             await channel.send(`該玩家無綁定資料`)
        //                             break
        //                         default:
        //                             const dm = await user.createDM()
    
        //                             try {
        //                                 await channel.send(`已成功新增玩家 <@${winner}> 的錢，如未收到，請聯絡管理員`)

        //                                 await dm.send(`管理員已新增 ${Number(prize)} 元至您的錢包中，您目前有 ${wallet} 元，在遊戲中私訊我 "領錢" 即可領取。`)

        //                             } catch (error) {
        //                                 await channel.send(`管理員已新增 ${Number(prize)} 元至 <@${winner}> 的錢包中，在遊戲中私訊我 "領錢" 即可領取。`)
        //                             }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // }, 700)

        client.on('error', async (error) => {
            Logger.error(error.stack)
        })

        client.login(config.discord.bot_token)

    } catch (e) {
        Logger.error(`Discord 機器人發生錯誤，錯誤如下 ${e.message}`)
        is_on = false;
        closeDB()
        process.exit(1)
    }
}

process.on("unhandledRejection", async (error) => {
    Logger.error(error)
    console.log(error)
    is_on = false;
    closeDB()
    process.exit(1)
});

process.on("uncaughtException", async (error) => {
    Logger.error(error)
    is_on = false;
    closeDB()
    process.exit(1)
});

process.on("uncaughtExceptionMonitor", async (error) => {
    Logger.error(error)
    is_on = false;
    closeDB()
    process.exit(1)
});

async function start_bot() {
    Logger.log('正在開始驗證您的金鑰')
    if (await check_token() == true) {
        Logger.log('金鑰驗證成功，正在啟動機器人...')
        init_bot()

        let check_bot_token = setInterval(async () => {
            if (!await check_token()) {
                Logger.error('無法連線至驗證伺服器，機器人將於 10 秒後下線')
                await new Promise(resolve => setTimeout(resolve, 10000));
                clearInterval(check_bot_token)
                process.exit(1)
            }
        }, 600000);

    } else {
        Logger.warn('驗證失敗，機器人將於 30 秒後重新連線至驗證伺服器')
        await new Promise(resolve => setTimeout(resolve, 30000));
        start_bot()
    }
}

start_bot()