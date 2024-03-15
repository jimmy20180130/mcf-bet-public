const mineflayer = require('mineflayer');
const fs = require('fs');
let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const { add_bet_task, add_client } = require(`./bet/bet.js`);
const { chat } = require(`./utils/chat.js`);
const { get_player_uuid } = require(`./utils/get_player_info.js`);
const { start_rl, stop_rl } = require(`./utils/readline.js`);
const { process_msg } = require(`./utils/process_msg.js`);
const { mc_error_handler } = require(`./error/mc_handler.js`)
const { start_msg, stop_msg } = require(`./utils/chat.js`);
const { add_msg, discord_console, clear_last_msg, discord_console_2 } = require(`./discord/log.js`);
const { Client, GatewayIntentBits, Collection, Events, Partials, REST, Routes } = require('discord.js');
const { check_codes } = require(`./utils/link_handler.js`);
const { command_records } = require(`./discord/command_record.js`);
const { bot_on, bot_off, bot_kicked } = require(`./discord/embed.js`);
const { get_user_data_from_dc, remove_user_role, add_user_role, getPlayerRole } = require(`./utils/database.js`);
const { orderStrings, canUseCommand } = require(`./utils/permissions.js`);
const { check_token } = require(`./auth/auth.js`);
const moment = require('moment-timezone');

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

let bot;
let client;
let is_on = false;

const cmdModule = require('./commands/cmd.js');
if (cmdModule.name) {
  commands[cmdModule.name] = cmdModule.aliases || [cmdModule.name];
}

// cpay 模組
const cpayModule = require('./commands/cpay.js');
if (cpayModule.name) {
  commands[cpayModule.name] = cpayModule.aliases || [cpayModule.name];
}

// daily 模組
const dailyModule = require('./commands/daily.js');
if (dailyModule.name) {
  commands[dailyModule.name] = dailyModule.aliases || [dailyModule.name];
}

// donate 模組
const donateModule = require('./commands/donate.js');
if (donateModule.name) {
  commands[donateModule.name] = donateModule.aliases || [donateModule.name];
}

// epay 模組
const epayModule = require('./commands/epay.js');
if (epayModule.name) {
  commands[epayModule.name] = epayModule.aliases || [epayModule.name];
}

// help 模組
const helpModule = require('./commands/help.js');
if (helpModule.name) {
  commands[helpModule.name] = helpModule.aliases || [helpModule.name];
}

// hi 模組
const hiModule = require('./commands/hi.js');
if (hiModule.name) {
  commands[hiModule.name] = hiModule.aliases || [hiModule.name];
}

// link 模組
const linkModule = require('./commands/link.js');
if (linkModule.name) {
  commands[linkModule.name] = linkModule.aliases || [linkModule.name];
}

// money 模組
const moneyModule = require('./commands/money.js');
if (moneyModule.name) {
  commands[moneyModule.name] = moneyModule.aliases || [moneyModule.name];
}

// play 模組
const playModule = require('./commands/play.js');
if (playModule.name) {
  commands[playModule.name] = playModule.aliases || [playModule.name];
}

// reload 模組
const reloadModule = require('./commands/reload.js');
if (reloadModule.name) {
  commands[reloadModule.name] = reloadModule.aliases || [reloadModule.name];
}

// say 模組
const sayModule = require('./commands/say.js');
if (sayModule.name) {
  commands[sayModule.name] = sayModule.aliases || [sayModule.name];
}

// stop 模組
const stopModule = require('./commands/stop.js');
if (stopModule.name) {
  commands[stopModule.name] = stopModule.aliases || [stopModule.name];
}

// wallet 模組
const walletModule = require('./commands/wallet.js');
if (walletModule.name) {
  commands[walletModule.name] = walletModule.aliases || [walletModule.name];
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
                            
                            switch (commandName) {
                                case 'cmd':
                                    require(`./commands/cmd.js`).execute(bot, playerid, args);
                                    break;
                                case 'cpay':
                                    require(`./commands/cpay.js`).execute(bot, playerid, args);
                                    break;
                                case 'daily':
                                    require(`./commands/daily.js`).execute(bot, playerid, args);
                                    break;
                                case 'donate':
                                    require(`./commands/donate.js`).execute(bot, playerid, args);
                                    break;
                                case 'epay':
                                    require(`./commands/epay.js`).execute(bot, playerid, args);
                                    break;
                                case 'help':
                                    require(`./commands/help.js`).execute(bot, playerid, args);
                                    break;
                                case 'hi':
                                    require(`./commands/hi.js`).execute(bot, playerid, args);
                                    break;
                                case 'link':
                                    require(`./commands/link.js`).execute(bot, playerid, args);
                                    break;
                                case 'money':
                                    require(`./commands/money.js`).execute(bot, playerid, args);
                                    break;
                                case 'play':
                                    require(`./commands/play.js`).execute(bot, playerid, args);
                                    break;
                                case 'reload':
                                    require(`./commands/reload.js`).execute(bot, playerid, args);
                                    break;
                                case 'say':
                                    require(`./commands/say.js`).execute(bot, playerid, args);
                                    break;
                                case 'stop':
                                    require(`./commands/stop.js`).execute(bot, playerid, args);
                                    break;
                                case 'wallet':
                                    require(`./commands/wallet.js`).execute(bot, playerid, args);
                                    break;
                            }
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
                if (/^\[>\]/.test(textMessage)) return true;
                if (/\[~\]/.test(textMessage)) return true;
            }

            return false;
        };

        if (shouldSkipMessage(textMessage)) return
        
        console.log(jsonMsg.toAnsi())
        add_msg(jsonMsg.json)
    });

    bot.once('spawn', async () => {
        console.log('[INFO] Minecraft 機器人已上線!');
        is_on = true;
        let botSocket = bot._client.socket;
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            const roundedX = Math.round(bot.entity.position.x);
            const roundedY = Math.round(bot.entity.position.y);
            const roundedZ = Math.round(bot.entity.position.z);
            const string = `【登入時間】${time}\n【連線位址】${botSocket.server ? botSocket.server : botSocket._host}\n【玩家名稱】${bot.username}\n【我的座標】(${roundedX}, ${roundedY}, ${roundedZ})`
            const embed = await bot_on(string)
            const channel = await client.channels.fetch(config.discord_channels.status);
            await channel.send({ embeds: [embed] });
            let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
            if (cache.bet.length > 0) {
                for (const item of cache.bet) {
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

            await chat(bot, `[${moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')}] Jimmy Bot 已上線!`)

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
            }

            try {
                if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
                if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
                if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`)
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
            process.exit(1000)
        }
    })

    bot.once('kicked', async (reason) => {
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
        stop_rl()
        stop_msg()
        console.log('[WARN] Minecraft 機器人被伺服器踢出了!');
        console.log(`[WARN] 原因如下: ${reason}`);
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        const string = `【踢出時間】${time}\n【踢出原因】${reason}`
        const embed = await bot_kicked(string)
        const channel = await client.channels.fetch(config.discord_channels.status);
        await channel.send({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 2000))
        bot.end();
    });

    bot.once('end', async () => {
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
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
        await new Promise(r => setTimeout(r, 10000))
        init_bot()
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
        // add role

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;
        
            const command = interaction.client.commands.get(interaction.commandName);
            interaction.client.commands
        
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
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
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

        client.login(config.discord.bot_token)
    } catch (e) {
        console.log(`[ERROR] Discord 機器人發生錯誤，錯誤如下 ${e.message}`)
        process.exit(1)
    }
}

process.on("unhandledRejection", async (error) => {
    console.log(error.message)
    is_on = false;
    process.exit(1)
});

process.on("uncaughtException", async (error) => {
    console.log(error.message)
    is_on = false;
    process.exit(1)
});

process.on("uncaughtExceptionMonitor", async (error) => {
    console.log(error.message)
    is_on = false;
    process.exit(1)
});

async function start_bot() {
    console.log('[INFO] 正在開始驗證您的金鑰')
    if (await check_token() == true) {
        console.log('[INFO] 金鑰驗證成功，正在啟動機器人...')
        init_bot()
        init_dc()

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