const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { get_user_data, remove_user_data } = require(`../utils/database.js`);
const { validate_code } = require(`../utils/link_handler.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);
const { link_embed } = require(`../discord/embed.js`);
const fs = require('fs')
const Logger = require('../utils/logger.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('綁定')
		.setDescription('綁定您的 Minecraft 帳號')
		.setDMPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('link')
				.setNameLocalizations({
					"en-US": "link",
					"zh-CN": "gertqw简体中文",
					"zh-TW": "綁定"
				})
				.setDescription('link your discord account with your minecraft account')
				.setDescriptionLocalizations({
					"en-US": "link your discord account with your minecraft account",
					"zh-CN": "目前不支援简体中文",
					"zh-TW": "綁定您的 Minecraft 帳號"
				})
				.addStringOption(option =>
					option
						.setName('驗證碼')
						.setRequired(true)
						.setNameLocalizations({
							"en-US": "verify-code",
							"zh-CN": "wqere简体中文",
							"zh-TW": "驗證碼"
						})
						.setDescription('您在遊戲中收到的驗證碼')
						.setDescriptionLocalizations({
							"en-US": "the verification code you get in the game",
							'zh-CN': '目前不支援简体中文',
							"zh-TW": "您在遊戲中收到的驗證碼"
						})
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('unlink')
				.setNameLocalizations({
					"en-US": "unlink",
					"zh-CN": "xcvdsf简体中文",
					"zh-TW": "解綁"
				})
				.setDescription('unlink your discord account with your minecraft account')
				.setDescriptionLocalizations({
					"en-US": "unlink your discord account with your minecraft account",
					"zh-CN": "目前不支援简体中文",
					"zh-TW": "解綁您的 Minecraft 帳號"
				})
		),

	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

		const verification_code = interaction.options.getString('驗證碼')

		if (!interaction.member) {
			Logger.debug(`[綁定] ${interaction.user.id} 並未在伺服器中使用此指令`);
			await interaction.editReply('請在伺服器中使用此指令');
			return;
		}

		switch (interaction.options.getSubcommand()) {
			case 'link':
				const verify_success = await validate_code(verification_code, interaction.member.id)
				if (verify_success && verify_success != 'already_linked') {
					Logger.debug(`[綁定] ${interaction.member.id} 綁定成功，綁定的 UUID 為 ${verify_success}`);
					await interaction.editReply(`成功綁定您的 Minecraft 帳號 (${(await get_player_name(verify_success)).replace(/(_)/g, "\\$1")}) 至您的 Discord 帳號 (<@${interaction.member.id}>)`);
					const embed = await link_embed((await get_player_name(verify_success)).replace(/(_)/g, "\\$1"), verify_success.replace(/(_)/g, "\\$1"), interaction.member.user.tag.replace(/(_)/g, "\\$1"), interaction.member.user.id, await get_player_name(verify_success))
					const channel = await interaction.client.channels.fetch(config.discord_channels.link)
					await channel.send({ embeds: [embed] });

				} else if (verify_success == 'already_linked') {
					Logger.debug(`[綁定] ${interaction.member.id} 已經綁定過了`);
					await interaction.editReply('您的 Discord 帳號已經綁定過了');

				} else {
					Logger.debug(`[綁定] ${interaction.member.id} 驗證碼錯誤`);
					await interaction.editReply('驗證碼錯誤');
				}

				break;

			case 'unlink':
				const embed = new EmbedBuilder()
					.setTitle('確認操作')
					.setDescription('請確認您是否要解除綁定帳號?\n此操作將會刪除您的部分資料，包括 Discord ID 等等。');

				const confirmButton = new ButtonBuilder()
					.setCustomId('confirm')
					.setLabel('確認')
					.setStyle(ButtonStyle.Success);

				const cancelButton = new ButtonBuilder()
					.setCustomId('cancel')
					.setLabel('取消')
					.setStyle(ButtonStyle.Danger);

				const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

				interaction.editReply({ embeds: [embed], components: [actionRow] })

				const filter = (interaction) => interaction.customId === 'confirm' || interaction.customId === 'cancel';
				const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

				collector.on('collect', async (interaction) => {
					if (interaction.customId === 'confirm') {
						await interaction.update({ content: '已成功解除綁定', components: [], embeds: [] });

						const player_uuid = await get_user_data(undefined, interaction.user.id).then(data => data.player_uuid);
						await remove_user_data(player_uuid);

					} else {
						Logger.debug(`[綁定] ${interaction.user.id} 取消解除綁定`);
						await interaction.update({ content: '已取消解除綁定', components: [] });
					}
				});

				collector.on('end', (collected) => {
					Logger.debug(`[綁定] 解除綁定操作介面已結束`);
				});

				break;
		}
	}
};