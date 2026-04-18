const { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const BetRecord = require('../../../models/BetRecord');
const RecordTemplate = require('../../../models/RecordTemplate');
const User = require('../../../models/User');
const { readConfig } = require('../../../services/configService');
const { tForInteraction } = require('../../../utils/i18n');
const { normalizeBotKey, findConfigBotByKey } = require('../../../utils/botKey');

function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString().replace('T', ' ').substring(0, 19);
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
    data: new ContextMenuCommandBuilder()
        .setName('recordTemplate')
        .setNameLocalizations({
            'zh-TW': '固定條件查詢'
        })
        .setType(ApplicationCommandType.User),

    name: 'recordTemplate',

    async execute(interaction) {
        if (interaction.isContextMenuCommand()) {
            await this.handleContextMenu(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await this.handleSelectMenu(interaction);
        }
    },

    async handleContextMenu(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const requester = User.getByDiscordId(interaction.user.id);
        if (!requester) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.interaction.template.requesterNotLinked') });
            return;
        }

        const targetDiscordUser = interaction.targetUser;
        const targetUser = User.getByDiscordId(targetDiscordUser.id);

        if (!targetUser) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.interaction.template.targetNotLinked', { userId: targetDiscordUser.id })
            });
            return;
        }

        const templates = RecordTemplate.listOwn(interaction.user.id, 25);
        if (!templates || templates.length === 0) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.interaction.template.emptyTemplate')
            });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`recordTemplate_${targetDiscordUser.id}`)
            .setPlaceholder(tForInteraction(interaction, 'dc.interaction.template.selectPlaceholder') || '請選擇一個查詢模板')
            .addOptions(templates.map(t => ({
                label: t.name,
                value: String(t.name)
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.interaction.template.selectPrompt') || '請選擇您想使用的查詢模板：',
            components: [row]
        });
    },

    async handleSelectMenu(interaction) {
        await interaction.deferUpdate();

        const requester = User.getByDiscordId(interaction.user.id);
        if (!requester) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.interaction.template.requesterNotLinked'), components: [] });
            return;
        }

        const targetDiscordId = interaction.customId.split('_')[1];
        const targetUser = User.getByDiscordId(targetDiscordId);

        if (!targetUser) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.interaction.template.targetNotLinked', { userId: targetDiscordId }),
                components: []
            });
            return;
        }

        const templateName = interaction.values[0];
        const template = RecordTemplate.getByOwnerAndName(interaction.user.id, templateName);
        
        if (!template) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.interaction.template.notFound') || '找不到指定的模板。',
                components: []
            });
            return;
        }

        const config = readConfig();
        const botKey = normalizeBotKey(template.filters?.bot || null);

        let botDisplayName = tForInteraction(interaction, 'dc.interaction.template.allBots');
        if (botKey) {
            const botConfig = findConfigBotByKey(config.bots, botKey);
            botDisplayName = botConfig?.username || tForInteraction(interaction, 'dc.interaction.template.unknownBot');
        }

        const templateEm = normalizeTemplateCurrencyFilters(template.filters?.emerald);
        const templateCoin = normalizeTemplateCurrencyFilters(template.filters?.coin);

        const emFilters = {
            playeruuid: targetUser.playeruuid,
            bot: botKey || null,
            currency: 'emerald',
            startTime: templateEm.startTime,
            endTime: templateEm.endTime,
            minAmount: templateEm.minAmount,
            maxAmount: templateEm.maxAmount
        };

        const coinFilters = {
            playeruuid: targetUser.playeruuid,
            bot: botKey || null,
            currency: 'coin',
            startTime: templateCoin.startTime,
            endTime: templateCoin.endTime,
            minAmount: templateCoin.minAmount,
            maxAmount: templateCoin.maxAmount
        };

        const emStats = BetRecord.getStats(emFilters);
        const coinStats = BetRecord.getStats(coinFilters);

        const formatStats = (stats) => {
            const bet = stats.totalBetAmount || 0;
            const count = stats.totalBets || 0;
            return tForInteraction(interaction, 'dc.interaction.template.stats', { bet, count });
        };

        const fields = [
            { name: tForInteraction(interaction, 'dc.interaction.template.fieldPlayerId'), value: targetUser.playerid, inline: true },
            {
                name: tForInteraction(interaction, 'dc.interaction.template.fieldDiscord'),
                value: targetUser.discordid ? `<@${targetUser.discordid}>` : tForInteraction(interaction, 'dc.interaction.template.unbound'),
                inline: true
            },
            { name: tForInteraction(interaction, 'dc.interaction.template.fieldQueryBot'), value: botDisplayName, inline: true },
            { name: tForInteraction(interaction, 'dc.interaction.template.fieldPlayerUuid'), value: targetUser.playeruuid, inline: false }
        ];

        if (emFilters.startTime || emFilters.endTime) {
            fields.push({
                name: tForInteraction(interaction, 'dc.interaction.template.fieldEmeraldPeriod'),
                value: `${emFilters.startTime || tForInteraction(interaction, 'dc.interaction.template.rangeStart')} ~ ${emFilters.endTime || tForInteraction(interaction, 'dc.interaction.template.rangeEnd')}`,
                inline: false
            });
        }
        fields.push({ name: tForInteraction(interaction, 'dc.interaction.template.fieldEmerald'), value: formatStats(emStats), inline: false });

        if (coinFilters.startTime || coinFilters.endTime) {
            fields.push({
                name: tForInteraction(interaction, 'dc.interaction.template.fieldCoinPeriod'),
                value: `${coinFilters.startTime || tForInteraction(interaction, 'dc.interaction.template.rangeStart')} ~ ${coinFilters.endTime || tForInteraction(interaction, 'dc.interaction.template.rangeEnd')}`,
                inline: false
            });
        }
        fields.push({ name: tForInteraction(interaction, 'dc.interaction.template.fieldCoin'), value: formatStats(coinStats), inline: false });
        fields.push({ name: tForInteraction(interaction, 'dc.interaction.template.fieldTemplate'), value: template.name, inline: false });

        const imageUrl = `https://minotar.net/helm/${targetUser.playeruuid}/64.png`;
        const embed = new EmbedBuilder()
            .setTitle(tForInteraction(interaction, 'dc.interaction.template.embedTitle'))
            .setDescription(tForInteraction(interaction, 'dc.interaction.template.embedDesc', { userId: targetDiscordId }))
            .addFields(fields)
            .setColor('#313338')
            .setThumbnail(imageUrl)
            .setFooter({ text: tForInteraction(interaction, 'dc.interaction.template.embedFooter'), iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
            .setTimestamp();

        await interaction.editReply({ content: '', embeds: [embed], components: [] });
    },
};
