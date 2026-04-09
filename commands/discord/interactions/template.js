const { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
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

        // 簡陋版：直接使用你最新建立的模板
        const template = RecordTemplate.listOwn(interaction.user.id, 1)[0];
        if (!template) {
            await interaction.editReply({
                content: tForInteraction(interaction, 'dc.interaction.template.emptyTemplate')
            });
            return;
        }

        const config = readConfig();
        const botUuid = template.filters?.bot || null;

        let botDisplayName = tForInteraction(interaction, 'dc.interaction.template.allBots');
        if (botUuid) {
            const botData = await minecraftDataService.getPlayerId(botUuid);
            const botConfig = config.bots.find(b => b.uuid === botUuid);
            botDisplayName = botData || botConfig?.username || tForInteraction(interaction, 'dc.interaction.template.unknownBot');
        }

        const templateEm = normalizeTemplateCurrencyFilters(template.filters?.emerald);
        const templateCoin = normalizeTemplateCurrencyFilters(template.filters?.coin);

        const emFilters = {
            playeruuid: targetUser.playeruuid,
            bot: botUuid,
            currency: 'emerald',
            startTime: templateEm.startTime,
            endTime: templateEm.endTime,
            minAmount: templateEm.minAmount,
            maxAmount: templateEm.maxAmount
        };

        const coinFilters = {
            playeruuid: targetUser.playeruuid,
            bot: botUuid,
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
            .setDescription(tForInteraction(interaction, 'dc.interaction.template.embedDesc', { userId: targetDiscordUser.id }))
            .addFields(fields)
            .setColor('#313338')
            .setThumbnail(imageUrl)
            .setFooter({ text: tForInteraction(interaction, 'dc.interaction.template.embedFooter'), iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
