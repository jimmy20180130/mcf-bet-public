const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/User');
const { readConfig, writeConfig } = require('../../../services/configService');
const { tForInteraction } = require('../../../utils/i18n');
const { getBotKeyFromConfigBot, normalizeBotKey } = require('../../../utils/botKey');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setNameLocalizations({
            'zh-TW': '設定'
        })
        .setDescription('Bot settings')
        .setDescriptionLocalizations({
            'zh-TW': 'Bot 設定'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('bet')
                .setNameLocalizations({
                    'zh-TW': '下注'
                })
                .setDescription('Bet settings')
                .setDescriptionLocalizations({
                    'zh-TW': '下注設定'
                })
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('emax')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石最大下注金額'
                        })
                        .setDescription('Maximum emerald bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '綠寶石最大下注金額'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('emin')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石最小下注金額'
                        })
                        .setDescription('Minimum emerald bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '綠寶石最小下注金額'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('cmax')
                        .setNameLocalizations({
                            'zh-TW': '村民錠最大下注金額'
                        })
                        .setDescription('Maximum coin bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '村民錠最大下注金額'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('cmin')
                        .setNameLocalizations({
                            'zh-TW': '村民錠最小下注金額'
                        })
                        .setDescription('Minimum coin bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '村民錠最小下注金額'
                        })
                )
                .addNumberOption(option =>
                    option.setName('eodds')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石賠率'
                        })
                        .setDescription('Odds for the emerald bet (Decimal, default 1.85)')
                        .setDescriptionLocalizations({
                            'zh-TW': '綠寶石下注賠率 (小數，預設 1.85)'
                        })
                )
                .addNumberOption(option =>
                    option.setName('codds')
                        .setNameLocalizations({
                            'zh-TW': '村民錠賠率'
                        })
                        .setDescription('Odds for the coin bet (Decimal, default 1.85)')
                        .setDescriptionLocalizations({
                            'zh-TW': '村民錠下注賠率 (小數，預設 1.85)'
                        })
                )

        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setNameLocalizations({
                    'zh-TW': '白名單'
                })
                .setDescription('Whitelist settings')
                .setDescriptionLocalizations({
                    'zh-TW': '白名單設定'
                })
                .addStringOption(option =>
                    option.setName('action')
                        .setNameLocalizations({
                            'zh-TW': '動作'
                        })
                        .setDescription('Action to perform')
                        .setDescriptionLocalizations({
                            'zh-TW': '要執行的動作'
                        })
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'remove', value: 'remove' },
                            { name: 'list', value: 'show' },
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage (default global settings)')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人 (預設為全域設定s)'
                        })
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家名稱'
                        })
                        .setDescription('Player name to add/remove from whitelist (not needed for list action)')
                        .setDescriptionLocalizations({
                            'zh-TW': '要加入/移除白名單的玩家名稱 (列出白名單時不需要)'
                        })
                        .setAutocomplete(true)

                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setNameLocalizations({
                    'zh-TW': '頻道'
                })
                .setDescription('Channel settings')
                .setDescriptionLocalizations({
                    'zh-TW': '頻道設定'
                })
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addChannelOption(option =>
                    option.setName('bet')
                        .setNameLocalizations({
                            'zh-TW': '下注紀錄'
                        })
                        .setDescription('Channel for bet records')
                        .setDescriptionLocalizations({
                            'zh-TW': '下注紀錄頻道'
                        })
                )
                .addChannelOption(option =>
                    option.setName('console')
                        .setNameLocalizations({
                            'zh-TW': '控制台'
                        })
                        .setDescription('Channel for console messages')
                        .setDescriptionLocalizations({
                            'zh-TW': '控制台頻道'
                        })
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('advertisement')
                .setNameLocalizations({
                    'zh-TW': '自動發話'
                })
                .setDescription('Auto message settings')
                .setDescriptionLocalizations({
                    'zh-TW': '自動發話設定'
                })
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName('action')
                        .setNameLocalizations({
                            'zh-TW': '動作'
                        })
                        .setDescription('Action to perform')
                        .setDescriptionLocalizations({
                            'zh-TW': '要執行的動作'
                        })
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'edit', value: 'edit' },
                            { name: 'view', value: 'view' },
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('index')
                        .setNameLocalizations({
                            'zh-TW': '編號'
                        })
                        .setDescription('Message index (1-based) for edit/view')
                        .setDescriptionLocalizations({
                            'zh-TW': '要編輯/查看的訊息編號 (從 1 開始)'
                        })
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setNameLocalizations({
                            'zh-TW': '訊息'
                        })
                        .setDescription('Message content for add/edit')
                        .setDescriptionLocalizations({
                            'zh-TW': '新增/編輯的訊息內容'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('wait')
                        .setNameLocalizations({
                            'zh-TW': '等待秒數'
                        })
                        .setDescription('Delay seconds after this message (>= 1)')
                        .setDescriptionLocalizations({
                            'zh-TW': '此訊息發送後等待秒數 (>= 1)'
                        })
                        .setMinValue(1)
                )
        )
    ,

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const focusedValue = focusedOption.value;

        if (focusedOption.name === 'player') {
            const choices = User.searchPlayers(focusedValue);
            await interaction.respond(
                choices.map(choice => ({ name: choice.playerid, value: choice.playerid }))
            );
        } else if (focusedOption.name === 'bot') {
            const config = readConfig();

            const choices = await Promise.all(config.bots.map(async bot => ({
                botid: bot.username,
                botkey: getBotKeyFromConfigBot(bot)
            }))).then(results => results.filter(bot => bot.botid.includes(focusedValue)));

            await interaction.respond(
                choices.map(choice => ({
                    name: choice.botid,
                    value: choice.botkey
                }))
            );
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'bet':
                const bot = interaction.options.getString('bot');
                const emax = interaction.options.getInteger('emax');
                const emin = interaction.options.getInteger('emin');
                const cmax = interaction.options.getInteger('cmax');
                const cmin = interaction.options.getInteger('cmin');
                const eodds = interaction.options.getNumber('eodds');
                const codds = interaction.options.getNumber('codds');
                await betSettings(interaction, bot, emax, emin, cmax, cmin, eodds, codds);
                break;

            case 'channel':
                const channelBot = interaction.options.getString('bot');
                const betChannel = interaction.options.getChannel('bet');
                const consoleChannel = interaction.options.getChannel('console');
                await channelSettings(interaction, channelBot, betChannel ? betChannel.id : null, consoleChannel ? consoleChannel.id : null);
                break;

            case 'whitelist':
                const action = interaction.options.getString('action');
                const playerName = interaction.options.getString('player');
                const whitelistBot = interaction.options.getString('bot') || null;
                await whitelistSettings(interaction, action, playerName, whitelistBot);
                break;

            case 'advertisement':
                const autoBot = interaction.options.getString('bot');
                const autoAction = interaction.options.getString('action');
                const autoIndex = interaction.options.getInteger('index');
                const autoMessage = interaction.options.getString('message');
                const autoWait = interaction.options.getInteger('wait');
                await autoMessageSettings(interaction, autoBot, autoAction, autoIndex, autoMessage, autoWait);
                break;

        }
    },
};

function getBot(config, botIdentifier) {
    const normalizedIdentifier = normalizeBotKey(botIdentifier);
    const bot = config.bots.find(b =>
        getBotKeyFromConfigBot(b) === normalizedIdentifier
        || normalizeBotKey(b.username) === normalizedIdentifier
        || b.key === botIdentifier
    );
    return bot || config.bots[0];
}

function ensureAutoMessages(targetBot) {
    if (!Array.isArray(targetBot.autoMessages)) {
        targetBot.autoMessages = [];
    }
    return targetBot.autoMessages;
}

function formatAutoMessageList(messages) {
    return messages
        .map((entry, idx) => `${idx + 1}. [${Number(entry.waitSeconds)}s] ${entry.message}`)
        .join('\n');
}

async function betSettings(interaction, bot, emax, emin, cmax, cmin, eodds, codds) {
    try {
        const config = readConfig();
        const targetBot = getBot(config, bot);

        if (emax !== null) targetBot.emax = Number(emax);
        if (emin !== null) targetBot.emin = Number(emin);
        if (cmax !== null) targetBot.cmax = Number(cmax);
        if (cmin !== null) targetBot.cmin = Number(cmin);
        if (eodds !== null) targetBot.eodds = Number(eodds);
        if (codds !== null) targetBot.codds = Number(codds);

        writeConfig(config);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.betUpdated') });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.betUpdateFailed') });
    }
}

async function channelSettings(interaction, bot, betChannel, consoleChannel) {
    try {
        const config = readConfig();
        const targetBot = getBot(config, bot);

        if (betChannel !== null) targetBot.betRecordChannelID = String(betChannel);
        if (consoleChannel !== null) targetBot.consoleChannelID = String(consoleChannel);

        writeConfig(config);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.channelUpdated') });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.channelUpdateFailed') });
    }
}

async function whitelistSettings(interaction, action, playerName, bot) {
    try {
        const config = readConfig();
        const targetBot = getBot(config, bot);

        if (!targetBot.whitelist) targetBot.whitelist = [];
        const globalWhitelist = config.general?.whitelist || [];

        switch (action) {
            case 'add':
                if (!playerName) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.whitelistNeedAddPlayer') });
                    return;
                }
                if (targetBot.whitelist.includes(playerName) || globalWhitelist.includes(playerName)) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistAlreadyExists', { playerName })
                    });
                    return;
                }
                targetBot.whitelist.push(playerName);
                writeConfig(config);
                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.whitelistAdded', { playerName })
                });
                break;

            case 'remove':
                if (!playerName) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.whitelistNeedRemovePlayer') });
                    return;
                }
                if (!targetBot.whitelist.includes(playerName)) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistNotExists', { playerName })
                    });
                    return;
                }
                targetBot.whitelist = targetBot.whitelist.filter(name => name !== playerName);
                writeConfig(config);
                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.whitelistRemoved', { playerName })
                });
                break;

            case 'show':
                if (bot) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistBotList', {
                            botName: targetBot.username,
                            list: targetBot.whitelist ? targetBot.whitelist.join(', ') : tForInteraction(interaction, 'common.none')
                        })
                    });
                } else {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistGlobalList', {
                            list: globalWhitelist.length > 0 ? globalWhitelist.join(', ') : tForInteraction(interaction, 'common.none')
                        })
                    });
                }

                break;
        }
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.whitelistUpdateFailed') });
    }
}

async function autoMessageSettings(interaction, bot, action, index, message, waitSeconds) {
    try {
        const config = readConfig();
        const targetBot = getBot(config, bot);
        const autoMessages = ensureAutoMessages(targetBot);

        switch (action) {
            case 'add': {
                if (!message || waitSeconds === null) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.autoMessageNeedAddFields') });
                    return;
                }

                autoMessages.push({
                    message: String(message),
                    waitSeconds: Number(waitSeconds)
                });
                writeConfig(config);
                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.autoMessageAdded', {
                        index: autoMessages.length,
                        waitSeconds,
                        message
                    })
                });
                break;
            }

            case 'edit': {
                if (index === null) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.autoMessageNeedEditIndex') });
                    return;
                }
                if (message === null && waitSeconds === null) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.autoMessageNeedEditFields') });
                    return;
                }

                const targetIndex = index - 1;
                if (targetIndex < 0 || targetIndex >= autoMessages.length) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.autoMessageIndexNotFound', { index })
                    });
                    return;
                }

                if (message !== null) {
                    autoMessages[targetIndex].message = String(message);
                }
                if (waitSeconds !== null) {
                    autoMessages[targetIndex].waitSeconds = Number(waitSeconds);
                }

                writeConfig(config);
                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.autoMessageEdited', {
                        index,
                        waitSeconds: autoMessages[targetIndex].waitSeconds,
                        message: autoMessages[targetIndex].message
                    })
                });
                break;
            }

            case 'view': {
                if (autoMessages.length === 0) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.autoMessageEmpty') });
                    return;
                }

                if (index !== null) {
                    const targetIndex = index - 1;
                    const entry = autoMessages[targetIndex];
                    if (!entry) {
                        await interaction.editReply({
                            content: tForInteraction(interaction, 'dc.settings.autoMessageIndexNotFound', { index })
                        });
                        return;
                    }

                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.autoMessageSingle', {
                            index,
                            waitSeconds: Number(entry.waitSeconds),
                            message: entry.message
                        })
                    });
                    return;
                }

                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.autoMessageList', {
                        list: formatAutoMessageList(autoMessages)
                    })
                });
                break;
            }

            default:
                await interaction.editReply({ content: tForInteraction(interaction, 'common.unknownError') });
                break;
        }
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.autoMessageUpdateFailed') });
    }
}