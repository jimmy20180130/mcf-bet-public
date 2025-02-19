const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { get_user_data, get_all_bet_record, get_all_players, get_bet_record } = require(`../utils/database.js`);
const { get_player_uuid, get_player_name } = require(`../utils/get_player_info.js`);
const { bet_record } = require(`../discord/embed.js`);
const fs = require('fs');
const toml = require('toml');
const Logger = require('../utils/logger.js');
const TIME_FILTER_TYPES = ['late', 'early', 'duration'];
const AMOUNT_FILTERS = ['amount-bigger-than', 'amount-smaller-than', 'amount-equal'];
const DEFAULT_AVATAR_URL = 'https://minotar.net/helm/Steve/64.png';

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
        .setContexts(InteractionContextType.Guild)
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
        let focused_value = interaction.options.getFocused().toLowerCase();
        let results = [];
        let result = [];

        try {
            let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/data/roles.json`, 'utf8'));
            const user_roles = roles[interaction.client.guilds.cache.get(configtoml.discord.guild_id).members.cache.get(interaction.member.id).roles.cache.map(role => role.id).filter((role) => {
                if (Object.keys(roles).includes(role)) return true
                else return false
            })[0]]

            const user_player_uuid = await get_user_data(undefined, interaction.member.id)
            const user_player_name = await get_player_name(user_player_uuid.player_uuid)

            if ((!configtoml.minecraft.whitelist.includes(user_player_name.toLowerCase()) && !configtoml.minecraft.whitelist.includes(user_player_name)) && (!user_roles || !user_roles.record_settings.others)) {
                if (user_player_name.toLowerCase() != 'undefined' && user_player_name != 'Unexpected Error' && (user_player_name.toLowerCase().startsWith(focused_value.toLowerCase()) || focused_value == '')) {
                    await interaction.respond([{ name: user_player_name, value: user_player_name }])
                    return
                } else {
                    await interaction.respond([{ name: '找不到玩家資料', value: '找不到玩家資料' }])
                    return
                }
            }

            let players = await get_all_players()
            players = players.filter(player => player && player != 'Not Found' && player != 'Unexpected Error')

            if (players == 'Not Found' || players == 'Unexpected Error' || players == undefined || players.length == 0) {
                await interaction.respond([{ name: '找不到玩家資料', value: '找不到玩家資料' }])
                return
            }

            if ((configtoml.minecraft.whitelist.includes(user_player_name.toLowerCase()) || configtoml.minecraft.whitelist.includes(user_player_name)) || user_roles.record_settings.others) {
                results.push({ name: '所有人', value: '所有人' })
            }

            result = players.filter(player => player.toLowerCase().startsWith(focused_value))
            results.push(...result.map(player => { return { name: player, value: player } }))

            await interaction.respond(results.slice(0, 25)).catch((e) => { Logger.error(e) })
        } catch (e) {
            Logger.error(e)
            interaction.respond([{ name: '查詢玩家資料時發生錯誤', value: '查詢玩家資料時發生錯誤' }]).catch(() => { })
        }
    },
    async execute(interaction) {
        try {
            await handleInteraction(interaction);
        } catch (error) {
            console.log(error);
            Logger.error('Error executing record command:', error);
            await interaction.editReply('指令執行時發生錯誤');
        }
    }
};

async function handleInteraction(interaction) {
    const isPublic = interaction.options.getBoolean('public');
    if (!isPublic) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });
    } else {
        await interaction.deferReply();
    }

    if (!interaction.member) {
        await interaction.editReply('請在伺服器中使用此指令');
        return;
    }

    const { config, roles } = await loadConfigurations();
    const playerInput = interaction.options.getString('playerid');
    const { player_uuid, player_id } = await resolvePlayerIdentity(playerInput);

    if (!await validatePlayerExistence(interaction, playerInput, player_uuid)) return;

    const pay_history = await fetchBetHistory(playerInput, player_uuid);
    if (!pay_history.length) {
        await interaction.editReply('找不到紀錄');
        return;
    }

    const { timeFilter, amountFilter } = parseFilters(interaction);
    const stats = calculateStatistics(pay_history, timeFilter, amountFilter);
    const userAccess = await checkUserAccess(interaction, config, roles, player_uuid);

    if (!userAccess.hasAccess) {
        await interaction.editReply(userAccess.message || '您無權限執行此操作');
        return;
    }

    const embed = await buildEmbed(
        interaction,
        player_id,
        player_uuid,
        timeFilter.description,
        amountFilter.description,
        stats,
        userAccess.showDetailedStats
    );

    await interaction.editReply({ embeds: [embed] });
}

// 辅助函数区
async function loadConfigurations() {
    const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
    const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/data/roles.json`, 'utf8'));
    return { config, roles };
}

async function resolvePlayerIdentity(playerInput) {
    const isAllPlayers = playerInput === '所有人';
    const player_uuid = isAllPlayers ? '所有人' : await get_player_uuid(playerInput);
    const player_id = isAllPlayers ? '所有人' : await get_player_name(player_uuid);
    return { player_uuid, player_id };
}

async function validatePlayerExistence(interaction, playerInput, player_uuid) {
    const userData = await get_user_data(undefined, interaction.member.id);
    if (!userData || userData === 'Not Found') {
        await interaction.editReply('請先綁定您的帳號');
        return false;
    }

    if (playerInput !== '所有人' && (player_uuid === 'Not Found' || player_uuid.startsWith('Unexpected Error'))) {
        await interaction.editReply('找不到指定的玩家，請確認 ID 是否正確');
        return false;
    }
    return true;
}

async function fetchBetHistory(playerInput, player_uuid) {
    return playerInput === '所有人'
        ? await get_all_bet_record()
        : await get_bet_record(player_uuid);
}

function parseFilters(interaction) {
    return {
        timeFilter: parseTimeFilter(interaction),
        amountFilter: parseAmountFilter(interaction)
    };
}

function parseTimeFilter(interaction) {
    const timeTypes = ['late', 'early', 'duration'];
    const activeType = timeTypes.find(type => interaction.options.getString(type));
    const timeValue = interaction.options.getString(activeType);

    let description = '無範圍限制';
    let filterFunction = () => true;

    if (timeValue) {
        const [start, end] = timeValue.split('~');
        const startUnix = parseDateTime(start);
        const endUnix = parseDateTime(end);

        switch (activeType) {
            case 'late':
                description = `晚於 ${start}`;
                filterFunction = record => record.time >= startUnix;
                break;
            case 'early':
                description = `早於 ${start}`;
                filterFunction = record => record.time <= startUnix;
                break;
            case 'duration':
                description = `${start} ~ ${end}`;
                filterFunction = record => record.time >= startUnix && record.time <= endUnix;
                break;
        }
    }

    return { description, filterFunction };
}

function parseDateTime(datetime) {
    if (!datetime) return null;
    const date = new Date(datetime + ' UTC+8');
    return Math.round(date.getTime() / 1000)
}

function parseAmountFilter(interaction) {
    const conditions = [];
    let description = '無金額限制';

    const biggerThan = interaction.options.getInteger('amount-bigger-than');
    const smallerThan = interaction.options.getInteger('amount-smaller-than');
    const equalTo = interaction.options.getInteger('amount-equal');

    if (biggerThan !== null) conditions.push(amt => amt > biggerThan);
    if (smallerThan !== null) conditions.push(amt => amt < smallerThan);
    if (equalTo !== null) conditions.push(amt => amt === equalTo);

    if (conditions.length > 0) {
        description = [
            biggerThan && `大於 ${biggerThan}`,
            smallerThan && `小於 ${smallerThan}`,
            equalTo && `等於 ${equalTo}`
        ].filter(Boolean).join(' 且\n');
    }

    return {
        description,
        filterFunction: amount => conditions.every(condition => condition(amount))
    };
}

function calculateStatistics(records, timeFilter, amountFilter) {
    const stats = {
        emerald: { bet: 0, win: 0, count: 0 },
        coin: { bet: 0, win: 0, count: 0 }
    };

    records.forEach(record => {
        if (!timeFilter.filterFunction(record)) return;
        if (!amountFilter.filterFunction(record.amount)) return;

        const type = record.bet_type;
        stats[type].bet += record.amount;
        stats[type].win += record.result_amount;
        stats[type].count++;
    });

    return stats;
}

async function checkUserAccess(interaction, config, roles, targetUuid) {
    const { member } = interaction;
    const userData = await get_user_data(undefined, member.id);
    const userRoles = member.roles.cache.map(role => role.id);

    const isWhitelisted = config.minecraft.whitelist.some(async name =>
        name.toLowerCase() === (await get_player_name(userData?.player_uuid))?.toLowerCase()
    );

    const isSelfQuery = await get_player_name(userData?.player_uuid) === await get_player_name(targetUuid) && await get_player_name(userData?.player_uuid) !== 'Not Found' && await get_player_name(userData?.player_uuid) !== 'Unexpected Error'

    const rolePermissions = roles[userRoles.find(role => roles[role])]?.record_settings || {
        advanced: false,
        me: true,
        others: false
    };

    return {
        hasAccess: isWhitelisted || (rolePermissions.me && isSelfQuery) || (rolePermissions.others && !isSelfQuery),
        showDetailedStats: isWhitelisted || rolePermissions.advanced
    };
}

async function buildEmbed(interaction, playerId, playerUuid, timeDesc, amountDesc, stats, showDetailed) {
    const imageUrl = playerId === '所有人'
        ? 'https://example.com/all-players-image.png'
        : `https://minotar.net/helm/${playerUuid}/64.png`;

    await fetch(imageUrl); // 预加载图片

    return bet_record(
        playerId,
        await resolveDiscordUsername(interaction, playerUuid),
        interaction.guild.name,
        playerUuid,
        timeDesc,
        amountDesc,
        formatStats(stats.emerald, showDetailed),
        formatStats(stats.coin, showDetailed),
        imageUrl
    );
}

async function resolveDiscordUsername(interaction, playerUuid) {
    try {
        const playerData = await get_user_data(playerUuid);
        if (!playerData?.discord_id) return '尚未綁定';
        const user = await interaction.client.users.fetch(playerData.discord_id);
        return user.username;
    } catch {
        return '擷取失敗';
    }
}

function formatStats({ bet, win, count }, showDetailed) {
    if (showDetailed) {
        return [
            `下注金額: ${bet} | 下注次數: ${count}`,
            `贏得金額: ${win} | 賭場盈虧: ${bet - win}`
        ].join('\n');
    }
    return `下注金額: ${bet} | 下注次數: ${count}`;
}