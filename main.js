const mineflayer = require('mineflayer');
const fs = require('fs');
let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const { add_bet_task, add_client, add_bot, process_bet_task } = require(`./bet/bet.js`);
const { chat } = require(`./utils/chat.js`);
const { get_player_uuid } = require(`./utils/get_player_info.js`);
const { start_rl, stop_rl } = require(`./utils/readline.js`);
const { process_msg } = require(`./utils/process_msg.js`);
const { mc_error_handler } = require(`./error/mc_handler.js`)
const { start_msg, stop_msg } = require(`./utils/chat.js`);
const { add_msg, discord_console, clear_last_msg, discord_console_2 } = require(`./discord/log.js`);
const { Client, GatewayIntentBits, Collection, Events, Partials, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { check_codes } = require(`./utils/link_handler.js`);
const { command_records, dc_command_records } = require(`./discord/command_record.js`);
const { bot_on, bot_off, bot_kicked } = require(`./discord/embed.js`);
const { get_user_data_from_dc, remove_user_role, add_user_role, getPlayerRole, set_user_role, remove_user_discord_id, get_all_user_data } = require(`./utils/database.js`);
const { orderStrings, canUseCommand } = require(`./utils/permissions.js`);
const { check_token } = require(`./auth/auth.js`);
const moment = require('moment-timezone');
const { initDB, closeDB } = require(`./utils/db_write.js`);

initDB()

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    auth: config.bot_args.auth,
    version: config.bot_args.version,
    checkTimeoutInterval:360000
};

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = {}
let is_on_timeout;
let auto_update_role;
let intervals = [];
let auto_ckeck_giveaway;

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
            }
        } else if (jsonMsg.toString().startsWith(`[系統] 您收到了 `)) {
            const msg = jsonMsg.toString();
            const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
            const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*) 村民錠\)/
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
                    await chat(bot, `/pay ${playerid} ${amount}`)
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
                    await chat(bot, `/cointrans ${playerid} ${amount}`)
                    await chat(bot, playerid)
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
            
            if (config.roles.tpa.includes(playerid) || config .roles.tpa.includes(playerid.toLowerCase())) {
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
                if (/^(?:\[系統\] (?:新玩家|吉日|凶日|.*凶日|.*吉日)|\>|\[系統\] .*提供了 小幫手提示|\[系統\] 您的訊息沒有玩家看見|┌─回覆自|.* (?:has made the advancement|has completed the challenge|has reached the goal)|players sleeping|目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)|^\[\?]|^\=\=|\[>\]|\[~\])/.test(textMessage)) return true
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

            add_bot(bot)
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
                let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))

                for (let item of config.advertisement) {
                    intervals.push(setInterval(async () => {
                        try {
                            await chat(bot, item.text)
                        } catch {}
                    }, item.interval))
                }
            }

            for (let item of config.advertisement) {
                await chat(bot, item.text)
            }
    
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
        clearTimeout(is_on_timeout)
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
        clearTimeout(is_on_timeout)
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
            try {
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
            } catch (e) {
                console.log(e)
            }
        });

        //member leave event
        client.on(Events.GuildMemberRemove, async member => {
            try {
                await remove_user_discord_id(member.id)
            } catch (e) {
                console.log(e)
            }
        });

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isButton()) return;
            if (interaction.customId != 'giveaway_join' && interaction.customId != 'giveaway_total' && !interaction.customId.startsWith('giveaway_leave')) return;

            if (interaction.customId === 'giveaway_join') {
                let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, 'utf-8'));
                let giveaway = giveaways[Object.keys(giveaways).filter(giveaway => giveaways[giveaway].message_id == interaction.message.id)[0]]

                if (!giveaway || giveaway.length == 0) {
                    await interaction.reply({ content: '此抽獎活動不存在!', ephemeral: true });
                    return;
                }

                const leave = new ButtonBuilder()
                    .setCustomId('giveaway_leave' + giveaway.message_id)
                    .setLabel('離開抽獎')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(false)

                const leave_actionRow = new ActionRowBuilder()
                    .addComponents(leave)

                if (giveaway.entries.includes(interaction.user.id)) {
                    await interaction.reply({ content: '您已在參與抽獎人員的名單中!', ephemeral: true, components: [leave_actionRow] });
                    return;
                }

                if (giveaway.excluded_role && interaction.member.roles.cache.has(giveaway.excluded_role) || giveaway.include_role && !interaction.member.roles.cache.has(giveaway.include_role)) {
                    await interaction.reply({ content: '您無參與此次抽獎的權限!', ephemeral: true });
                    return;
                }

                giveaway.entries.push(interaction.user.id);

                fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

                interaction.message.components[0].components[1].data.label = `參加人數 ${giveaway.entries.length}`

                await interaction.update({ components: [new ActionRowBuilder().addComponents(interaction.message.components[0].components[0]).addComponents(interaction.message.components[0].components[1])] })

                await interaction.followUp({ content: `您已成功參與抽獎`, ephemeral: true, components: [leave_actionRow] });

            } else if (interaction.customId.startsWith('giveaway_leave')) {
                let message_id = interaction.customId.replace('giveaway_leave', '')
                let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, 'utf-8'));
                let giveaway = giveaways[Object.keys(giveaways).filter(giveaway => giveaways[giveaway].message_id == message_id)[0]]

                interaction.message.components[0].components[0].data.disabled = true
                await interaction.update({ components: [new ActionRowBuilder().addComponents(interaction.message.components[0].components[0])] });

                if (!giveaway || giveaway.length == 0) {
                    await interaction.reply({ content: '此抽獎活動不存在!', ephemeral: true });
                    return;
                }

                if (!giveaway.entries.includes(interaction.user.id)) {
                    if (interaction.replied) {
                        await interaction.followUp({ content: '您並未在參與抽獎人員的名單中!', ephemeral: true, components: [] });
                    } else {
                        await interaction.reply({ content: '您並未在參與抽獎人員的名單中!', ephemeral: true, components: [] });
                    }
                    return;
                }

                giveaway.entries = giveaway.entries.filter(entry => entry != interaction.user.id);

                fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

                if (interaction.replied) {
                    await interaction.followUp({ content: `您已成功離開抽獎`, ephemeral: true, components: [] });
                } else {
                    await interaction.reply({ content: `您已成功離開抽獎`, ephemeral: true, components: [] });
                }

                // challel
                let channel = await client.channels.cache.get(giveaway.channel)
                let message = await channel.messages.fetch(giveaway.message_id)

                message.components[0].components[1].data.label = `參加人數 ${giveaway.entries.length}`

                await message.edit({ components: [new ActionRowBuilder().addComponents(message.components[0].components[0]).addComponents(message.components[0].components[1])] })
            } else if (interaction.customId.startsWith('giveaway_total')) {}
        })

        auto_ckeck_giveaway = setInterval(async () => {
            let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, 'utf-8'));
            
            for (const giveaway of Object.keys(giveaways)) {
                if (new Date() / 1000 > giveaways[giveaway].duration + giveaways[giveaway].start_time && !giveaways[giveaway].ended) {
                    let giveaway_copy = giveaways[giveaway] 
                    giveaways[giveaway].ended == true
                    fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

                    let entries = giveaway_copy.entries
                    let winners = []

                    for (let i=0; i<giveaway_copy.winners; i++) {
                        winners.push(entries[Math.floor(Math.random() * entries.length)])
                    }
                    
                    let channel = await client.channels.fetch(giveaway_copy.channel)
                    let message = await channel.messages.fetch(giveaway_copy.message_id)
                    let prize = giveaway_copy.prize
                    let user = await client.users.fetch(winner)

                    message.components[0].components[0].data.disabled = true

                    await message.edit({ components: [new ActionRowBuilder().addComponents(message.components[0].components[0]).addComponents(message.components[0].components[1])] })
                    
                    if (winners.length == 0) {
                        await message.reply({ content: '抽獎已結束，無人中獎' })
                    } else {
                        winners = winners.map(winner => `- <@${winner}> \n`)

                        await message.reply({ content: `抽獎已結束，獲獎者為 \n${winners.join(', ')} 獎品已自動新增至您的錢包中，私訊 ${bot.username} 領錢 即可領取` })

                        const { add_player_wallet_dc, get_player_wallet_discord } = require('./utils/database.js')

                        for (let winner of winners) {
                            await add_player_wallet_dc(winner, Number(prize))
                            await new Promise(resolve => setTimeout(resolve, 1000))
                            wallet = await get_player_wallet_discord(winner)

                            switch (wallet) {
                                case 'error':
                                    await channel.send('新增錢至錢包時發生錯誤')
                                    break
                                case 'Not Found':
                                    await channel.send(`該玩家無綁定資料`)
                                    break
                                default:
                                    const dm = await user.createDM()
    
                                    try {
                                        await channel.send(`已成功新增玩家 <@${winner}> 的錢，如未收到，請聯絡管理員`)

                                        await dm.send(`管理員已新增 ${Number(prize)} 元至您的錢包中，您目前有 ${wallet} 元，在遊戲中私訊我 "領錢" 即可領取。`)

                                    } catch (error) {
                                        await channel.send(`管理員已新增 ${Number(prize)} 元至 <@${winner}> 的錢包中，在遊戲中私訊我 "領錢" 即可領取。`)
                                    }
                            }
                        }
                    }
                }
            }
        }, 700)

        auto_update_role = setInterval(async () => {
            let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
            let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

            let permissions = {}
            let no_permissions = {}
            let final

            for (const role of Object.keys(roles)) {
                if (roles[role].reverse_blacklist == false) {
                    permissions[role] = roles[role]

                } else {
                    no_permissions[role] = roles[role]
                }
            }

            let permissions_sorted = Object.fromEntries(Object.entries(permissions).sort((a, b) => b[1].daily - a[1].daily))
            let no_permissions_sorted = Object.fromEntries(Object.entries(no_permissions).sort((a, b) => b[1].daily - a[1].daily))
                
            final = Object.assign(permissions_sorted, no_permissions_sorted)

            fs.writeFileSync(`${process.cwd()}/config/roles.json`, JSON.stringify(final, null, 4));
            roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

            for (const role of Object.keys(roles)) {
                const guild = await client.guilds.cache.get(config.discord.guild_id);

                if (roles[role].discord_id == '' || !roles[role].discord_id) continue

                const role_name = guild.roles.cache.get(roles[role].discord_id).name

                if (roles[role].name != role_name) {
                    roles[role].name = role_name
                }
            }

            fs.writeFileSync(`${process.cwd()}/config/roles.json`, JSON.stringify(roles, null, 4));

            let link_role_name = await client.guilds.cache.get(config.discord.guild_id).roles.cache.get(config.roles.link_role_dc).name

            if (link_role_name != config.roles.link_role) {
                config.roles.link_role = link_role_name
                fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
            }

            let user_data = await get_all_user_data()

            for (const player of user_data) {
                //get user via discord_id
                const member = await client.guilds.cache.get(config.discord.guild_id).members.fetch(player.discord_id).then(member => {
                    return member
                }).catch(err => {
                    return 'Not Found'
                });

                if (member == 'Not Found') {
                    await set_user_role(player.discord_id, 'none')
                    await remove_user_discord_id(player.discord_id)
                    continue
                }

                if (player.roles == 'none') await remove_user_discord_id(player.discord_id)
            }

            if (client) {
                const guild = await client.guilds.cache.get(config.discord.guild_id);
                //get members from a guild
                const members = await guild.members.fetch().then(member => {
                    return member
                }).catch(err => {
                    console.log(err)
                    return []
                });

                const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

                for (const member of members) {
                    const player_data = (await get_user_data_from_dc(member[1].user.id))[0]
                    if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) continue
                    const player_role = orderStrings(player_data.roles, roles)
                    
                    if (!player_data.discord_id || player_role.includes('none') || player_role == '') continue

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
        }, 30000)

        client.on('error', async (error) => {
            console.log(error.stack)
        })

        client.login(config.discord.bot_token)

    } catch (e) {
        console.log(e.stack)
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