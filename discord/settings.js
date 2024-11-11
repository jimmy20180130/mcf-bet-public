const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require('fs');
const { get_player_name } = require(`../utils/get_player_info.js`);
const { get_user_data } = require(`../utils/database.js`);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('設定')
		.setDescription('機器人設定')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)
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
				.setName('自動發話')
				.setDescription('設定機器人自動發話')
				.addSubcommand(subcommand =>
					subcommand
						.setName('建立')
						.setDescription('新增自動發話的文字')
						.addStringOption(option =>
							option.setName('文字或指令')
								.setDescription('自動發話的內容')
								.setRequired(true)
						)
						.addIntegerOption(option =>
							option.setName('間隔時間')
								.setDescription('間隔時間 (以毫秒計算)')
								.setRequired(true)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('刪除')
						.setDescription('刪除自動發話的文字')
						.addStringOption(option =>
							option.setName('文字或指令')
								.setAutocomplete(true)
								.setDescription('自動發話的內容')
						)
				)
		)

		.addSubcommandGroup(group =>
			group
				.setName('管理員')
				.setDescription('設定管理員')
				.addSubcommand(subcommand =>
					subcommand
						.setName('新增')
						.setDescription('新增管理員')
						.addStringOption(option =>
							option
								.setName('使用者')
								.setDescription('新增的管理員(請輸入 Minecraft ID)')
								.setRequired(true)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('移除')
						.setDescription('刪除管理員')
						.addStringOption(option =>
							option
								.setName('使用者')
								.setDescription('刪除的管理員')
								.setRequired(true)
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
		let user_data = await get_user_data(undefined, interaction.user.id);

		if (!config.whitelist || !user_data || user_data == 'Not Found' || user_data == 'Unexpected Error' || (!config.whitelist.includes((await get_player_name(user_data.player_uuid)).toLowerCase()) && !config.whitelist.includes(await get_player_name(user_data.player_uuid)))) {
			await interaction.reply({ content: '你沒有權限使用這個指令', ephemeral: true });
			return;
		}

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

			case '建立':
				config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

				if (!interaction.options.getString('文字或指令') || !interaction.options.getInteger('間隔時間')) {
					await interaction.reply({ content: '請輸入文字', ephemeral: true })
					return

				} else {
					config.advertisement.push({
						"text": interaction.options.getString('文字或指令'),
						"interval": interaction.options.getInteger('間隔時間')
					})
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '刪除':
				config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

				if (!interaction.options.getString('文字或指令')) {
					await interaction.reply({ content: '請輸入文字', ephemeral: true })
					return

				} else {
					let index = config.advertisement.findIndex(x => x.text.slice(0, 25) === interaction.options.getString('文字或指令'));
					if (index != -1) {
						config.advertisement.splice(index, 1);
					}
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '新增':
				config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

				if (!interaction.options.getString('使用者')) {
					await interaction.reply({ content: '請輸入使用者', ephemeral: true })
					return

				} else {
					config.whitelist.push(interaction.options.getString('使用者'));
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;

			case '移除':
				config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));

				if (!interaction.options.getString('使用者')) {
					await interaction.reply({ content: '請輸入使用者', ephemeral: true })
					return
				} else {
					let index = config.whitelist.findIndex(x => x.toLowerCase() === interaction.options.getString('使用者').toLowerCase());
					if (index !== -1) {
						config.whitelist.splice(index, 1);
					}
				}

				fs.writeFileSync(`${process.cwd()}/config/config.json`, JSON.stringify(config, null, 4));
				await interaction.reply({ content: '設定完成', ephemeral: true });
				break;
		}
	},
};