const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
	.setName('設定')
	.setDescription('機器人設定')
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.addSubcommand(subcommand =>
		subcommand
			.setName('對賭')
			.setDescription('對賭設定')
			.addIntegerOption(number =>
				number
					.setName('綠寶石上限')
					.setDescription('綠寶石下注金額上限')
					.setMinValue(1)
			)
			.addIntegerOption(number =>
				number
					.setName('綠寶石下限')
					.setDescription('綠寶石下注金額下限')
					.setMinValue(1)
			)
			.addIntegerOption(number =>
				number
					.setName('村民錠上限')
					.setDescription('村民錠下注金額上限')
					.setMinValue(1)
			)
			.addIntegerOption(number =>
				number
					.setName('村民錠下限')
					.setDescription('村民錠下注金額下限')
					.setMinValue(1)
			)
			.addNumberOption(number =>
				number
					.setName('綠寶石賠率')
					.setDescription('綠寶石的賠率')
					.setMinValue(0)
			)
			.addNumberOption(number =>
				number
					.setName('村民錠賠率')
					.setDescription('村民錠的賠率')
					.setMinValue(0)
			)
	)

	.addSubcommand(subcommand =>
		subcommand
			.setName('機器人')
			.setDescription('機器人設定')
			.addIntegerOption(option =>
				option
					.setName('分流')
					.setDescription('機器人所在分流')
					.setRequired(true)
			)
			.addStringOption(option => 
				option
					.setName('家點')
					.setDescription('機器人的家點名稱') 
					.setRequired(true)
			)
	)

	.addSubcommandGroup(group => 
		group
			.setName('宣傳文')
			.setDescription('機器人自動宣傳的話')
			.addSubcommand(subcommand => 
				subcommand
					.setName('交易頻道')
					.setDescription('在交易頻道自動宣傳的文字')
					.addStringOption(option =>
						option.setName('宣傳文')
							.setDescription('在交易頻道自動宣傳的文字')
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('公設頻道') 
					.setDescription('在公設頻道自動宣傳的文字')
					.addStringOption(option =>
						option.setName('宣傳文')
							.setDescription('在公設頻道自動宣傳的文字')
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('抽獎頻道') 
					.setDescription('在抽獎頻道自動宣傳的文字')
					.addStringOption(option =>
						option.setName('宣傳文')
							.setDescription('在抽獎頻道自動宣傳的文字')
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('領地頻道') 
					.setDescription('在領地頻道自動宣傳的文字')
					.addStringOption(option =>
						option.setName('宣傳文')
							.setDescription('在領地頻道自動宣傳的文字')
					)
			)
	)

	.addSubcommand(subcommand =>
		subcommand
			.setName('頻道')
			.setDescription('Discord 的頻道設定')
			.addChannelOption(option =>
				option
					.setName('控制台')
					.setDescription('Discord 控制台的頻道')
			)
			.addChannelOption(option =>
				option
					.setName('指令紀錄')
					.setDescription('Discord 指令紀錄的頻道')
			)
			.addChannelOption(option =>
				option
					.setName('下注紀錄')
					.setDescription('Discord 下注紀錄的頻道')
			)
			.addChannelOption(option =>
				option
					.setName('狀態紀錄')
					.setDescription('Discord 狀態紀錄的頻道')
			)
			.addChannelOption(option =>
				option
					.setName('綁定紀錄')
					.setDescription('Discord 綁定紀錄的頻道')
			)
			.addChannelOption(option =>
				option
					.setName('錯誤紀錄')
					.setDescription('Discord 錯誤紀錄的頻道')
			)
	),

	async execute(interaction) {
		let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
		
		switch (interaction.options.getSubcommand()) {
			case '對賭':
				// check if the option is not blank
				if (interaction.options.getInteger('綠寶石上限') != null && interaction.options.getInteger('綠寶石上限') != undefined) {
					config.bet.emax = interaction.options.getInteger('綠寶石上限');
				}

				if (interaction.options.getInteger('綠寶石下限') != null && interaction.options.getInteger('綠寶石下限') != undefined) {
					config.bet.emin = interaction.options.getInteger('綠寶石下限');
				}

				if (interaction.options.getInteger('村民錠上限') != null && interaction.options.getInteger('村民錠上限') != undefined) {
					config.bet.cmax = interaction.options.getInteger('村民錠上限');
				}

				if (interaction.options.getInteger('村民錠下限') != null && interaction.options.getInteger('村民錠下限') != undefined) {
					config.bet.cmin = interaction.options.getInteger('村民錠下限');
				}

				if (interaction.options.getNumber('綠寶石賠率') != null && interaction.options.getNumber('綠寶石賠率') != undefined) {
					config.bet.eodds = interaction.options.getNumber('綠寶石賠率');
				}

				if (interaction.options.getNumber('村民錠賠率') != null && interaction.options.getNumber('村民錠賠率') != undefined) {
					config.bet.codds = interaction.options.getNumber('村民錠賠率');
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '機器人':
				config.bot.server = interaction.options.getInteger('分流');
				config.bot.home = interaction.options.getString('家點');
				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '頻道':
				if (interaction.options.getChannel('控制台') != null && interaction.options.getChannel('控制台') != undefined) {
					config.discord_channels.console = interaction.options.getChannel('控制台').id;
				}

				if (interaction.options.getChannel('指令紀錄') != null && interaction.options.getChannel('指令紀錄') != undefined) {
					config.discord_channels.command_record = interaction.options.getChannel('指令紀錄').id;
				}

				if (interaction.options.getChannel('下注紀錄') != null && interaction.options.getChannel('下注紀錄') != undefined) {
					config.discord_channels.bet_record = interaction.options.getChannel('下注紀錄').id;
				}

				if (interaction.options.getChannel('狀態紀錄') != null && interaction.options.getChannel('狀態紀錄') != undefined) {
					config.discord_channels.status = interaction.options.getChannel('狀態紀錄').id;
				}

				if (interaction.options.getChannel('綁定紀錄') != null && interaction.options.getChannel('綁定紀錄') != undefined) {
					config.discord_channels.link = interaction.options.getChannel('綁定紀錄').id;
				}

				if (interaction.options.getChannel('錯誤紀錄') != null && interaction.options.getChannel('錯誤紀錄') != undefined) {
					config.discord_channels.errors = interaction.options.getChannel('錯誤紀錄').id;
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '交易頻道':
				if (!interaction.options.getString('宣傳文')) {
					config.trade_text = ''
				} else {
					config.trade_text = interaction.options.getString('宣傳文');
				}
				
				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '公設頻道':
				if (!interaction.options.getString('宣傳文')) {
					config.facility_text = ''
				} else {
					config.facility_text = interaction.options.getString('宣傳文');
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '抽獎頻道':
				if (!interaction.options.getString('宣傳文')) {
					config.lottery_text = ''
				} else {
					config.lottery_text = interaction.options.getString('宣傳文');
				}
				
				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '領地頻道':
				if (!interaction.options.getString('宣傳文')) {
					config.claim_text = ''
				} else {
					config.claim_text = interaction.options.getString('宣傳文');
				}
				
				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;
		}
	},
};