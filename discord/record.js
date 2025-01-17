const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { get_user_data, get_all_bet_record, get_bet_record } = require(`../utils/database.js`);
const { get_player_uuid, get_player_name } = require(`../utils/get_player_info.js`);
const { bet_record } = require(`../discord/embed.js`);
const fetch = require("node-fetch");
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('record')
		.setNameLocalizations({
			"en-US": "record",
			"zh-TW": "查詢資料"
		})
		.setDescription('check bet record')
		.setDescriptionLocalizations({
			"en-US": "check bet record",
			"zh-TW": "查詢資料"
		})
		.setContexts(['GUILD'])
		.addStringOption(option =>
			option.setName('playerid')
				.setAutocomplete(true)
				.setRequired(true)
				.setNameLocalizations({
					"en-US": "playerid",
					"zh-TW": "玩家名稱"
				})
				.setDescription('The player ID you want to query')
				.setDescriptionLocalizations({
					"en-US": "The player ID you want to query",
					"zh-TW": "您欲查詢的玩家 ID"
				})
		)
		.addStringOption(option =>
			option.setName('late')
				.setNameLocalizations({
					"en-US": "late",
					"zh-CN": "vdfv简体中文",
					"zh-TW": "晚於"
				})
				.setDescription('time must late than')
				.setDescriptionLocalizations({
					"en-US": "time must late than",
					"zh-TW": "時間需晚於"
				})
		)
		.addStringOption(option =>
			option.setName('early')
				.setNameLocalizations({
					"en-US": "early",
					"zh-TW": "早於"
				})
				.setDescription('time must early than')
				.setDescriptionLocalizations({
					"en-US": "time must early than",
					"zh-TW": "時間需早於"
				})
		)
		.addStringOption(option =>
			option.setName('duration')
				.setNameLocalizations({
					"en-US": "duration",
					"zh-TW": "期間"
				})
				.setDescription('time must in the')
				.setDescriptionLocalizations({
					"en-US": "time must early than",
					"zh-TW": "時間需在期間內"
				})
		)
		.addIntegerOption(option =>
			option.setName('amount-bigger-than')
				.setNameLocalizations({
					"en-US": "amount-bigger-than",
					"zh-TW": "大於"
				})
				.setDescription('amount must bigger than')
				.setDescriptionLocalizations({
					"en-US": "amount must bigger than",
					"zh-TW": "金額需大於"
				})
		)
		.addIntegerOption(option =>
			option.setName('amount-smaller-than')
				.setNameLocalizations({
					"en-US": "amount-smaller-than",
					"zh-TW": "小於"
				})
				.setDescription('amount must smaller than')
				.setDescriptionLocalizations({
					"en-US": "amount must smaller than",
					"zh-TW": "金額需小於"
				})
		)
		.addIntegerOption(option =>
			option.setName('amount-equal')
				.setNameLocalizations({
					"en-US": "amount-equal",
					"zh-TW": "等於"
				})
				.setDescription('amount must equal to')
				.setDescriptionLocalizations({
					"en-US": "amount must equal to",
					"zh-TW": "金額需等於"
				})
		)
		.addBooleanOption(option =>
			option.setName('public')
				.setNameLocalizations({
					"en-US": "public",
					"zh-TW": "公開"
				})
				.setDescription('public or not')
				.setDescriptionLocalizations({
					"en-US": "public or not",
					"zh-TW": "是否讓您的結果公開"
				}),
		),

	async execute(interaction) {
		const isPublic = interaction.options.getBoolean('public');
		await interaction.deferReply({ ephemeral: !isPublic });

		if (!interaction.member) {
			await interaction.editReply('請在伺服器中使用此指令');
			return;
		}

		const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
		const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));
		let player_uuid = interaction.options.getString('playerid') === '所有人' ? '所有人' : await get_player_uuid(interaction.options.getString('playerid'));

		if (player_uuid === 'Not Found' || String(player_uuid).startsWith('Unexpected Error')) {
			await interaction.editReply('找不到玩家');
			return;
		}

		const pay_history = player_uuid === '所有人' ? await get_all_bet_record() : await get_bet_record(player_uuid);
		const player_data = await get_user_data(player_uuid);
		const player_data_dc = await get_user_data(undefined, String(interaction.member.id));

		if (pay_history.length === 0) {
			await interaction.editReply('找不到紀錄');
			return;
		}

		if (player_uuid !== '所有人' && (player_data === 'Not Found' || String(player_data).startsWith('Unexpected Error'))) {
			if (player_data_dc === 'Not Found' || String(player_data_dc).startsWith('Unexpected Error')) {
				await interaction.editReply('請先綁定您的帳號');
			} else {
				await interaction.editReply('找不到指定的玩家，請確認 ID 是否正確');
			}
			return;
		}

		const time_type = await determineTimeType(interaction);
		const { time_string, time_unix, time_unix_2 } = await parseTime(interaction, time_type);

		const { total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count } = calculateTotals(pay_history, interaction, time_type, time_unix, time_unix_2);

		const amount_string = buildAmountString(interaction);
		const player_id = player_uuid === '所有人' ? '所有人' : await get_player_name(player_uuid);

		const { user_uuid, user_data, user_role } = await getUserDetails(interaction, config, roles);

		if (hasAdvancedPermissions(config, roles, user_data, user_role)) {
			await handleAdvancedPermissions(interaction, config, roles, user_data, user_role, player_uuid, player_id, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string);
		} else if (hasOthersPermissions(config, roles, user_data, user_role)) {
			await handleOthersPermissions(interaction, config, roles, user_data, user_role, player_uuid, player_id, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string);
		} else {
			await handleNoPermissions(interaction, player_uuid, player_id, player_data, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string);
		}
	},
};

async function determineTimeType(interaction) {
	const time_type = ['late', 'early', 'duration'];
	return new Promise(async (resolve) => {
		for (let item of time_type) {
			const time_item = interaction.options.getString(item);
			if (time_item) {
				resolve(item);
			}
		}
		resolve('none');
	});
}

async function parseTime(interaction, time_type) {
	let time_string = '無範圍限制';
	let time_unix, time_unix_2;

	if (interaction.options.getString(time_type)) {
		let time = interaction.options.getString(time_type).split('~');

		if (time_type === 'late') {
			time_string = `晚於 ${time[0]}`;
		} else if (time_type === 'early') {
			time_string = `早於 ${time[0]}`;
		} else if (time_type === 'duration') {
			time_string = `${time[0]} ~ ${time[1]}`;
		}

		if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(time[0])) {
			time_unix = Math.round(new Date(time) / 1000) - 54400;
		} else if (/^\d{4}-\d{2}-\d{2}$/.test(time[0])) {
			time_unix = Math.round(new Date(time) / 1000) - 54400;
		} else if (time[1] && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(time[1])) {
			time_unix_2 = Math.round(new Date(time[1]) / 1000) - 54400;
		} else if (time[1] && /^\d{4}-\d{2}-\d{2}$/.test(time[1])) {
			time_unix_2 = Math.round(new Date(time[1]) / 1000) - 54400;
		}
	}

	return { time_string, time_unix, time_unix_2 };
}

function calculateTotals(pay_history, interaction, time_type, time_unix, time_unix_2) {
	let total_win = 0;
	let total_coin_win = 0;
	let total_bet = 0;
	let total_coin_bet = 0;
	let total_bet_count = 0;
	let total_coin_bet_count = 0;

	for (const record of pay_history) {
		if (interaction.options.getString(time_type)) {
			if (time_type === 'late' && record.time < time_unix) continue;
			if (time_type === 'early' && record.time > time_unix) continue;
		}
		if (interaction.options.getInteger('amount-bigger-than') && record.amount <= interaction.options.getInteger('amount-bigger-than')) continue;
		if (interaction.options.getInteger('amount-smaller-than') && record.amount >= interaction.options.getInteger('amount-smaller-than')) continue;
		if (interaction.options.getInteger('amount-equal') && record.amount != interaction.options.getInteger('amount-equal')) continue;
		if (time_type === 'duration' && (record.time < time_unix || record.time > time_unix_2)) continue;
		if (record.bet_type === 'emerald') {
			total_bet += record.amount;
			total_win += record.result_amount;
			total_bet_count += 1;
		} else if (record.bet_type === 'coin') {
			total_coin_bet += record.amount;
			total_coin_win += record.result_amount;
			total_coin_bet_count += 1;
		}
	}

	return { total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count };
}

function buildAmountString(interaction) {
	let amount_string = '';
	if (interaction.options.getInteger('amount-bigger-than')) {
		amount_string += `大於 ${interaction.options.getInteger('amount-bigger-than')}`;
	}
	if (interaction.options.getInteger('amount-smaller-than')) {
		if (amount_string !== '') amount_string += ' 且\n';
		amount_string += `小於 ${interaction.options.getInteger('amount-smaller-than')}`;
	}
	if (interaction.options.getInteger('amount-equal')) {
		if (amount_string !== '') amount_string += ' 且\n';
		amount_string += `等於 ${interaction.options.getInteger('amount-equal')}`;
	}
	if (amount_string === '') amount_string = '無金額限制';
	return amount_string;
}

async function getUserDetails(interaction, config, roles) {
	const client = interaction.client;
	const guild = await client.guilds.fetch(config.discord.guild_id);
	const member = await guild.members.fetch(interaction.member.id);
	const user_data = await get_user_data(undefined, String(interaction.member.id));
	const user_role = (await member).roles.cache.map(role => role.id).filter((role) => Object.keys(roles).includes(role));
	let user_uuid = user_data.player_uuid;
	return { user_uuid, user_data, user_role };
}

function hasAdvancedPermissions(config, roles, user_data, user_role) {
	return config.whitelist.includes((get_player_name(user_data.player_uuid)).toLowerCase()) ||
		config.whitelist.includes(get_player_name(user_data.player_uuid)) ||
		(user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.advanced === true);
}

function hasOthersPermissions(config, roles, user_data, user_role) {
	return config.whitelist.includes((get_player_name(user_data.player_uuid)).toLowerCase()) ||
		config.whitelist.includes(get_player_name(user_data.player_uuid)) ||
		(user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.others === true);
}

async function handleAdvancedPermissions(interaction, config, roles, user_data, user_role, player_uuid, player_id, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string) {
	if ((!config.whitelist.includes((get_player_name(player_uuid)).toLowerCase()) && !config.whitelist.includes(get_player_name(player_uuid))) && user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.others === false) {
		player_uuid = user_uuid;
	}
	const embed = await createEmbed(interaction, player_id, player_uuid, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string, true);
	await interaction.editReply({ embeds: [embed] });
}

async function handleOthersPermissions(interaction, config, roles, user_data, user_role, player_uuid, player_id, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string) {
	if ((!config.whitelist.includes((get_player_name(player_uuid)).toLowerCase()) && !config.whitelist.includes(get_player_name(player_uuid))) && user_data && roles[user_role[0]] && roles[user_role[0]].record_settings.me === false && player_uuid === user_uuid) {
		await interaction.editReply('您無權限查詢自己的紀錄');
		return;
	}
	const embed = await createEmbed(interaction, player_id, player_uuid, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string, false);
	await interaction.editReply({ embeds: [embed] });
}

async function handleNoPermissions(interaction, player_uuid, player_id, player_data, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string) {
	if (player_id === '所有人') {
		await interaction.editReply('找不到玩家');
		return;
	}

	if (player_data === 'Not Found' || String(player_data).startsWith('Unexpected Error')) {
		await interaction.editReply('找不到玩家');
		return;
	} else if (player_uuid === 'Not Found' || String(player_uuid).startsWith('Unexpected Error') || player_uuid === undefined) {
		await interaction.editReply('請先綁定您的帳號');
		return;
	} else if (await get_player_uuid(player_id) !== player_uuid) {
		await interaction.editReply('您無權限查詢其他玩家的紀錄');
		return;
	}

	const embed = await createEmbed(interaction, player_id, player_uuid, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string, false);
	await interaction.editReply({ embeds: [embed] });
}

async function createEmbed(interaction, player_id, player_uuid, total_win, total_coin_win, total_bet, total_coin_bet, total_bet_count, total_coin_bet_count, time_string, amount_string, isAdvanced) {
	const client = interaction.client;
	const player_data = await get_user_data(player_uuid);
	let image_url = player_uuid === '所有人' ? 'https://media.discordapp.net/attachments/1204073077453885490/1204756380129427556/Rainbow_Wool_29.webp' : `https://minotar.net/helm/${player_uuid}/64.png`;
	await fetch(image_url);

	const betAmount = `下注金額: ${total_bet}`;
	const betTimes = `下注次數: ${total_bet_count}`;
	const winAmount = `贏得金額: ${total_win}`;
	const totalProfitLoss = `賭場盈虧: ${total_bet - total_win}`;

	const maxLength = Math.max(betAmount.length, betTimes.length, winAmount.length, totalProfitLoss.length);

	const cbetAmount = `下注金額: ${total_coin_bet}`;
	const cbetTimes = `下注次數: ${total_coin_bet_count}`;
	const cwinAmount = `贏得金額: ${total_coin_win}`;
	const ctotalProfitLoss = `賭場盈虧: ${total_coin_bet - total_coin_win}`;

	const cmaxLength = Math.max(cbetAmount.length, cbetTimes.length, cwinAmount.length, ctotalProfitLoss.length);

	const embed = await bet_record(
		player_id,
		await (async () => {
			try {
				if (!player_data.discord_id || player_data.discord_id === '0') {
					return '尚未綁定';
				}
				const user = await client.users.fetch(player_data.discord_id);
				return user.username;
			} catch (err) {
				return '擷取失敗';
			}
		})(),
		interaction.guild.name,
		player_uuid,
		time_string,
		amount_string,
		isAdvanced ? `${betAmount.padStart(maxLength)} | ${betTimes.padStart(maxLength)} \n${winAmount.padStart(maxLength)} | ${totalProfitLoss.padStart(maxLength)}` : `下注金額: ${total_bet} | 下注次數: ${total_bet_count}`,
		isAdvanced ? `${cbetAmount.padStart(cmaxLength)} | ${cbetTimes.padStart(cmaxLength)} \n${cwinAmount.padStart(cmaxLength)} | ${ctotalProfitLoss.padStart(cmaxLength)}` : `下注金額: ${total_coin_bet} | 下注次數: ${total_coin_bet_count}`,
		image_url
	);

	return embed;
}
