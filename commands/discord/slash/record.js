const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const BetRecord = require('../../../models/BetRecord');
const RecordTemplate = require('../../../models/RecordTemplate');
const User = require('../../../models/User');
const minecraftDataService = require('../../../services/minecraftDataService');
const { readConfig } = require('../../../services/configService');
const { tForInteraction } = require('../../../utils/i18n');

function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString().replace('T', ' ').substring(0, 19);
}

function parseAmountRange(rangeStr) {
    if (!rangeStr) return { min: null, max: null };
    const match = rangeStr.match(/(\d+)<=x<=(\d+)/);
    if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
    return { min: null, max: null };
}

function normalizeTemplateCurrencyFilters(values = {}) {
    return {
        startTime: parseDate(values.startTime || values.laterThan || null),
        endTime: parseDate(values.endTime || values.earlierThan || null),
        minAmount: values.minAmount ?? values.greaterThan ?? null,
        maxAmount: values.maxAmount ?? values.lessThan ?? null
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('record')
        .setNameLocalizations({
            'zh-TW': '下注記錄'
        })
        .setDescription("Query a player's bet records")
        .setDescriptionLocalizations({
            'zh-TW': '查詢指定玩家的下注記錄'
        })
        .addSubcommand(subcommand =>
            subcommand.setName('query')
                .setNameLocalizations({
                    'zh-TW': '查詢'
                })
                .setDescription('Query bet records with various filters')
                .setDescriptionLocalizations({
                    'zh-TW': '使用多種篩選條件查詢下注記錄'
                })

                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人名稱'
                        })
                        .setDescription("Bot name (leave blank for all bots)")
                        .setDescriptionLocalizations({
                            'zh-TW': '機器人名稱，若不填則查詢所有機器人的記錄'
                        })
                        .setRequired(false)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家'
                        })
                        .setDescription("Player name or UUID (leave blank for your own records)")
                        .setDescriptionLocalizations({
                            'zh-TW': '玩家名稱或UUID，若不填則查詢自己的記錄 (需先綁定帳號，且無法與 discord user 選項同時使用)'
                        })
                        .setRequired(false)
                        .setAutocomplete(true)
                )
                .addMentionableOption(option =>
                    option.setName('discorduser')
                        .setNameLocalizations({
                            'zh-TW': 'dc使用者'
                        })
                        .setDescription("Discord user ID (must bind account first; cannot use with 'player')")
                        .setDescriptionLocalizations({
                            'zh-TW': 'Discord 使用者的 ID (需先綁定帳號，且無法與 player 選項同時使用)'
                        })
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option.setName('advanced')
                        .setNameLocalizations({
                            'zh-TW': '進階結果'
                        })
                        .setDescription('[Admins only] Show profit and extra info, default false')
                        .setDescriptionLocalizations({
                            'zh-TW': '[僅管理員可使用] 是否顯示盈虧及其他資訊，預設為否'
                        })
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option.setName('public')
                        .setNameLocalizations({
                            'zh-TW': '公開'
                        })
                        .setDescription('Make result public, default false')
                        .setDescriptionLocalizations({
                            'zh-TW': '是否公開查詢結果，預設為否'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('later_than')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石晚於'
                        })
                        .setDescription('Filter records after this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選晚於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('earlier_than')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石早於'
                        })
                        .setDescription('Filter records before this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選早於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('date_range')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石時間範圍'
                        })
                        .setDescription('Custom date range (yyyy-mm-dd~yyyy-mm-dd or yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)')
                        .setDescriptionLocalizations({
                            'zh-TW': '自訂日期期間 (格式: yyyy-mm-dd~yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)'
                        })
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('greater_than')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石大於等於'
                        })
                        .setDescription('Filter records with amount greater than or equal to value')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選金額大於等於此數值的記錄'
                        })
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('less_than')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石小於等於'
                        })
                        .setDescription('Filter records with amount less than or equal to value')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選金額小於等於此數值的記錄'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('amount_range')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石金額範圍'
                        })
                        .setDescription('Custom amount range (min<=x<=max, e.g. 1<=x<=100)')
                        .setDescriptionLocalizations({
                            'zh-TW': '自訂金額範圍 (格式: 最小值<=x<=最大值，例如: 1<=x<=100)'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('coin_later_than')
                        .setNameLocalizations({
                            'zh-TW': '村民錠晚於'
                        })
                        .setDescription('[Coin] Filter records after this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選晚於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('coin_earlier_than')
                        .setNameLocalizations({
                            'zh-TW': '村民錠早於'
                        })
                        .setDescription('Filter records before this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選早於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('coin_date_range')
                        .setNameLocalizations({
                            'zh-TW': '村民錠時間範圍'
                        })
                        .setDescription('Custom date range (yyyy-mm-dd~yyyy-mm-dd or yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)')
                        .setDescriptionLocalizations({
                            'zh-TW': '自訂日期期間 (格式: yyyy-mm-dd~yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)'
                        })
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('coin_greater_than')
                        .setNameLocalizations({
                            'zh-TW': '村民錠大於等於'
                        })
                        .setDescription('Filter records with amount greater than or equal to value')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選金額大於等於此數值的記錄'
                        })
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('coin_less_than')
                        .setNameLocalizations({
                            'zh-TW': '村民錠小於等於'
                        })
                        .setDescription('Filter records with amount less than or equal to value')
                        .setDescriptionLocalizations({
                            'zh-TW': '篩選金額小於等於此數值的記錄'
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('coin_amount_range')
                        .setNameLocalizations({
                            'zh-TW': '村民錠金額範圍'
                        })
                        .setDescription('Custom amount range (min<=x<=max, e.g. 1<=x<=100)')
                        .setDescriptionLocalizations({
                            'zh-TW': '自訂金額範圍 (格式: 最小值<=x<=最大值，例如: 1<=x<=100)'
                        })
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('template')
                .setNameLocalizations({
                    'zh-TW': '固定條件查詢'
                })
                .setDescription('Query using a saved template')
                .setDescriptionLocalizations({
                    'zh-TW': '使用已事先設定的查詢條件進行查詢'
                })
                .addStringOption(option =>
                    option.setName('template_name')
                        .setNameLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setDescription('Name of the saved template')
                        .setDescriptionLocalizations({
                            'zh-TW': '已儲存模板的名稱'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家'
                        })
                        .setDescription("Player name or UUID (leave blank for your own records)")
                        .setDescriptionLocalizations({
                            'zh-TW': '玩家名稱或UUID，若不填則查詢自己的記錄 (需先綁定帳號，且無法與 discord user 選項同時使用)'
                        })
                        .setRequired(false)
                        .setAutocomplete(true)
                )
                .addMentionableOption(option =>
                    option.setName('discorduser')
                        .setNameLocalizations({
                            'zh-TW': 'dc使用者'
                        })
                        .setDescription("Discord user ID (must bind account first; cannot use with 'player')")
                        .setDescriptionLocalizations({
                            'zh-TW': 'Discord 使用者的 ID (需先綁定帳號，且無法與 player 選項同時使用)'
                        })
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option.setName('public')
                        .setNameLocalizations({
                            'zh-TW': '公開'
                        })
                        .setDescription('Make the query results public')
                        .setDescriptionLocalizations({
                            'zh-TW': '將查詢結果公開'
                        })
                        .setRequired(false)
                )
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const focusedValue = focusedOption.value.toLowerCase();

        if (focusedOption.name === 'template_name') {
            const choices = RecordTemplate.searchOwnNames(interaction.user.id, focusedValue);
            await interaction.respond(choices.map(c => ({ name: c.name, value: c.name })));
            return;
        }

        if (focusedOption.name === 'player') {
            const choices = User.searchPlayers(focusedValue);
            const mappedChoices = choices
                .filter(choice => choice.playerid && choice.playeruuid)
                .map(choice => ({ name: choice.playerid, value: choice.playeruuid }));
                
            if (mappedChoices.length === 0) {
                await interaction.respond([
                    { name: tForInteraction(interaction, 'dc.record.autocompleteNoMatch'), value: 'none' }
                ]);
            } else {
                await interaction.respond(mappedChoices);
            }
            return;
        }

        if (focusedOption.name === 'bot') {
            const config = readConfig();
            const choices = await Promise.all(config.bots.map(async bot => ({
                botid: await minecraftDataService.getPlayerId(bot.uuid) || bot.username,
                botuuid: bot.uuid
            }))).then(results => results.filter(bot => bot.botid.includes(focusedValue)));

            await interaction.respond(choices.map(choice => ({ name: choice.botid, value: choice.botuuid })));
        }
    },
    execute
};

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const isPublic = interaction.options.getBoolean('public') ?? false;
    if (!isPublic) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    } else {
        await interaction.deferReply({ flags: [] });
    }

    let botUuid = interaction.options.getString('bot');
    const playerOpt = interaction.options.getString('player');
    const discordUserOpt = interaction.options.getMentionable('discorduser');
    const advancedOption = interaction.options.getBoolean('advanced') ?? false;

    let requestingUser = User.getByDiscordId(interaction.user.id);
    if (!requestingUser) {
        return interaction.editReply({ content: tForInteraction(interaction, 'dc.record.requesterNotLinked') });
    }

    const config = readConfig();
    const isDiscordAdmin = interaction.member.permissions.has('Administrator');

    let hasPermission = false;
    if (!botUuid) {
        const isInGeneralWhitelist = config.general?.whitelist?.includes(requestingUser.playerid);
        if (isDiscordAdmin || isInGeneralWhitelist) {
            hasPermission = true;
        }
    } else {
        const targetBotConfig = config.bots.find(b => b.uuid === botUuid);
        if (targetBotConfig && targetBotConfig.whitelist?.includes(requestingUser.playerid)) {
            hasPermission = true;
        }
        if (isDiscordAdmin) hasPermission = true;
    }

    const canSeeAdvanced = advancedOption && hasPermission;

    let targetUser = null;
    if (playerOpt) {
        targetUser = User.getByPlayerId(playerOpt) || User.getByUuid(playerOpt);
    } else if (discordUserOpt) {
        targetUser = User.getByDiscordId(discordUserOpt.id);
    } else {
        targetUser = requestingUser;
    }

    if (!targetUser) {
        return interaction.editReply({ content: tForInteraction(interaction, 'dc.record.targetNotFound') });
    }

    let template = null;
    if (subcommand === 'template') {
        const templateName = interaction.options.getString('template_name');
        template = RecordTemplate.getByOwnerAndName(interaction.user.id, templateName);

        if (!template) {
            return interaction.editReply({ content: tForInteraction(interaction, 'dc.record.templateNotFound') });
        }

        botUuid = template.filters?.bot || null;
    }

    let botDisplayName = tForInteraction(interaction, 'dc.record.allBots');
    if (botUuid) {
        const botData = await minecraftDataService.getPlayerId(botUuid);
        const botConfig = config.bots.find(b => b.uuid === botUuid);
        botDisplayName = botData || botConfig?.username || tForInteraction(interaction, 'dc.record.unknownBot');
    }

    const emRange = parseAmountRange(interaction.options.getString('amount_range'));
    const templateEm = normalizeTemplateCurrencyFilters(template?.filters?.emerald);
    const emDateRange = interaction.options.getString('date_range')?.split('~') || [];
    const emFilters = {
        playeruuid: targetUser.playeruuid,
        bot: botUuid,
        currency: 'emerald',
        startTime: parseDate(interaction.options.getString('later_than')) || parseDate(emDateRange[0]) || templateEm.startTime,
        endTime: parseDate(interaction.options.getString('earlier_than')) || parseDate(emDateRange[1]) || templateEm.endTime,
        minAmount: interaction.options.getInteger('greater_than') ?? emRange.min ?? templateEm.minAmount,
        maxAmount: interaction.options.getInteger('less_than') ?? emRange.max ?? templateEm.maxAmount
    };

    const coinRange = parseAmountRange(interaction.options.getString('coin_amount_range'));
    const templateCoin = normalizeTemplateCurrencyFilters(template?.filters?.coin);
    const coinDateRange = interaction.options.getString('coin_date_range')?.split('~') || [];
    const coinFilters = {
        playeruuid: targetUser.playeruuid,
        bot: botUuid,
        currency: 'coin',
        startTime: parseDate(interaction.options.getString('coin_later_than')) || parseDate(coinDateRange[0]) || templateCoin.startTime,
        endTime: parseDate(interaction.options.getString('coin_earlier_than')) || parseDate(coinDateRange[1]) || templateCoin.endTime,
        minAmount: interaction.options.getInteger('coin_greater_than') ?? coinRange.min ?? templateCoin.minAmount,
        maxAmount: interaction.options.getInteger('coin_less_than') ?? coinRange.max ?? templateCoin.maxAmount
    };

    const emStats = BetRecord.getStats(emFilters);
    const coinStats = BetRecord.getStats(coinFilters);

    function formatStats(stats, showDetailed) {
        const bet = stats.totalBetAmount || 0;
        const win = stats.winAmount || 0;
        const count = stats.totalBets || 0;
        if (showDetailed) {
            return tForInteraction(interaction, 'dc.record.statsDetailed', {
                bet,
                count,
                win,
                profit: bet - win
            });
        }
        return tForInteraction(interaction, 'dc.record.statsSimple', { bet, count });
    }

    const imageUrl = `https://minotar.net/helm/${targetUser.playeruuid}/64.png`;

    const fields = [
        { name: tForInteraction(interaction, 'dc.record.fieldPlayerId'), value: targetUser.playerid, inline: true },
        {
            name: tForInteraction(interaction, 'dc.record.fieldDiscord'),
            value: targetUser.discordid ? `<@${targetUser.discordid}>` : tForInteraction(interaction, 'dc.record.unbound'),
            inline: true
        },
        { name: tForInteraction(interaction, 'dc.record.fieldQueryBot'), value: botDisplayName, inline: true },
        { name: tForInteraction(interaction, 'dc.record.fieldPlayerUuid'), value: targetUser.playeruuid, inline: false }
    ];

    if (emFilters.startTime || emFilters.endTime)
        fields.push({
            name: tForInteraction(interaction, 'dc.record.fieldEmeraldPeriod'),
            value: `${emFilters.startTime || tForInteraction(interaction, 'dc.record.rangeStart')} ~ ${emFilters.endTime || tForInteraction(interaction, 'dc.record.rangeEnd')}`,
            inline: false
        });

    fields.push({ name: tForInteraction(interaction, 'dc.record.fieldEmerald'), value: formatStats(emStats, canSeeAdvanced), inline: false });

    if (coinFilters.startTime || coinFilters.endTime)
        fields.push({
            name: tForInteraction(interaction, 'dc.record.fieldCoinPeriod'),
            value: `${coinFilters.startTime || tForInteraction(interaction, 'dc.record.rangeStart')} ~ ${coinFilters.endTime || tForInteraction(interaction, 'dc.record.rangeEnd')}`,
            inline: false
        });

    fields.push({ name: tForInteraction(interaction, 'dc.record.fieldCoin'), value: formatStats(coinStats, canSeeAdvanced), inline: false });

    if (template) {
        fields.push({ name: tForInteraction(interaction, 'dc.record.fieldTemplate'), value: template.name, inline: false });
    }

    const embed = new EmbedBuilder()
        .setTitle(tForInteraction(interaction, 'dc.record.embedTitle'))
        .addFields(fields)
        .setColor("#313338")
        .setThumbnail(imageUrl)
        .setFooter({ text: tForInteraction(interaction, 'dc.record.embedFooter'), iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}