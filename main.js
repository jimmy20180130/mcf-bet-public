const mineflayer = require('mineflayer');
const fs = require('fs');
const toml = require('toml');
let configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
let config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
const { add_bet_task, add_client, add_bot, process_bet_task } = require(`./bet/bet.js`);
const { chat } = require(`./utils/chat.js`);
const { get_player_uuid, get_player_name, clear_interval } = require(`./utils/get_player_info.js`);
const { start_rl, stop_rl } = require(`./utils/readline.js`);
const { process_msg } = require(`./utils/process_msg.js`);
const { mc_error_handler } = require(`./error/mc_handler.js`)
const { start_msg, stop_msg } = require(`./utils/chat.js`);
const { add_msg, discord_console, clear_last_msg, discord_console_2 } = require(`./discord/log.js`);
const { Client, GatewayIntentBits, Collection, Events, Partials, REST, Routes } = require('discord.js');
const { check_codes } = require(`./utils/link_handler.js`);
const { command_records, dc_command_records } = require(`./discord/command_record.js`);
const { bot_on, bot_off, bot_kicked } = require(`./discord/embed.js`);
const { get_user_data, get_all_players } = require(`./utils/database.js`);
const { canUseCommand } = require(`./utils/permissions.js`);
const { check_token } = require(`./auth/auth.js`);
const moment = require('moment-timezone');
const { initDB, closeDB } = require(`./utils/db_write.js`);
const path = require('path');
const Logger = require(`./utils/logger.js`);
const { pay_handler } = require('./utils/pay_handler.js');

initDB()

const botArgs = {
    host: configtoml.minecraft.serverip,
    port: 25565,
    username: configtoml.minecraft.username,
    auth: 'microsoft',
    version: '1.20.1',
    checkTimeoutInterval:360000
};

let is_on_timeout;
let intervals = [];
let auto_check_ad;
let cooldown = {};
let bot;
let client;
let is_on = false;

const init_bot = async () => {
    Logger.log('正在讓 Minecraft 機器人上線...')
    const donate_list = [];
    bot = mineflayer.createBot(botArgs);

    bot.on('message', async function (jsonMsg) {
        const textMessage = jsonMsg.toString()
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
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
                if (/^.* (has made the advancement|has completed the challenge|has reached the goal)/.test(textMessage)) return true;
                if (/players sleeping$/.test(textMessage)) return true;
                if (/目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)/g.test(textMessage)) return true;
                if (/^\[\?\]/.test(textMessage)) return true;
                if (/^\=\=/.test(textMessage)) return true;
                if (/^ >/.test(textMessage)) return true;
                if (/\[~\]/.test(textMessage)) return true;
                if (/^┌─回覆自/.test(textMessage)) return true;
            }

            return false;
        };

        if (shouldSkipMessage(textMessage)) return
        
        Logger.log(jsonMsg.toAnsi())
        add_msg(jsonMsg.json)
    });

    bot.on('chat:payment', async (matches) => {
        matches = matches[0];
        const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
        const ematch = e_regex.exec(matches);
        const playerid = ematch[1];
        const amountStr = ematch[2];
        const amount = parseInt(amountStr.split(',').join(''));
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf-8'));
        if (donate_list.includes(playerid) || playerid === bot.username) return;

        if (amount > configtoml.bet.emax || amount < configtoml.bet.emin) {
            await chat(bot, `/m ${playerid} ${messages.errors.bet.e_over_limit.replaceAll('%emin%', configtoml.bet.emin).replaceAll('%emax%', configtoml.bet.emax)}`);
            await pay_handler(bot, playerid, amount, 'emerald', client);
            return;
        }

        if (!is_on) {
            let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
            cache.bet.push({ "player_id": playerid, "amount": amount, "type": 'emerald', "added": false });
            fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4));
            return;
        }

        await add_bet_task(bot, playerid, amount, 'emerald');
    });

    bot.on('chat:payment_coin', async (matches) => {
        matches = matches[0];
        const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/
        const cmatch = c_regex.exec(matches);
        const playerid = cmatch[1];
        const amountStr = cmatch[2];
        const amount = parseInt(amountStr.split(',').join(''));
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf-8'));

        if (donate_list.includes(playerid) || playerid === bot.username) return;

        if (amount > configtoml.bet.cmax || amount < configtoml.bet.cmin) {
            await chat(bot, `/m ${playerid} ${messages.errors.bet.c_over_limit.replaceAll('%cmin%', configtoml.bet.cmin).replaceAll('%cmax%', configtoml.bet.cmax)}`);
            await pay_handler(bot, playerid, amount, 'coin', client);
            return;
        }

        if (!is_on) {
            let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));
            cache.bet.push({ "player_id": playerid, "amount": amount, "type": 'coin', "added": false });
            fs.writeFileSync(`${process.cwd()}/cache/cache.json`, JSON.stringify(cache, null, 4));
            return;
        }

        await add_bet_task(bot, playerid, amount, 'coin');
    });

    bot.on('chat:teleport_request', async (matches) => {
        matches = matches[0];
        const teleportRegex = /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置|^\[系統\] (\w+) 想要傳送到 你 的位置/;
        const match = teleportRegex.exec(matches);
        const playerid = match[1];
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));

        if (configtoml.minecraft.whitelist.includes(playerid) || configtoml.minecraft.whitelist.includes(playerid.toLowerCase())) {
            await chat(bot, '/tok');
        } else {
            await chat(bot, '/tno');
        }
    });

    bot.on('chat:donate', async (messagestr) => {
        messagestr = messagestr[0];
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf-8'));
        const match = /^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(messagestr);
        const args = messagestr.slice(8 + match[1].length);
        let playerid = match[1];
        await command_records(client, playerid, args)
        if (playerid === bot.username) return;
        if (donate_list.includes(playerid)) {
            donate_list.shift()
            await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_cancel}`)
            return
        }

        donate_list.push(playerid)
        await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.donate.start_donate, playerid)}`)

        const pay_msg_Promise = bot.awaitMessage(/^\[系統\] 您收到了/)
        const timeout_Promise = new Promise((resolve) => {
            setTimeout(() => {
                resolve('timeout');
            }, 20000);
        });

        await Promise.race([pay_msg_Promise, timeout_Promise]).then(async string => {
            pay_msg_Promise.cancel()
            if (string == 'timeout' && donate_list.includes(playerid)) {
                await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_timeout}`)
                donate_list.shift()
                return

            } else {
                const e_regex = /\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/;
                const c_regex = /\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/
                const ematch = e_regex.exec(string);
                const cmatch = c_regex.exec(string);

                if (ematch) {
                    let donator = ematch[1];
                    if (donate_list.includes(donator)) {
                        let amount = parseInt(ematch[2].split(',').join(''))
                        if (donator === bot.username) {return};
                        await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_e_success.replaceAll('%amount%', amount)}`)
                        donate_list.shift()
                    }

                } else if (cmatch) {
                    let donator = cmatch[1];
                    if (donate_list.includes(donator)) {
                        let amount = parseInt(cmatch[2].split(',').join(''))
                        if (donator === bot.username) {return};
                        await chat(bot, `/m ${playerid} ${messages.commands.donate.donate_c_success.replaceAll('%amount%', amount)}`)
                        donate_list.shift()
                    }
                }
            }
        })
    })

    bot.on('chat:debug', async (messagestr) => {
        messagestr = messagestr[0];
        const match = /^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(messagestr);
        const args = messagestr.slice(8 + match[1].length);
        let playerid = match[1];
        if (playerid === bot.username || playerid != 'XiaoXi_YT') return;
        require(`./commands/jimmy.js`).execute(bot, playerid, args, client);
    })

    bot.on('chat:stop', async (messagestr) => {
        messagestr = messagestr[0];
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf-8'));
        const match = /^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(messagestr);
        const args = messagestr.slice(8 + match[1].length);
        let playerid = match[1];
        await command_records(client, playerid, args)
        if (playerid === bot.username) return;
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.stop['default'], playerid)}`)
            await new Promise(r => setTimeout(r, 5000))
            process.exit(135)
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    })

    bot.on('chat:reload', async (messagestr) => {
        messagestr = messagestr[0];
        const messages = JSON.parse(fs.readFileSync(`${process.cwd()}/data/messages.json`, 'utf-8'));
        const match = /^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(messagestr);
        const args = messagestr.slice(8 + match[1].length);
        let playerid = match[1];
        await command_records(client, playerid, args)
        if (playerid === bot.username) return;
        if (await canUseCommand(await get_player_uuid(playerid), args.split(' ')[0])) {
            await chat(bot, `/m ${playerid} ${await process_msg(bot, messages.commands.reload['default'], playerid)}`)
            await new Promise(r => setTimeout(r, 5000))
            process.exit(246)
        } else {
            await mc_error_handler(bot, 'general', 'no_permission', playerid)
        }
    })

    bot.on('chat:command', async (messagestr) => {
        messagestr = messagestr[0];
        const match = /^\[([A-Za-z0-9_]+) -> 您\] .*/.exec(messagestr);
        const args = messagestr.slice(8 + match[1].length);
        let playerid = match[1];
        await command_records(client, playerid, args)
        if (playerid === bot.username) return;
        // if includes stop, reload, donate, debug, and aliasis of them then skip
        if (['stop', 'reload', 'donate', 'jimmy'].some(item => require(`./commands/${item}.js`)?.aliases?.includes(args.split(' ')[0]))) return 
        if (['stop', 'reload', 'donate', 'debug'].includes(args.split(' ')[0])) return
        if (!cooldown[playerid]) {
            cooldown[playerid] = []
        }
        if (cooldown[playerid].some(item => item.command == args.split(' ')[0] && item.time > Date.now())) {
            return
        } else {
            // remove all cooldowns that are expired
            cooldown[playerid] = cooldown[playerid].filter(item => item.time > Date.now())

            cooldown[playerid].push({"command": args.split(' ')[0], "time": Date.now() + 2000})
            // find the command the alias is for 
            for (let item of Object.keys(JSON.parse(fs.readFileSync(`${process.cwd()}/data/commands.json`)))) {
                if (require(`./commands/${item}.js`).aliases.includes(args.split(' ')[0]) || require(`./commands/${item}.js`).name == args.split(' ')[0]) {
                    await require(`./commands/${item}.js`).execute(bot, playerid, args, client);
                    return
                }
            }
        }
    })
    
    bot.once('spawn', async () => {
        Logger.log('Minecraft 機器人已上線!');

        bot.addChatPatternSet('donate', [
            // [XiaoXi_YT -> 您] donate
            new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] ${require('./commands/donate.js').name}`),
            ...require(`./commands/donate.js`).aliases.map(alias => new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] ${alias}`))
        ]);

        bot.addChatPattern('debug', new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] debug.*`)) // [XiaoXi_YT -> 您] debug <args>
        bot.addChatPatternSet('stop', [
            // [XiaoXi_YT -> 您] stop
            new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] ${require(`./commands/stop.js`).name}`),
            ...require(`./commands/stop.js`).aliases.map(alias => new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] ${alias}`))
        ]);
        bot.addChatPatternSet('reload', [
            // [XiaoXi_YT -> 您] reload
            new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] ${require(`./commands/reload.js`).name}`),
            ...require(`./commands/reload.js`).aliases.map(alias => new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] ${alias}`))
        ]);

        bot.addChatPattern('command', new RegExp(`^\\[([A-Za-z0-9_]+) -> 您\\] .+`)) // [XiaoXi_YT -> 您] <command> <args>
        bot.addChatPattern('payment', /^\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/);
        bot.addChatPattern('payment_coin', /^\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/);
        bot.addChatPattern('teleport_request', /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置|^\[系統\] (\w+) 想要傳送到 你 的位置/);
        
        if (configtoml.discord.enabled) {
            Logger.debug('Discord 機器人已啟用')
            init_dc()
        } else {
            Logger.debug('Discord 機器人未啟用')
        }

        //wait until dc bot is ready
        await new Promise(resolve => client.once('ready', resolve));

        let cache = JSON.parse(fs.readFileSync(`${process.cwd()}/cache/cache.json`, 'utf8'));

        for (let item of cache.bet) {
            item.added = false
        }

        let botSocket = bot._client.socket;
        let time = moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
        const roundedX = Math.round(bot.entity.position.x);
        const roundedY = Math.round(bot.entity.position.y);
        const roundedZ = Math.round(bot.entity.position.z);
        const string = `【登入時間】${time}\n【連線位址】${botSocket.server ? botSocket.server : botSocket._host}\n【玩家名稱】${bot.username}\n【我的座標】(${roundedX}, ${roundedY}, ${roundedZ})`
        if (configtoml.discord_channels.status && client) {
            const embed = await bot_on(string)
            const channel = await client.channels.fetch(configtoml.discord_channels.status);
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

        await chat(bot, `[${moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')}] Jimmy Bot 已上線 (${config.version})`)

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
        }, 1000);

        ad();
    });

    const ad = async () => {
        intervals.forEach(clearInterval);
        intervals = [];
        let ads = [];
    
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
    
        config.advertisement.forEach(item => {
            const intervalId = setInterval(async () => {
                try {
                    await chat(bot, item.text);
                    Logger.debug(`發送廣告: ${item.text}`);
                } catch (e) {
                    Logger.error(`廣告發送錯誤: ${e.message}`);
                }
            }, item.interval);
            intervals.push(intervalId);
            ads.push(item);
        });
    
        // 設定配置檢查定時器（如果尚未設定）
        if (!auto_check_ad) {
            auto_check_ad = setInterval(async () => {
                const newConfig = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
                if (JSON.stringify(newConfig.advertisement) !== JSON.stringify(ads)) {
                    Logger.debug('偵測到廣告配置更新，重新載入中...');
                    await ad();
                }
            }, 5000);
        }
    };

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
            const channel = await client.channels.fetch(configtoml.discord_channels.status);
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
            const channel = await client.channels.fetch(configtoml.discord_channels.status);
            await channel.send({ embeds: [embed] });
            is_on = false;
        }
        await new Promise(r => setTimeout(r, 5000))
        process.exit(246)
    });
}

async function init_dc() {
    try {
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));

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
        const rest = new REST().setToken(configtoml.discord.bot_token);

        // and deploy your commands!
        (async () => {
            try {
                Logger.log(`Discord 機器人正在載入 ${dc_commands.length} 個斜線指令`);

                // The put method is used to fully refresh all commands in the guild with the current set
                const data = await rest.put(
                    Routes.applicationCommands(configtoml.discord.bot_client_id),
                    { body: dc_commands },
                );

                Logger.log(`Discord 機器人成功載入 ${data.length} 個斜線指令`);
            } catch (error) {
                Logger.error(error);
            }
        })();

        client.once(Events.ClientReady, async c => {
            Logger.log(`Discord 機器人成功以 ${c.user.tag} 的名稱登入`)
            const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));

            if (config.console.mode == 1) {
                discord_console(client)
            } else {
                discord_console_2(client)
            }
        })

        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (message.channel.type === 0) {
                let configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
                if (message.channel.id !== configtoml.discord_channels.console) return;
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

        //auto complete
        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isAutocomplete()) return

            switch (interaction.commandName) {
                case 'record':
                    await interaction.client.commands.get(interaction.commandName).autocomplete(interaction);
                    break

                case '設定':
                    await interaction.client.commands.get(interaction.commandName).autocomplete(interaction);
                    break
            }
        }) 

        client.on('error', async (error) => {
            Logger.error(error.stack)
        })

        client.login(configtoml.discord.bot_token)

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