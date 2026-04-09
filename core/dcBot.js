const { Client, Collection, Events, GatewayIntentBits, REST, Routes, EmbedBuilder, MessageFlags } = require('discord.js');
const Logger = require('../utils/logger');
const { readConfig } = require('../services/configService');
const RoleSyncService = require('../services/roleSyncService');
const { t } = require('../utils/i18n');
const {
    slashEntries,
    interactionEntries,
    clearModuleCache,
} = require('../commands/discord/manifest');

class DcBot {
    constructor() {
        this.logger = new Logger('Discord');
        this.commands = new Collection();
        this.interactions = new Collection();
        this.consoleMessageHandler = null;

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.roleSyncService = new RoleSyncService(this.client, this.logger);
    }

    setConsoleRelayHandler(handler) {
        this.consoleMessageHandler = typeof handler === 'function' ? handler : null;
    }

    _loadConfig() {
        try {
            return readConfig();
        } catch (error) {
            this.logger.warn('無法讀取設定檔:', error);
            throw error;
        }
    }

    async start() {
        try {
            await this._loadSlashCommands();
            await this._loadInteractions();

            this._setupEvents();
            const botConfig = this._loadConfig().discord;
            if (!botConfig || !botConfig.discordBotToken) {
                throw new Error('找不到 Discord Bot Token');
            }

            await this.client.login(botConfig.discordBotToken);

            if (botConfig.discordApplicationID) {
                await this._registerCommands(botConfig.discordBotToken, botConfig.discordApplicationID);
            } else {
                throw new Error('找不到 Discord Application ID');
            }

        } catch (error) {
            this.logger.error('Discord Bot 啟動失敗:', error);
        }
    }

    async _loadSlashCommands() {
        for (const { file, load } of slashEntries) {
            try {
                clearModuleCache(`./slash/${file}`);
                const command = load();

                if ('data' in command && 'execute' in command) {
                    this.commands.set(command.data.name, command);
                    this.logger.debug(`已載入指令: ${command.data.name}`);
                } else {
                    this.logger.warn(`${file} 缺少必要的 "data" 或 "execute" 屬性`);
                }
            } catch (error) {
                this.logger.warn(`載入 ${file} 時發生錯誤:`, error);
            }
        }
    }

    async _loadInteractions() {
        for (const { file, load } of interactionEntries) {
            try {
                clearModuleCache(`./interactions/${file}`);
                const interaction = load();

                if ('name' in interaction && 'execute' in interaction) {
                    this.interactions.set(interaction.name, interaction);
                    this.logger.debug(`已載入 interactions command: ${interaction.name}`);
                } else {
                    this.logger.warn(`${file} 缺少必要的 "name" 或 "execute" 屬性`);
                }
            } catch (error) {
                this.logger.warn(`載入 ${file} 時發生錯誤:`, error);
            }
        }
    }

    async _registerCommands(token, applicationId) {
        const commands = [];
        this.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });
        this.interactions.forEach(interaction => {
            if (interaction.data) {
                commands.push(interaction.data.toJSON());
            }
        });

        const rest = new REST().setToken(token);

        try {
            this.logger.info(`開始重新整理 ${commands.length} 個應用程式 (/) 指令。`);

            const data = await rest.put(
                Routes.applicationCommands(applicationId),
                { body: commands },
            );

            this.logger.info(`成功重新載入 ${data.length} 個應用程式 (/) 指令。`);
        } catch (error) {
            this.logger.warn('註冊指令時發生錯誤:', error);
        }
    }

    _setupEvents() {
        this.client.once(Events.ClientReady, async c => {
            this.logger.info(`已登入為 ${c.user.tag}`);
            await this.roleSyncService.fullScanAllGuilds();
        });

        this.client.on(Events.InteractionCreate, async interaction => {
            await this._handleInteraction(interaction);
        });

        this.client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            await this.roleSyncService.handleGuildMemberUpdate(oldMember, newMember);
        });

        this.client.on(Events.MessageCreate, async message => {
            await this._handleConsoleMessageRelay(message);
        });
    }

    async _handleConsoleMessageRelay(message) {
        if (!message || message.author?.bot || !message.channelId) {
            return;
        }

        const content = message.content?.trim();
        if (!content) {
            return;
        }

        const config = this._loadConfig();
        const botConfigs = Array.isArray(config?.bots) ? config.bots : [];
        const authorName = message.member?.displayName || message.author?.username || 'DiscordUser';

        botConfigs.forEach((botConfig, index) => {
            if (String(botConfig?.consoleChannelID || '') !== message.channelId) {
                return;
            }

            try {
                this.consoleMessageHandler?.(index, content, authorName);
            } catch (error) {
                this.logger.warn(`轉發 Discord 訊息到 Minecraft 失敗 (bot #${index + 1}):`, error);
            }
        });
    }

    async _handleInteraction(interaction) {
        if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            const command = interaction.isContextMenuCommand()
                ? (this.interactions.get(interaction.commandName) || this.commands.get(interaction.commandName))
                : (this.commands.get(interaction.commandName) || this.interactions.get(interaction.commandName));

            if (!command) {
                this.logger.warn(`找不到指令 ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                this.logger.warn(`執行指令時發生錯誤:`, error);
                const content = t('core.dcBot.commandExecuteError');
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content, ephemeral: true });
                } else {
                    await interaction.reply({ content, ephemeral: true });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = this.commands.get(interaction.commandName);

            if (!command) {
                this.logger.warn(`autocomplete command not found: ${interaction.commandName}`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                this.logger.error(`autocomplete error:`, error);
            }
        } else if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu() || interaction.isMentionableSelectMenu()) {
            const customId = interaction.customId;
            let handler = this.interactions.get(customId);

            if (!handler) {
                // "record_123" => prefix = "record"
                const prefix = customId.split('_')[0];
                handler = this.interactions.get(prefix);
            }

            if (!handler) {
                return;
            }

            try {
                await handler.execute(interaction);
            } catch (error) {
                this.logger.warn(`執行互動處理時發生錯誤:`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: t('core.dcBot.interactionHandleError'), ephemeral: true });
                }
            }
        }
    }

    async sendBetRecordEmbed(channelId, playerid, currency, amount, returnAmount, odds, bonusOdds, isWin, bot) {
        const currencyIcon = currency === 'emerald' ? '💵' : '💴';
        currency = currency == 'emerald' ? '綠寶石' : '村民錠';

        const addCommas = (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        odds = (odds+bonusOdds).toFixed(2);

        const winEmbed = new EmbedBuilder()
            .setTitle(t('core.dcBot.betWinTitle', { currencyIcon, playerId: playerid }))
            .setDescription(t('core.dcBot.betWinDescription', {
                currency,
                amount: addCommas(amount),
                returnAmount: addCommas(returnAmount),
                odds
            }))
            .setColor("#00ff1e")
            .setFooter({
                text: t('core.dcBot.betEmbedFooter'),
                iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024",
            })
            .setTimestamp();

        const loseEmbed = new EmbedBuilder()
            .setTitle(t('core.dcBot.betLoseTitle', { currencyIcon, playerId: playerid }))
            .setDescription(t('core.dcBot.betLoseDescription', {
                currency,
                amount: addCommas(amount),
                odds
            }))
            .setColor("#ff0000")
            .setFooter({
                text: t('core.dcBot.betEmbedFooter'),
                iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024",
            })
            .setTimestamp();

        const channel = await this.client.channels.fetch(channelId);
        if (!channel) {
            this.logger.warn(`找不到頻道 ID: ${channelId}`);
            return;
        }

        if (isWin) {
            await channel.send({ embeds: [winEmbed] });
        } else {
            await channel.send({ embeds: [loseEmbed] });
        }

    }

    async sendMsg(channelId, message) {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel) {
            this.logger.warn(`找不到頻道 ID: ${channelId}`);
            return;
        }

        const cleanMessage = message.replace(/\u001b\[[0-9;]*m/g, '');
        if (cleanMessage == '' || !cleanMessage) return

        await channel.send({ content: `\`${cleanMessage}\``, flags: MessageFlags.SuppressNotifications });
    }
}

module.exports = DcBot;
