const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setNameLocalizations({
			"en-US": "ping",
			"zh-CN": "ewdf简体中文",
			"zh-TW": "延遲"
		})
		.setDescription('Replies with Pong!')
		.setDescriptionLocalizations({
			"en-US": "Replies with Pong!",
			'zh-CN': '目前不支援简体中文',
			"zh-TW": "我會回應 Pong!"
		}),

	async execute(interaction) {
		const locales = {
            'en-US': 'Pong!',
            'zh-CN': '目前不支援简体中文',
			'zh-TW': 'Pong!'
        };

		
		await interaction.reply(`${locales[interaction.locale] ?? 'Pong!'} ${interaction.options.getString('玩家名稱')}`);
	},
};