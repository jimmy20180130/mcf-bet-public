const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { tForInteraction } = require('../../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setNameLocalizations({
            'zh-TW': 'ping'
        })
        .setDescription('Replies with Pong!')
        .setDescriptionLocalizations({
            'zh-TW': '查看機器人延遲'
        }),
    async execute(interaction) {
        const response = await interaction.reply({
            content: tForInteraction(interaction, 'dc.ping.pinging'),
            flags: [MessageFlags.Ephemeral],
            withResponse: true
        });

        const latency = response.resource.message.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.ping.result', { latency, apiLatency })
        });
    },
};
