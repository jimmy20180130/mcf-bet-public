const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const RecordTemplate = require('../../../models/RecordTemplate');
const { readConfig } = require('../../../services/configService');
const { tForInteraction } = require('../../../utils/i18n');
const { getBotKeyFromConfigBot } = require('../../../utils/botKey');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('template')
        .setNameLocalizations({
            'zh-TW': '活動模板'
        })
        .setDescription('record template')
        .setDescriptionLocalizations({
            'zh-TW': '活動模板'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setNameLocalizations({
                    'zh-TW': '新增'
                })
                .setDescription('add a template')
                .setDescriptionLocalizations({
                    'zh-TW': '新增一個模板'
                })
                .addStringOption(option =>
                    option.setName('name')
                        .setNameLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setDescription('Template name')
                        .setDescriptionLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setRequired(true)
                )
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
            subcommand
                .setName('remove')
                .setNameLocalizations({
                    'zh-TW': '刪除'
                })
                .setDescription('remove a template')
                .setDescriptionLocalizations({
                    'zh-TW': '刪除一個模板'
                })
                .addStringOption(option =>
                    option.setName('name')
                        .setNameLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setDescription('Template name')
                        .setDescriptionLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setNameLocalizations({
                    'zh-TW': '列表'
                })
                .setDescription('list all templates')
                .setDescriptionLocalizations({
                    'zh-TW': '列出所有模板'
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setNameLocalizations({
                    'zh-TW': '資訊'
                })
                .setDescription('show info about a template')
                .setDescriptionLocalizations({
                    'zh-TW': '顯示模板資訊'
                })
                .addStringOption(option =>
                    option.setName('name')
                        .setNameLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setDescription('Template name')
                        .setDescriptionLocalizations({
                            'zh-TW': '模板名稱'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        ),
    autocomplete,
    execute,
};

async function autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = String(focusedOption.value || '').trim();

    if (focusedOption.name === 'name') {
        const choices = RecordTemplate.searchOwnNames(interaction.user.id, focusedValue);
        await interaction.respond(
            choices.map(choice => ({ name: choice.name, value: choice.name }))
        );
        return;
    }

    if (focusedOption.name === 'bot') {
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
}

async function execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const subcommand = interaction.options.getSubcommand();

    try {

    if (subcommand === 'add') {
        const templateName = String(interaction.options.getString('name') || '').trim();
        if (!templateName) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.template.nameEmpty') });
            return;
        }

        const existing = RecordTemplate.getByOwnerAndName(interaction.user.id, templateName);
        if (existing) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.template.nameExists', { templateName })
            });
            return;
        }

        const filters = buildTemplateFilters(interaction);
        const validationError = validateTemplateFilters(filters);
        if (validationError) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.template.filterError', { error: validationError })
            });
            return;
        }

        RecordTemplate.create({
            ownerDiscordId: interaction.user.id,
            name: templateName,
            filters
        });

        await interaction.editReply({
            content: [
                tForInteraction(interaction, 'dc.template.added', { templateName }),
                formatTemplateFilters(filters)
            ].join('\n')
        });
        return;
    }

    if (subcommand === 'remove') {
        const templateName = String(interaction.options.getString('name') || '').trim();
        const result = RecordTemplate.remove(interaction.user.id, templateName);
        if (!result.changes) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.template.notFound', { templateName })
            });
            return;
        }

        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.template.removed', { templateName })
        });
        return;
    }

    if (subcommand === 'list') {
        const templates = RecordTemplate.listOwn(interaction.user.id);
        if (templates.length === 0) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.template.emptyList') });
            return;
        }

        const lines = templates.map((tpl, index) => {
            return `${index + 1}. ${tpl.name}`;
        });

        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.template.listHeader', { lines: lines.join('\n') })
        });
        return;
    }

    if (subcommand === 'info') {
        const templateName = String(interaction.options.getString('name') || '').trim();
        const template = RecordTemplate.getByOwnerAndName(interaction.user.id, templateName);

        if (!template) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.template.notFound', { templateName })
            });
            return;
        }

        await interaction.editReply({
            content: [
                tForInteraction(interaction, 'dc.template.infoName', { name: template.name }),
                tForInteraction(interaction, 'dc.template.infoCreator', { userId: interaction.user.id }),
                formatTemplateFilters(template.filters)
            ].join('\n')
        });
        return;
    }

    await interaction.editReply({
        content: tForInteraction(interaction, 'dc.template.unknownSubcommand', { subcommand })
    });
    } catch (error) {
        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.template.handleError', { error: error.message || error })
        });
    }


    function parseDate(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d.toISOString().replace('T', ' ').substring(0, 19);
    }

    function parseAmountRange(rangeStr) {
        if (!rangeStr) return { min: null, max: null };
        const match = String(rangeStr).match(/(\d+)<=x<=(\d+)/);
        if (match) return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
        return { min: null, max: null };
    }

    function buildCurrencyFilters(interaction, prefix = '') {
        const dateRange = interaction.options.getString(`${prefix}date_range`)?.split('~') || [];
        const amountRange = parseAmountRange(interaction.options.getString(`${prefix}amount_range`));

        return {
            startTime: parseDate(interaction.options.getString(`${prefix}later_than`)) || parseDate(dateRange[0]),
            endTime: parseDate(interaction.options.getString(`${prefix}earlier_than`)) || parseDate(dateRange[1]),
            minAmount: interaction.options.getInteger(`${prefix}greater_than`) ?? amountRange.min,
            maxAmount: interaction.options.getInteger(`${prefix}less_than`) ?? amountRange.max
        };
    }

    function buildTemplateFilters(interaction) {
        return {
            bot: interaction.options.getString('bot') || null,
            emerald: buildCurrencyFilters(interaction, ''),
            coin: buildCurrencyFilters(interaction, 'coin_')
        };
    }

    function validateTemplateFilters(filters) {
        const check = (currencyName, values) => {
            if (values.startTime && values.endTime && values.startTime > values.endTime) {
                return tForInteraction(interaction, 'dc.template.validationStartAfterEnd', { currencyName });
            }
            if (values.minAmount !== null && values.maxAmount !== null && values.minAmount > values.maxAmount) {
                return tForInteraction(interaction, 'dc.template.validationMinGreaterThanMax', { currencyName });
            }
            return null;
        };

        return check('綠寶石', filters.emerald) || check('村民錠', filters.coin);
    }

    function formatCurrencyFilters(label, values) {
        const hasDate = values.startTime || values.endTime;
        const hasAmount = values.minAmount !== null || values.maxAmount !== null;

        if (!hasDate && !hasAmount) {
            return tForInteraction(interaction, 'dc.template.currencyNoCondition', { label });
        }

        const parts = [];
        if (hasDate) {
            parts.push(tForInteraction(interaction, 'dc.template.currencyTimeRange', {
                start: values.startTime || '始',
                end: values.endTime || '末'
            }));
        }
        if (hasAmount) {
            parts.push(tForInteraction(interaction, 'dc.template.currencyAmountRange', {
                min: values.minAmount ?? '-inf',
                max: values.maxAmount ?? 'inf'
            }));
        }
        return tForInteraction(interaction, 'dc.template.currencyLine', {
            label,
            content: parts.join(' | ')
        });
    }

    function formatTemplateFilters(filters) {
        const safeFilters = filters || {};
        return [
            tForInteraction(interaction, 'dc.template.botLine', { bot: safeFilters.bot || '所有機器人' }),
            formatCurrencyFilters('綠寶石', safeFilters.emerald || {}),
            formatCurrencyFilters('村民錠', safeFilters.coin || {})
        ].join('\n');
    }
}