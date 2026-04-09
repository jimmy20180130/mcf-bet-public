const { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/User');
const { tForInteraction } = require('../../../utils/i18n');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('minecraftData')
		.setNameLocalizations({
			'zh-TW': '查詢 Minecraft 資料'
		})
		.setType(ApplicationCommandType.User),
        
	name: 'minecraftData',
    
	async execute(interaction) {
		const targetUser = interaction.targetUser;
		const userData = User.getByDiscordId(targetUser.id);

		if (!userData) {
			await interaction.reply({
				content: tForInteraction(interaction, 'dc.interaction.minecraftData.notLinked', {
					userId: targetUser.id
				}),
				flags: [MessageFlags.Ephemeral]
			});
			return;
		}

		await interaction.reply({
			content: tForInteraction(interaction, 'dc.interaction.minecraftData.summary', {
				userId: targetUser.id,
				playerId: userData.playerid,
				uuid: userData.playeruuid
			}),
			flags: [MessageFlags.Ephemeral]
		});
	},
};
