const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { tForInteraction } = require('../../../utils/i18n');
const { verifyLinkCode } = require('../../../services/linkService');
const User = require('../../../models/User');
const minecraftDataService = require('../../../services/minecraftDataService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setNameLocalizations({
            'zh-TW': '綁定'
        })
        .setDescription('Link your Minecraft account')
        .setDescriptionLocalizations({
            'zh-TW': '綁定你的 Minecraft 帳號'
        })
        .addIntegerOption(option =>
            option.setName('code')
                .setNameLocalizations({
                    'zh-TW': '驗證碼'
                })
                .setDescription('The verification code from the bot')
                .setDescriptionLocalizations({
                    'zh-TW': '從機器人取得的驗證碼'
                })
                .setRequired(true)
                .setMaxValue(99999)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const code = interaction.options.getInteger('code');
        const playerid = verifyLinkCode(code);

        if (!playerid) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.link.invalidCode') });
            return;
        } else {
            const playeruuid = await minecraftDataService.getPlayerUuid(playerid);
            try {
                await User.create({ playeruuid, playerid });
                await User.linkDiscord(playeruuid, interaction.user.id);
                await interaction.editReply({ content: tForInteraction(interaction, 'dc.link.success', { playerId: playerid, playerUuid: playeruuid }) });

            } catch (error) {
                await interaction.editReply({ content: tForInteraction(interaction, 'dc.link.linkFailed') });
                return;
            }
        }
    },
};
