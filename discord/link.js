const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { get_pay_history, getPlayerRole, get_user_data } = require(`${process.cwd()}/utils/database.js`);
const { validate_code } = require(`${process.cwd()}/utils/link_handler.js`);
const { get_player_uuid, get_player_name } = require(`${process.cwd()}/utils/get_player_info.js`);
const { link_embed } = require(`${process.cwd()}/discord/embed.js`);
const fs = require('fs')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('link')
        .setNameLocalizations({
            "en-US": "link",
            "zh-CN": "ergf简体中文",
            "zh-TW": "綁定"
        })
		.setDescription('link your discord account with your minecraft account')
        .setDescriptionLocalizations({
            "en-US": "link your discord account with your minecraft account",
            "zh-CN": "目前不支援简体中文",
            "zh-TW": "綁定您的 Minecraft 帳號"
        })
		.addStringOption(option =>
			option.setName('驗證碼')
				.setRequired(true)
				.setNameLocalizations({
					"en-US": "verify-code",
					"zh-CN": "aregre简体中文",
					"zh-TW": "驗證碼"
				})
				.setDescription('您在遊戲中收到的驗證碼'))
				.setDescriptionLocalizations({
					"en-US": "the verification code you get in the game",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "您在遊戲中收到的驗證碼"
				}),

	async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

		const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
		const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));

		const verification_code = interaction.options.getString('驗證碼')

		if (!interaction.member) {
			await interaction.editReply('請在伺服器中使用此指令');
			return;
		}

		const verify_success = await validate_code(verification_code, interaction.member.id)
        if (verify_success && verify_success != 'already_linked') {
            await interaction.editReply(`成功綁定您的 Minecraft 帳號 (${(await get_player_name(verify_success)).replace(/(_)/g, "\\$1")}) 至您的 Discord 帳號 (<@${interaction.member.id}>)`);
			const embed = await link_embed((await get_player_name(verify_success)).replace(/(_)/g, "\\$1"), verify_success.replace(/(_)/g, "\\$1"), interaction.member.user.tag.replace(/(_)/g, "\\$1"), interaction.member.user.id, await get_player_name(verify_success))
			const channel = await interaction.client.channels.fetch(config.discord_channels.link)
            await channel.send({ embeds: [embed] });
			
			const role = await interaction.guild.roles.fetch(roles[config.roles.link_role].discord_id);
			await interaction.member.roles.add(role);
        } else if (verify_success == 'already_linked') {
			await interaction.editReply('您的 Discord 帳號已經綁定過了');
		} else {
            await interaction.editReply('驗證碼錯誤');
        }
	}
};