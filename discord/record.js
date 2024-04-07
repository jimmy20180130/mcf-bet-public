const { SlashCommandBuilder, EmbedBuilder, escapeEscape } = require('discord.js');
const { get_pay_history, getPlayerRole, get_user_data, get_user_data_from_dc, get_all_pay_history, get_all_user_data } = require(`${process.cwd()}/utils/database.js`);
const { get_player_uuid, get_player_name } = require(`${process.cwd()}/utils/get_player_info.js`);
const { orderStrings } = require(`${process.cwd()}/utils/permissions.js`);
const { bet_record } = require(`${process.cwd()}/discord/embed.js`);
const fetch = require("node-fetch");
const fs = require('fs')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('record')
		.setNameLocalizations({
			"en-US": "record",
			"zh-CN": "gvf简体中文",
			"zh-TW": "查詢資料"
		})
		.setDescription('check bet record')
		.setDescriptionLocalizations({
			"en-US": "check bet record",
			"zh-CN": "目前不支援简体中文",
			"zh-TW": "查詢資料"
		})
			
		.addStringOption(option =>
			option.setName('playerid')
				.setAutocomplete(true)
				.setRequired(true)
				.setNameLocalizations({
					"en-US": "playerid",
					"zh-CN": "vfdz简体中文",
					"zh-TW": "玩家名稱"
				})
				.setDescription('The player ID you want to query'))
				.setDescriptionLocalizations({
					"en-US": "The player ID you want to query",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "您欲查詢的玩家 ID"
				})
				
		.addStringOption(option =>
			option.setName('late')
				.setNameLocalizations({
					"en-US": "late",
					"zh-CN": "vdfv简体中文",
					"zh-TW": "晚於"
				})
				.setDescription('time must late than'))
				.setDescriptionLocalizations({
					"en-US": "time must late than",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "時間需晚於"
				})
		.addStringOption(option =>
			option.setName('early')
				.setNameLocalizations({
					"en-US": "early",
					"zh-CN": "sdcv简体中文",
					"zh-TW": "早於"
				})
				.setDescription('time must early than'))
				.setDescriptionLocalizations({
					"en-US": "time must early than",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "時間需早於"
				})
		.addStringOption(option =>
			option.setName('duration')
				.setNameLocalizations({
					"en-US": "duration",
					"zh-CN": "dcdcv简体中文",
					"zh-TW": "期間"
				})
				.setDescription('time must in the'))
				.setDescriptionLocalizations({
					"en-US": "time must early than",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "時間需在期間內"
				})
		.addIntegerOption(option =>
			option.setName('amount-bigger-than')
				.setNameLocalizations({
					"en-US": "amount-bigger-than",
					"zh-CN": "dcrrv简体中文",
					"zh-TW": "大於"
				})
				.setDescription('amount must bigger than'))
				.setDescriptionLocalizations({
					"en-US": "amount must bigger than",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "金額需大於"
				})
		.addIntegerOption(option =>
			option.setName('amount-smaller-than')
				.setNameLocalizations({
					"en-US": "amount-smaller-than",
					"zh-CN": "erfrrv简体中文",
					"zh-TW": "小於"
				})
				.setDescription('amount must smaller than'))
				.setDescriptionLocalizations({
					"en-US": "amount must smaller than",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "金額需小於"
				})
		.addIntegerOption(option =>
			option.setName('amount-equal')
				.setNameLocalizations({
					"en-US": "amount-equal",
					"zh-CN": "qwrv简体中文",
					"zh-TW": "等於"
				})
				.setDescription('amount must equal to'))
				.setDescriptionLocalizations({
					"en-US": "amount must equal to",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "金額需等於"
				})
		.addBooleanOption(option =>
			option.setName('public')
				.setNameLocalizations({
					"en-US": "public",
					"zh-CN": "sdc简体中文",
					"zh-TW": "公開"
				})
				.setDescription('public or not'))
				.setDescriptionLocalizations({
					"en-US": "public or not",
					'zh-CN': '目前不支援简体中文',
					"zh-TW": "是否讓您的結果公開"
				}),

	async execute(interaction) {
		if (interaction.options.getBoolean('public')) { await interaction.deferReply() } else { await interaction.deferReply({ ephemeral: true }) }

		if (!interaction.member) {
			await interaction.editReply('請在伺服器中使用此指令');
			return;
		}

		const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));
		let player_uuid = await get_player_uuid(interaction.options.getString('playerid'));
		if (interaction.options.getString('playerid') == '所有人') {
			player_uuid = '所有人'
		}

		if (interaction.options.getString('playerid') != '所有人' && player_uuid == 'Not Found' || String(player_uuid).startsWith('error')) {
			await interaction.editReply('找不到玩家');
			return;
		} else {
			let pay_history
			if (interaction.options.getString('playerid') != '所有人') {
				pay_history = await get_pay_history(player_uuid);
			} else {
				pay_history = await get_all_pay_history();
			}
			const player_data = (await get_user_data(player_uuid))[0];

			if (pay_history.length == 0) {
				await interaction.editReply('找不到紀錄');
				return;
			} else if (player_data == 'Not Found' || String(player_data).startsWith('error')) {
				await interaction.editReply('找不到玩家');
				return;
			}

			let time_type = ['late', 'early', 'duration']
			time_type = await new Promise(async (resolve) => {
				for (let item of time_type) {
					const time_item = interaction.options.getString(item)
					if (time_item) {
						resolve(item)
					}
				}

				resolve('none')
			});

			let time_string = '無範圍限制'
			let time_unix
			let time_unix_2

			if (interaction.options.getString(time_type)) {
				let time = interaction.options.getString(time_type).split('~')
				
				if (time_type == 'late') {
					time_string = `晚於 ${time[0]}`
				} else if (time_type == 'early') {
					time_string = `早於 ${time[0]}`
				} else if (time_type == 'duration') {
					time_string = `${time[0]} ~ ${time[1]}`
				}

				if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(time[0])) {
					time_unix = Math.round(new Date(time) / 1000)
				} else if (/^\d{4}-\d{2}-\d{2}$/.test(time[0])) {
					time_unix = Math.round(new Date(time) / 1000)
				} else if (time[1] && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(time[1])) {
					time_unix_2 = Math.round(new Date(time[1]) / 1000)
				} else if (time[1] && /^\d{4}-\d{2}-\d{2}$/.test(time[1])) {
					time_unix_2 = Math.round(new Date(time[1]) / 1000)
				}
			}

			const client = interaction.client;
			const user_data = (await get_user_data_from_dc(String(interaction.member.id)))[0]
			let user_uuid = undefined
			if (user_data.player_uuid) user_uuid = user_data.player_uuid

			const player_role = orderStrings(await getPlayerRole(player_uuid), roles)
			const user_role = orderStrings(await getPlayerRole(user_uuid), roles)

			let total_win = 0
			let total_coin_win = 0
			let total_bet = 0
			let total_coin_bet = 0
			let total_bet_count = 0
			let total_coin_bet_count = 0

			for (const record of pay_history) {
				if (interaction.options.getString(time_type)) {
					if (time_type == 'late' && record.time < time_unix) continue
					if (time_type == 'early' && record.time > time_unix) continue
				}
				if (interaction.options.getInteger('amount-bigger-than') && record.amount <= interaction.options.getInteger('amount-bigger-than')) continue
				if (interaction.options.getInteger('amount-smaller-than') && record.amount >= interaction.options.getInteger('amount-smaller-than')) continue
				if (interaction.options.getInteger('amount-equal') && record.amount != interaction.options.getInteger('amount-equal')) continue
				if (time_type == 'duration' && (record.time < time_unix || record.time > time_unix_2)) continue
				if (record.bet_type == 'emerald') {
					total_bet += record.amount
					total_win += record.win
					total_bet_count += 1
				} else if (record.bet_type == 'coin') {
					total_coin_bet += record.amount
					total_coin_win += record.win
					total_coin_bet_count += 1
				}
			}

			let amount_string = '';
			if (interaction.options.getInteger('amount-bigger-than')) {
				if (amount_string != '') amount_string += ' 且\n'
				amount_string += `大於 ${interaction.options.getInteger('amount-bigger-than')}`
			};
			if (interaction.options.getInteger('amount-smaller-than')) {
				if (amount_string != '') amount_string += ' 且\n'
				amount_string += `小於 ${interaction.options.getInteger('amount-smaller-than')}`
			};
			if (interaction.options.getInteger('amount-equal')) {
				if (amount_string != '') amount_string += ' 且\n'
				amount_string += `等於 ${interaction.options.getInteger('amount-equal')}`
			};
			if (amount_string == '') amount_string = '無金額限制'
			
			let player_id = await get_player_name(player_uuid)
			if (interaction.options.getString('playerid') == '所有人') {
				player_id = '所有人'
			}

			if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.advanced == true) {
				if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.others == false) player_uuid = user_uuid
				let betAmount = `下注金額: ${total_bet}`;
				let betTimes = `下注次數: ${total_bet_count}`;
				let winAmount = `贏得金額: ${total_win}`; 
				let totalProfitLoss = `總盈虧: ${total_bet - total_win}`;

				const maxLength = Math.max(betAmount.length, betTimes.length, winAmount.length, totalProfitLoss.length);

				betAmount = betAmount.padStart(maxLength);
				betTimes = betTimes.padStart(maxLength); 
				winAmount = winAmount.padStart(maxLength);
				totalProfitLoss = totalProfitLoss.padStart(maxLength);

				let cbetAmount = `下注金額: ${total_coin_bet}`;
				let cbetTimes = `下注次數: ${total_coin_bet_count}`;
				let cwinAmount = `贏得金額: ${total_coin_win}`; 
				let ctotalProfitLoss = `總盈虧: ${total_coin_bet - total_coin_win}`;

				const cmaxLength = Math.max(cbetAmount.length, cbetTimes.length, cwinAmount.length, ctotalProfitLoss.length);

				cbetAmount = cbetAmount.padStart(cmaxLength);
				cbetTimes = cbetTimes.padStart(cmaxLength); 
				cwinAmount = cwinAmount.padStart(cmaxLength);
				ctotalProfitLoss = ctotalProfitLoss.padStart(cmaxLength);

				let image_url = `https://minotar.net/helm/${player_uuid}/64.png`
				if (interaction.options.getString('playerid') == '所有人') {
					image_url = 'https://media.discordapp.net/attachments/1204073077453885490/1204756380129427556/Rainbow_Wool_29.webp'
				}
				await fetch(image_url)

				const embed = await bet_record(
					player_id,
					await (async () => {
						try {
							if(!player_data.discord_id || player_data.discord_id === '0') {
								return '尚未綁定';  
							}
							const user = await client.users.fetch(player_data.discord_id);
							return user.username;
						} catch(err) {
							return '擷取失敗'; 
						}
					})(),
					interaction.guild.name,
					player_uuid,
					time_string,
					amount_string,
					`${betAmount} | ${betTimes} \n${winAmount} | ${totalProfitLoss}`,
					`${cbetAmount} | ${cbetTimes} \n${cwinAmount} | ${ctotalProfitLoss}`,
					image_url
				)
				
				await interaction.editReply({ embeds: [embed] });
			} else if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.others == true) {
				if (user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.me == false && player_uuid == user_uuid) {
					interaction.editReply('no permission')
					return
				}

				let image_url = `https://minotar.net/helm/${player_uuid}/64.png`
				if (interaction.options.getString('playerid') == '所有人') {
					image_url = 'https://media.discordapp.net/attachments/1204073077453885490/1204756380129427556/Rainbow_Wool_29.webp'
				}
				await fetch(image_url)
				
				const embed = await bet_record(
					player_id,
					await (async () => {
						try {
							if(!player_data.discord_id || player_data.discord_id === '0') {
								return '尚未綁定';  
							}
							const user = await client.users.fetch(player_data.discord_id);
							return user.username;
						} catch(err) {
							return '擷取失敗'; 
						}
					})(),
					interaction.guild.name,
					player_uuid,
					time_string,
					amount_string,
					`下注金額: ${total_bet} | 下注次數: ${total_bet_count}`,
					`下注金額: ${total_coin_bet} | 下注次數: ${total_coin_bet_count}`,
					image_url
				)
			
				await interaction.editReply({ embeds: [embed] });
			} else {
				let player_uuid = (await get_user_data_from_dc(String(interaction.member.id)))[0].player_uuid
				if (interaction.options.getString('playerid') == '所有人') {
					await interaction.editReply('找不到玩家');
					return;
				}
				
				if (player_data == 'Not Found' || String(player_data).startsWith('error')) {
					await interaction.editReply('找不到玩家');
					return;
				} else if (player_uuid == 'Not Found' || String(player_uuid).startsWith('error') || player_uuid == undefined) {
					await interaction.editReply('請先綁定您的帳號');
					return;
				} else if (user_data && roles[await getPlayerRole(user_uuid)] && roles[await getPlayerRole(user_uuid)].record_settings.me == false && player_uuid == user_uuid) {
					interaction.editReply('no permission')
					return
				} else if (await get_player_uuid(player_id) != player_uuid) {
					interaction.editReply('您無權限查詢其他玩家的紀錄')
					return
				}

				let image_url = `https://minotar.net/helm/${player_uuid}/64.png`
				if (interaction.options.getString('playerid') == '所有人') {
					image_url = 'https://media.discordapp.net/attachments/1204073077453885490/1204756380129427556/Rainbow_Wool_29.webp'
				}
				await fetch(image_url)
				
				const embed = await bet_record(
					player_id,
					await (async () => {
						try {
							if(!player_data.discord_id || player_data.discord_id === '0') {
								return '尚未綁定';  
							}
							const user = await client.users.fetch(player_data.discord_id);
							return user.username;
						} catch(err) {
							return '擷取失敗'; 
						}
					})(),
					interaction.guild.name,
					player_uuid,
					time_string,
					amount_string,
					`下注金額: ${total_bet} | 下注次數: ${total_bet_count}`,
					`下注金額: ${total_coin_bet} | 下注次數: ${total_coin_bet_count}`,
					image_url
				)
			
				await interaction.editReply({ embeds: [embed] });
			}
		}
	},
};