const { SlashCommandBuilder } = require('discord.js');
const { get_user_data, get_all_bet_record, get_all_players, get_bet_record } = require(`../utils/database.js`);
const { get_player_uuid, get_player_name } = require(`../utils/get_player_info.js`);
const { bet_record } = require(`../discord/embed.js`);
const fs = require('fs');
const toml = require('toml');
const Logger = require('../utils/logger.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('record')
		.setNameLocalizations({
			"en-US": "record",
			"zh-TW": "查詢資料"
		})
		.setDescription('Check betting records')
		.setDescriptionLocalizations({
			"en-US": "Check betting records",
			"zh-TW": "查詢資料"
		})
		.setDMPermission(false)
		.addStringOption(option =>
			option.setName('playerid')
				.setAutocomplete(true)
				.setRequired(true)
				.setNameLocalizations({
					"en-US": "playerid",
					"zh-TW": "玩家名稱"
				})
				.setDescription('the player ID you want to query')
				.setDescriptionLocalizations({
					"en-US": "the player ID you want to query",
					"zh-TW": "您欲查詢的玩家 ID"
				})
		)
		.addStringOption(option =>
			option.setName('late')
				.setNameLocalizations({
					"en-US": "late",
					"zh-TW": "晚於"
				})
				.setDescription('Specify the earliest time to include')
				.setDescriptionLocalizations({
					"en-US": "Specify the earliest time to include, format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD",
					"zh-TW": "時間需晚於，格式為 YYYY-MM-DD HH:MM:SS 或 YYYY-MM-DD"
				})
		)
		.addStringOption(option =>
			option.setName('early')
				.setNameLocalizations({
					"en-US": "early",
					"zh-TW": "早於"
				})
				.setDescription('Specify the latest time to include')
				.setDescriptionLocalizations({
					"en-US": "Specify the latest time to include, format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD",
					"zh-TW": "時間需早於，格式為 YYYY-MM-DD HH:MM:SS 或 YYYY-MM-DD"
				})
		)
		.addStringOption(option =>
			option.setName('duration')
				.setNameLocalizations({
					"en-US": "duration",
					"zh-TW": "期間"
				})
				.setDescription('Specify the time period to search')
				.setDescriptionLocalizations({
					"en-US": "The time period to search, format: YYYY-MM-DD HH:MM:SS~YYYY-MM-DD HH:MM:SS or YYYY-MM-DD~YYYY-MM-DD",
					"zh-TW": "時間需在期間內，格式為 YYYY-MM-DD HH:MM:SS~YYYY-MM-DD HH:MM:SS 或 YYYY-MM-DD~YYYY-MM-DD"
				})
		)
		.addIntegerOption(option =>
			option.setName('amount-bigger-than')
				.setNameLocalizations({
					"en-US": "amount-bigger-than",
					"zh-TW": "大於"
				})
				.setDescription('Minimum amount to filter')
				.setDescriptionLocalizations({
					"en-US": "Minimum amount to filter",
					"zh-TW": "金額需大於"
				})
		)
		.addIntegerOption(option =>
			option.setName('amount-smaller-than')
				.setNameLocalizations({
					"en-US": "amount-smaller-than",
					"zh-TW": "小於"
				})
				.setDescription('Maximum amount to filter')
				.setDescriptionLocalizations({
					"en-US": "Maximum amount to filter",
					"zh-TW": "金額需小於"
				})
		)
		.addIntegerOption(option =>
			option.setName('amount-equal')
				.setNameLocalizations({
					"en-US": "amount-equal",
					"zh-TW": "等於"
				})
				.setDescription('Exact amount to match')
				.setDescriptionLocalizations({
					"en-US": "Exact amount to match",
					"zh-TW": "金額需等於"
				})
		)
		.addBooleanOption(option =>
			option.setName('public')
				.setNameLocalizations({
					"en-US": "public",
					"zh-TW": "公開"
				})
				.setDescription('Make results visible to others')
				.setDescriptionLocalizations({
					"en-US": "Make results visible to others",
					"zh-TW": "是否讓您的結果公開"
				})
		),
    async autocomplete(interaction) {
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
        let focused_value = ''
        let results = []
        let result = []

        try {
            focused_value = interaction.options.getFocused().toLowerCase()

            let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/data/roles.json`, 'utf8'));
            const user_roles = roles[interaction.client.guilds.cache.get(configtoml.discord.guild_id).members.cache.get(interaction.member.id).roles.cache.map(role => role.id).filter((role) => {
                if (Object.keys(roles).includes(role)) return true
                else return false
            })[0]]

            const user_player_uuid = await get_user_data(undefined, interaction.member.id)

            const user_player_name = await get_player_name(user_player_uuid.player_uuid)

            if ((!configtoml.minecraft.whitelist.includes(user_player_name.toLowerCase()) && !configtoml.minecraft.whitelist.includes(user_player_name)) && (!user_roles || !user_roles.record_settings.others)) {
                if (user_player_name.toLowerCase() != 'undefined' && user_player_name != 'Unexpected Error' && (focused_value.startsWith(user_player_name.toLowerCase()) || focused_value == '')) {
                    await interaction.respond([{ name: user_player_name, value: user_player_name }])
                    return
                } else {
                    await interaction.respond([{ name: '找不到玩家資料', value: '找不到玩家資料' }])
                    return
                }
            }

            // 這個會返回一堆 Discord ID ，有個白癡以為這是玩家 ID
            // 後來改成返回玩家 ID 了
            let players = await get_all_players()
            // 轉成玩家 ID，希望不要被 Mojang 429

            players = players.filter(player => player && player != 'Not Found' && player != 'Unexpected Error')

            if (players == 'Not Found' || players == 'Unexpected Error' || players == undefined || players.length == 0) {
                await interaction.respond([{ name: '找不到玩家資料', value: '找不到玩家資料' }])
                return
            }

            if ((configtoml.minecraft.whitelist.includes(user_player_name.toLowerCase()) || configtoml.minecraft.whitelist.includes(user_player_name)) || user_roles.record_settings.others) {
                results.push({
                    name: '所有人',
                    value: '所有人'
                })
            }

            result = players.filter(player => player.toLowerCase().startsWith(focused_value))
            
            results.push(...result.map(player => {
                return {
                    name: player,
                    value: player
                }   
            }))

            interaction.respond(results.slice(0, 25)).catch((e) => {Logger.error(e)})
        } catch (e) {
            Logger.error(e)
            interaction.respond([{ name: '查詢玩家資料時發生錯誤', value: '查詢玩家資料時發生錯誤' }]).catch(() => {})
        }
    },
	async execute(interaction) {
		await handleInteraction(interaction);
	},
};

const configtoml = loadConfig();
const roles = loadRoles();

async function handleInteraction(interaction) {
	const isPublic = interaction.options.getBoolean('public');
	await interaction.deferReply({ ephemeral: !isPublic });

	if (!interaction.member) {
		await interaction.editReply('請在伺服器中使用此指令');
		return;
	}

	const playerId = interaction.options.getString('playerid');
	const playerUuid = await getPlayerUuid(playerId);

	if (playerId !== '所有人' && playerUuid === 'Not Found') {
		await interaction.editReply('找不到玩家');
		return;
	}

	const payHistory = await getPayHistory(playerId, playerUuid);
	const playerData = await getUserData(playerUuid);
	const playerDataDiscord = await getUserData(undefined, interaction.member.id);

	if (payHistory.length === 0) {
		await interaction.editReply('找不到紀錄');
		return;
	}

	if (playerId !== '所有人' && (playerData === 'Not Found' || playerDataDiscord === 'Not Found')) {
		await interaction.editReply('請先綁定您的帳號');
		return;
	}

	const timeType = await getTimeType(interaction);
	const { timeString, timeUnix, timeUnix2 } = await getTimeDetails(interaction, timeType);
	const amountString = getAmountString(interaction);

	const { totalBet, totalCoinBet, totalBetCount, totalCoinBetCount, totalWin, totalCoinWin } = calculateBetDetails(payHistory, interaction, timeType, timeUnix, timeUnix2);

	const playerName = await getPlayerName(playerUuid);
	const imageUrl = getImageUrl(playerId, playerUuid);
	const embed = await createEmbed(interaction, playerName, playerUuid, timeString, amountString, totalBet, totalCoinBet, totalBetCount, totalCoinBetCount, totalWin, totalCoinWin, imageUrl);

	await interaction.editReply({ embeds: [embed] });
}

function loadConfig() {
    return toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
}

function loadRoles() {
	return JSON.parse(fs.readFileSync(`${process.cwd()}/data/roles.json`, 'utf8'));
}

async function getPlayerUuid(playerId) {
	if (playerId === '所有人') {
		return '所有人';
	}
	return await get_player_uuid(playerId);
}

async function getPayHistory(playerId, playerUuid) {
	if (playerId === '所有人') {
		return await get_all_bet_record();
	}
	return await get_bet_record(playerUuid);
}

async function getUserData(playerUuid, discordId) {
	return await get_user_data(playerUuid, discordId);
}

async function getTimeType(interaction) {
	const timeTypes = ['late', 'early', 'duration'];
	for (const type of timeTypes) {
		if (interaction.options.getString(type)) {
			return type;
		}
	}
	return 'none';
}

async function getTimeDetails(interaction, timeType) {
	let timeString = '無範圍限制';
	let timeUnix, timeUnix2;

	if (interaction.options.getString(timeType)) {
		const time = interaction.options.getString(timeType).split('~');
		timeString = getTimeString(timeType, time);
		timeUnix = getTimeUnix(time[0]);
		timeUnix2 = time[1] ? getTimeUnix(time[1]) : null;
	}

	return { timeString, timeUnix, timeUnix2 };
}

function getTimeString(timeType, time) {
	if (timeType === 'late') {
		return `晚於 ${time[0]}`;
	} else if (timeType === 'early') {
		return `早於 ${time[0]}`;
	} else if (timeType === 'duration') {
		return `${time[0]} ~ ${time[1]}`;
	}
	return '無範圍限制';
}

function getTimeUnix(time) {
	if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(time)) {
		return Math.round(new Date(`${time} UTC+8`) / 1000);
	} else if (/^\d{4}-\d{2}-\d{2}$/.test(time)) {
		return Math.round(new Date(`${time} UTC+8`) / 1000);
	}
	return null;
}

function getAmountString(interaction) {
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

	return amount_string;
}

function calculateBetDetails(payHistory, interaction, timeType, timeUnix, timeUnix2) {
	let totalBet = 0;
	let totalCoinBet = 0;
	let totalBetCount = 0;
	let totalCoinBetCount = 0;
	let totalWin = 0;
	let totalCoinWin = 0;

	for (const record of payHistory) {
		if (shouldSkipRecord(record, interaction, timeType, timeUnix, timeUnix2)) {
			continue;
		}
		if (record.bet_type === 'emerald' || record.bet_type === 'e') {
			totalBet += record.amount;
			totalWin += record.result_amount;
			totalBetCount += 1;
		} else if (record.bet_type === 'coin' || record.bet_type === 'c') {
			totalCoinBet += record.amount;
			totalCoinWin += record.result_amount;
			totalCoinBetCount += 1;
		}
	}

	return { totalBet, totalCoinBet, totalBetCount, totalCoinBetCount, totalWin, totalCoinWin };
}

function shouldSkipRecord(record, interaction, timeType, timeUnix, timeUnix2) {
	if (timeType === 'late' && record.time < timeUnix) return true;
	if (timeType === 'early' && record.time > timeUnix) return true;
	if (timeType === 'duration' && (record.time < timeUnix || record.time > timeUnix2)) return true;
	if (interaction.options.getInteger('amount-bigger-than') && record.amount <= interaction.options.getInteger('amount-bigger-than')) return true;
	if (interaction.options.getInteger('amount-smaller-than') && record.amount >= interaction.options.getInteger('amount-smaller-than')) return true;
	if (interaction.options.getInteger('amount-equal') && record.amount !== interaction.options.getInteger('amount-equal')) return true;
	return false;
}

async function getPlayerName(playerUuid) {
    if (playerUuid === '所有人') {
        return '所有人';
    }
	return await get_player_name(playerUuid);
}

function getImageUrl(playerId, playerUuid) {
	if (playerId === '所有人') {
		return 'https://media.discordapp.net/attachments/1204073077453885490/1204756380129427556/Rainbow_Wool_29.webp';
	}
	return `https://minotar.net/helm/${playerUuid}/64.png`;
}

async function createEmbed(interaction, playerName, playerUuid, timeString, amountString, totalBet, totalCoinBet, totalBetCount, totalCoinBetCount, totalWin, totalCoinWin, imageUrl) {
	const client = interaction.client;
	const guild = await client.guilds.fetch(configtoml.discord.guild_id);
	const member = await guild.members.fetch(interaction.member.id);
	const userData = await getUserData(undefined, interaction.member.id);
	const userRole = member.roles.cache.map(role => role.id).filter(role => Object.keys(roles).includes(role));

	const discordUsername = await getDiscordUsername(userData, client);

	const embed = await bet_record(
		playerName,
		discordUsername,
		interaction.guild.name,
		playerUuid,
		timeString,
		amountString,
		formatBetDetails(totalBet, totalBetCount, totalWin),
		formatBetDetails(totalCoinBet, totalCoinBetCount, totalCoinWin),
		imageUrl
	);

	return embed;
}

async function getDiscordUsername(userData, client) {
	if (!userData.discord_id || userData.discord_id === '0') {
		return '尚未綁定';
	}
	try {
		const user = await client.users.fetch(userData.discord_id);
		return user.username;
	} catch (err) {
		return '擷取失敗';
	}
}

function formatBetDetails(totalBet, totalBetCount, totalWin) {
	const betAmount = `下注金額: ${totalBet}`;
	const betTimes = `下注次數: ${totalBetCount}`;
	const winAmount = `贏得金額: ${totalWin}`;
	const totalProfitLoss = `賭場盈虧: ${totalBet - totalWin}`;

	const maxLength = Math.max(betAmount.length, betTimes.length, winAmount.length, totalProfitLoss.length);

	return `${betAmount.padStart(maxLength)} | ${betTimes.padStart(maxLength)} \n${winAmount.padStart(maxLength)} | ${totalProfitLoss.padStart(maxLength)}`;
}
