const mineflayer = require('mineflayer');
const fs = require('fs');
let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const { add_bet_task, add_client, process_bet_task, add_bot } = require(`./bet/bet.js`);
const { chat } = require(`./utils/chat.js`);
const { get_player_uuid } = require(`./utils/get_player_info.js`);
const { start_rl, stop_rl } = require(`./utils/readline.js`);
const { process_msg } = require(`./utils/process_msg.js`);
const { mc_error_handler } = require(`./error/mc_handler.js`)
const { start_msg, stop_msg } = require(`./utils/chat.js`);
const { add_msg, discord_console, clear_last_msg, discord_console_2 } = require(`./discord/log.js`);
const { Client, GatewayIntentBits, Collection, Events, Partials, REST, Routes } = require('discord.js');
const { check_codes } = require(`./utils/link_handler.js`);
const { command_records, dc_command_records } = require(`./discord/command_record.js`);
const { bot_on, bot_off, bot_kicked } = require(`./discord/embed.js`);
const { get_user_data_from_dc, remove_user_role, add_user_role, getPlayerRole, set_user_role } = require(`./utils/database.js`);
const { orderStrings, canUseCommand } = require(`./utils/permissions.js`);
const { check_token } = require(`./auth/auth.js`);
const moment = require('moment-timezone');
const { initDB, closeDB } = require(`./utils/db_write.js`);
const { get_all_user_data } = require(`./utils/database.js`)
const { doAuth } = require(`./auth/login.js`);

initDB()

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    auth: config.bot_args.auth,
    version: config.bot_args.version
};

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = {}
let trade_and_lottery;
let facility;
let auto_warp;
let claim;
let is_on_timeout;
let add_bott;
let auto_update_role;

let bot;
let client;
let is_on = false;

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (!command.name) continue;
    commands[command.name] = command.aliases;
}

const init_bot = async () => {
    console.log('[INFO] 正在讓 Minecraft 機器人上線...')
    const donate_list = [];
    bot = mineflayer.createBot(botArgs);

    bot.on('message', async (jsonMsg) => {
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
                                    const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*) 村民錠\)/
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
                            if (await getPlayerRole(await get_player_uuid(playerid))) {
                                if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
                                    await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.stop['default'], playerid)}`)
                                    await new Promise(r => setTimeout(r, 5000))
                                    process.exit(135)
                                } else {
                                    await mc_error_handler(bot, 'general', 'no_permission', playerid)
                                }
                            } else {
                                await mc_error_handler(bot, 'general', 'no_permission', playerid)
                            }

                        } else if (require(`./commands/reload.js`).name == commandName || require(`./commands/reload.js`).aliases.includes(commandName)) {
                            if (await getPlayerRole(await get_player_uuid(playerid))) {
                                if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
                                    await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.reload['default'], playerid)}`)
                                    await new Promise(r => setTimeout(r, 5000))
                                    process.exit(246)
                                } else {
                                    await mc_error_handler(bot, 'general', 'no_permission', playerid)
                                }
                            } else {
                                await mc_error_handler(bot, 'general', 'no_permission', playerid)
                            }

                        } else {
                            await command_records(client, playerid, args)
                            require(`./commands/${item}.js`).execute(bot, playerid, args);
                        }
                        return
                    }
                }

                bot.chat(`/m ${playerid} 指令不存在`);
            }
        } else if (jsonMsg.toString().startsWith(`[系統] 您收到了 `)) {
            const msg = jsonMsg.toString();
            const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
            const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*) 村民錠\)/
            const ematch = e_regex.exec(msg);
            const cmatch = c_regex.exec(msg);

            if (ematch) {
                let playerid = ematch[1];
                if (donate_list.includes(playerid)) return
                let amount = parseInt(ematch[2].split(',').join(''))

                if (playerid === bot.username) {return};
                if (amount > config.bet.emax || amount < config.bet.emin) {
                    await chat(bot, `/m ${playerid} ${messages.errors.bet.e_over_limit.replaceAll('%emin%', config.bet.emin).replaceAll('%emax%', config.bet.emax)}`);
                    await chat(bot, `/pay ${playerid} ${amount}`)
                    return
                }

                await add_bet_task(bot, playerid, amount, 'emerald');
            } else if (cmatch) {
                let playerid = cmatch[1];
                if (donate_list.includes(playerid)) return
                let amount = parseInt(cmatch[2].split(',').join(''))

                if (playerid === bot.username) {return};
                if (amount > config.bet.cmax || amount < config.bet.cmin) {
                    await chat(bot, `/m ${playerid} ${messages.errors.bet.c_over_limit.replaceAll('%cmin%', config.bet.cmin).replaceAll('%cmax%', config.bet.cmax)}`);
                    await chat(bot, `/cointrans ${playerid} ${amount}`)
                    await chat(bot, playerid)
                    return
                }

                await add_bet_task(bot, playerid, amount, 'coin');
            }
        } else if (jsonMsg.toString().startsWith(`[系統] `) && jsonMsg.toString().toLowerCase().includes(`想要你傳送到 該玩家 的位置`)) {
            let msg = jsonMsg.toString().split(" ")
            let playerid = msg[1]
            if (playerid == 'XiaoXi_YT') { 
                await chat(bot, `/tok`)
            } else {
                await chat(bot, `/tno`)
            }
        } else if (jsonMsg.toString().startsWith(`[系統] `) && jsonMsg.toString().toLowerCase().includes(`想要傳送到 你 的位置`)) {
            let msg = jsonMsg.toString().split(" ")
            let playerid = msg[1]
            if (playerid == 'XiaoXi_YT') { 
                await chat(bot, `/tok`)
            } else {
                await chat(bot, `/tno`)
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
                if (/^\[系統\] (新玩家|吉日|凶日|.*凶日|.*吉日)|^ \> |\[系統\] .*提供了 小幫手提示|\[系統\] 您的訊息沒有玩家看見|^┌─回覆自|.* (has made the advancement|has completed the challenge|has reached the goal)|players sleeping$|目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)|^\[\?\]|\=\=|\[>\]|\[~\]/.test(textMessage)) return true;
            }

            return false;
        };

        if (shouldSkipMessage(textMessage)) return
        
        console.log(jsonMsg.toAnsi())
        add_msg(jsonMsg.json)
    });

    bot.once('spawn', async () => {
        console.log('[INFO] Minecraft 機器人已上線!');
        init_dc()
        let botSocket = bot._client.socket;
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            const roundedX = Math.round(bot.entity.position.x);
            const roundedY = Math.round(bot.entity.position.y);
            const roundedZ = Math.round(bot.entity.position.z);
            const string = `【登入時間】${time}\n【連線位址】${botSocket.server ? botSocket.server : botSocket._host}\n【玩家名稱】${bot.username}\n【我的座標】(${roundedX}, ${roundedY}, ${roundedZ})`
            const embed = await bot_on(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
            let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));

            process_bet_task()

            await chat(bot, `[${moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')}] Jimmy Bot 已上線!`)

            is_on_timeout = setTimeout(() => {
                is_on = true;

                new Promise(async (resolve) => {
                    let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
                    
                    if (cache.bet.length > 0) {
                        let cache_bet = cache.bet
                
                        for (const item of cache_bet) {
                            const playerid = item.player_id
                            const amount = item.amount
                            const type = item.type
                            await add_bet_task(bot, playerid, amount, type);
                        }
                
                        cache.bet = []
                        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    }
                
                    if (cache.msg.length > 0) {
                        for (const item of cache.msg) {
                            await chat(bot, item);
                        }
                
                        cache.msg = []
                        fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4))
                    }
                
                    resolve()
                })
            }, 10000);

            const ad = () => {
                trade_and_lottery = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try {
                        if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
                        if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
                    } catch {}
                }, 605000)
        
                facility = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try { if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`) } catch {}
                }, 1805000)
        
                auto_warp = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try { bot.chat(config.warp) } catch {}
                }, 600000)

                claim = setInterval(function () {
                    config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))
                    try { bot.chat(config.claim_text) } catch {}
                }, 120000)

                add_bott = setInterval(function () {
                    add_bot(bot)
                }, 1000)
            }

            try {
                if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
                if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
                if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`)
                if (config.claim_text && config.claim_text !== '') bot.chat(config.claim_text)
                if (bot) add_bot(bot)
            } catch {}
    
            setTimeout(() => {
                ad()
            }, 5000)
        } catch (e) {}
    });

    bot.once('login', async () => {
        start_rl(bot)
        check_codes()
        console.log('[INFO] Minecraft 機器人已成功登入伺服器');
        await start_msg(bot)
    });

    bot.once('error', async (err) => {
        console.log(err.message)
        if (err.message == 'read ECONNRESET') {
            bot.end()
        } else {
            console.log(`[ERROR] Minecraft 機器人發生錯誤，原因如下: ${err.message}`)
            is_on = false;
            closeDB()
            process.exit(1000)
        }
    })

    bot.once('kicked', async (reason) => {
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
        clearInterval(claim)
        clearTimeout(is_on_timeout)
        clearInterval(add_bott)
        stop_rl()
        stop_msg()
        console.log('[WARN] Minecraft 機器人被伺服器踢出了!');
        console.log(`[WARN] 原因如下: ${reason}`);
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
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
        clearTimeout(is_on_timeout)
        clearInterval(claim)
        clearInterval(add_bott)
        stop_rl()
        stop_msg()
        console.log('[WARN] Minecraft 機器人下線了!');
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

const init_dc = () => {
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
        const commandFiles = fs.readdirSync(process.cwd() + '/discord').filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`./discord/${file}`);
            
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
                console.log(`[INFO] Discord 機器人正在載入 ${dc_commands.length} 個斜線指令`);

                // The put method is used to fully refresh all commands in the guild with the current set
                const data = await rest.put(
                    Routes.applicationCommands(config.discord.bot_client_id),
                    { body: dc_commands },
                );

                console.log(`[INFO] Discord 機器人成功載入 ${data.length} 個斜線指令`);
            } catch (error) {
                console.log(error);
            }
        })();

        client.once(Events.ClientReady, async c => {
            console.log(`[INFO] Discord 機器人成功以 ${c.user.tag} 的名稱登入`)
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

        client.on('interactionCreate', async interaction => {
            if (!interaction.isAutocomplete()) return;
            if (interaction.commandName !== 'record') return;

            const focusedValue = interaction.options.getFocused();
            
            let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));

            let user_uuid = undefined
            const user_data = (await get_user_data_from_dc(String(interaction.member.id)))[0]
            if (user_data.player_uuid) user_uuid = user_data.player_uuid
            const user_role = orderStrings(await getPlayerRole(user_uuid), roles)

            if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.others) {
                if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.me == false) {
                    const all_user_data = await get_all_user_data()
                    const player_ids = []

                    for (const user of all_user_data) {
                        if (user.realname && user.player_uuid != user_uuid) {
                            player_ids.push(user.realname)
                        }
                    }

                    let filtered = ['所有人']
                    filtered.push(...player_ids.filter(choice => choice.toLowerCase().startsWith(focusedValue)));

                    await interaction.respond(
                        filtered.map(choice => ({ name: choice, value: choice })).slice(0, 25)
                    );
                    
                    return
                } else {
                    const all_user_data = await get_all_user_data()
                    const player_ids = []

                    for (const user of all_user_data) {
                        if (user.realname) {
                            player_ids.push(user.realname)
                        }
                    }

                    let filtered = ['所有人']
                    filtered.push(...player_ids.filter(choice => choice.toLowerCase().startsWith(focusedValue)));

                    await interaction.respond(
                        filtered.map(choice => ({ name: choice, value: choice })).slice(0, 25)
                    );
                    
                    return
                }


            } else if (user_data && roles[user_role[0]] && !roles[user_role[0]].record_settings.others) {
                let filtered = []
                filtered.push(user_data.realname)
                filtered = filtered.filter(choice => choice != undefined && choice.toLowerCase().startsWith(focusedValue));

                if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.me == false) {
                    await interaction.respond([{name: '查無結果', value: '查無結果'}])
                    return

                } else {

                    if (filtered.length == 0) {
                        await interaction.respond([{name: '查無結果', value: '查無結果'}])
                        return
                    } else {
                        await interaction.respond(
                            filtered.map(choice => ({ name: choice, value: choice }))
                        );
                    }
                    
                    return
                }
            }
        })

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
                console.log(`[ERROR] Discord 機器人的指令 ${interaction.commandName} 並不存在`);
                return;
            }
        
            try {
                await command.execute(interaction);
            } catch (error) {
                console.log(error)
                console.log(`[ERROR] Discord 機器人發生錯誤，錯誤如下: ${error.message}`);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: `執行指令時發生了錯誤，錯誤原因為: ${error.message} ，請將此截圖並回報給管理員`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `執行指令時發生了錯誤，錯誤原因為: ${error.message} ，請將此截圖並回報給管理員`, ephemeral: true });
                }
            }
        });

        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const old_player_roles = oldMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
            const new_player_roles = newMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
            if (old_player_roles.length < new_player_roles.length) {
                const role = newMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id).filter(role => !old_player_roles.includes(role));
                const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                const player_data = (await get_user_data_from_dc(newMember.id))[0]
                if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) return
                const player_role = orderStrings(player_data.roles, roles)
                if (!player_data.discord_id && player_role.includes('none')) return
                for (const config_role of Object.keys(roles)) {
                    for (const user_role of role) {
                        if (roles[config_role] && roles[config_role].discord_id == user_role) {
                            if (player_data.roles.includes(config_role)) return
                            await add_user_role(newMember.id, config_role)
                        }
                    }
                }

            } else if (old_player_roles.length > new_player_roles.length) {
                const role = oldMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id).filter(role => !new_player_roles.includes(role));
                const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                const player_data = (await get_user_data_from_dc(newMember.id))[0]
                if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) return
                const player_role = orderStrings(player_data.roles, roles)
                if (!player_data.discord_id && player_role.includes('none')) return
                for (const config_role of Object.keys(roles)) {
                    for (const user_role of role) {
                        if (roles[config_role] && roles[config_role].discord_id == user_role) {
                            await remove_user_role(newMember.id, config_role)
                        }
                    }
                }

                if ((await get_user_data_from_dc(newMember.id))[0].roles == '' || (await get_user_data_from_dc(newMember.id))[0].roles == undefined) {
                    await add_user_role(newMember.id, 'none')
                }
            }
        });
    
        auto_update_role = setInterval(async () => {
            if (client) {
                const guild = await client.guilds.cache.get(config.discord.guild_id);
                //get members from a guild
                const members = await guild.members.fetch().then(member => {
                    return member
                }).catch(err => {
                    console.log(err)
                });

                const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

                for (const member of members) {
                    const player_data = (await get_user_data_from_dc(member[1].user.id))[0]
                    if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) continue
                    const player_role = orderStrings(player_data.roles, roles)
                    
                    if (!player_data.discord_id && player_role.includes('none')) continue

                    let discord_user_roles = []

                    for (const config_role of Object.keys(roles)) {
                        if (guild.members.cache.get(member[1].user.id).roles.cache.map(role => role.id).includes(roles[config_role].discord_id)) {
                            discord_user_roles.push(config_role)
                        }
                    }

                    if (discord_user_roles.length == 0) {
                        discord_user_roles.push('none')
                    }

                    set_user_role(member[1].user.id, discord_user_roles.join(', '))
                }
            }
        }, 60000)

        client.login(config.discord.bot_token)
    } catch (e) {
        console.log(`[ERROR] Discord 機器人發生錯誤，錯誤如下 ${e.message}`)
        is_on = false;
        closeDB()
        process.exit(1)
    }
}

process.on("unhandledRejection", async (error) => {
    console.log(error)
    is_on = false;
    closeDB()
    process.exit(1)
});

process.on("uncaughtException", async (error) => {
    if (error.message.startsWith('Failed to obtain profile data for')) {
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

        await doAuth(config.botArgs.username)
    }

    console.log(error)
    is_on = false;
    closeDB()
    process.exit(1)
});

process.on("uncaughtExceptionMonitor", async (error) => {
    console.log(error)
    is_on = false;
    closeDB()
    process.exit(1)
});

async function start_bot() {
    console.log('[INFO] 正在開始驗證您的金鑰')
    if (await check_token() == true) {
        console.log('[INFO] 金鑰驗證成功，正在啟動機器人...')
        init_bot()

        let check_bot_token = setInterval(async () => {
            if (!await check_token()) {
                console.log('[WARN] 無法連線至驗證伺服器，機器人將於 10 秒後下線')
                await new Promise(resolve => setTimeout(resolve, 10000));
                clearInterval(check_bot_token)
                process.exit(1)
            }
        }, 600000);

    } else {
        console.log('[ERROR] 驗證失敗，機器人將於 30 秒後重新連線至驗證伺服器')
        await new Promise(resolve => setTimeout(resolve, 30000));
        start_bot()
    }
}

start_bot()