const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { get_user_data, get_all_user_data, get_all_bet_record } = require(`../utils/database.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);
const fs = require('fs')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setNameLocalizations({
            "en-US": "record",
            "zh-TW": "查詢排名"
        })
        .setDescription('check bet record')
        .setDescriptionLocalizations({
            "en-US": "check bet record",
            "zh-TW": "查詢排名"
        })
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('coin_type')
                .setNameLocalizations({
                    "en-US": "coin_type",
                    "zh-TW": "貨幣種類"
                })
                .setDescription('The coin type you want to query')
                .setDescriptionLocalizations({
                    "en-US": "The coin type you want to query",
                    "zh-TW": "您欲查詢的貨幣種類"
                })
                .addChoices(
                    { name: '綠寶石', value: '綠寶石' },
                    { name: '村民錠', value: '村民錠' }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('result_type')
                .setNameLocalizations({
                    "en-US": "result_type",
                    "zh-TW": "結果種類"
                })
                .setDescription('The result type you want to query')
                .setDescriptionLocalizations({
                    "en-US": "The result type you want to query",
                    "zh-TW": "您欲查詢的結果種類"
                })
                .addChoices(
                    { name: '黑羊毛', value: 'black_wool' },
                    { name: '白羊毛', value: 'white_wool' },
                    { name: '無指定', value: 'all' }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('type')
                .setNameLocalizations({
                    "en-US": "type",
                    "zh-TW": "排名類型"
                })
                .setDescription('The type of ranking you want to query')
                .setDescriptionLocalizations({
                    "en-US": "The type of ranking you want to query",
                    "zh-TW": "您欲查詢的排名類型"
                })
                .addChoices(
                    { name: '下注金額', value: 'bet_amount' },
                    { name: '贏得金額', value: 'win_amount' },
                    { name: '盈虧', value: 'profit_loss' },
                    { name: '下注次數', value: 'bet_count' }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('order')
                .setNameLocalizations({
                    "en-US": "order",
                    "zh-TW": "排名順序"
                })
                .setDescription('The order of ranking you want to query')
                .setDescriptionLocalizations({
                    "en-US": "The order of ranking you want to query",
                    "zh-TW": "您欲查詢的排名順序"
                })
                .addChoices(
                    { name: '由大到小', value: 'desc' },
                    { name: '由小到大', value: 'asc' }
                )
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('odds')
                .setNameLocalizations({
                    "en-US": "odds",
                    "zh-TW": "賠率"
                })
                .setDescription('The odds you want to query')
                .setDescriptionLocalizations({
                    "en-US": "The odds you want to query",
                    "zh-TW": "您欲查詢的賠率"
                })
        )
        .addStringOption(option =>
            option.setName('late')
                .setNameLocalizations({
                    "en-US": "late",
                    "zh-TW": "晚於"
                })
                .setDescription('time must late than'))
        .setDescriptionLocalizations({
            "en-US": "time must late than",
            "zh-TW": "時間需晚於"
        })
        .addStringOption(option =>
            option.setName('early')
                .setNameLocalizations({
                    "en-US": "early",
                    "zh-TW": "早於"
                })
                .setDescription('time must early than'))
        .setDescriptionLocalizations({
            "en-US": "time must early than",
            "zh-TW": "時間需早於"
        })
        .addStringOption(option =>
            option.setName('duration')
                .setNameLocalizations({
                    "en-US": "duration",
                    "zh-TW": "期間"
                })
                .setDescription('time must in the'))
        .setDescriptionLocalizations({
            "en-US": "time must early than",
            "zh-TW": "時間需在期間內"
        })
        .addIntegerOption(option =>
            option.setName('amount-bigger-than')
                .setNameLocalizations({
                    "en-US": "amount-bigger-than",
                    "zh-TW": "大於"
                })
                .setDescription('amount must bigger than'))
        .setDescriptionLocalizations({
            "en-US": "amount must bigger than",
            "zh-TW": "金額需大於"
        })
        .addIntegerOption(option =>
            option.setName('amount-smaller-than')
                .setNameLocalizations({
                    "en-US": "amount-smaller-than",
                    "zh-TW": "小於"
                })
                .setDescription('amount must smaller than'))
        .setDescriptionLocalizations({
            "en-US": "amount must smaller than",
            "zh-TW": "金額需小於"
        })
        .addIntegerOption(option =>
            option.setName('amount-equal')
                .setNameLocalizations({
                    "en-US": "amount-equal",
                    "zh-TW": "等於"
                })
                .setDescription('amount must equal to'))
        .setDescriptionLocalizations({
            "en-US": "amount must equal to",
            "zh-TW": "金額需等於"
        })
        .addBooleanOption(option =>
            option.setName('public')
                .setNameLocalizations({
                    "en-US": "public",
                    "zh-TW": "公開"
                })
                .setDescription('public or not'))
        .setDescriptionLocalizations({
            "en-US": "public or not",
            "zh-TW": "是否讓您的結果公開"
        }),

    async execute(interaction) {
        if (interaction.options.getBoolean('public')) {
            await interaction.deferReply()
        } else {
            await interaction.deferReply({ ephemeral: true })
        }

        if (!interaction.member) {
            await interaction.editReply('請在伺服器中使用此指令');
            return;
        }

        const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));
        const user_data = await get_user_data(undefined, String(interaction.member.id))
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        let user_uuid = user_data?.player_uuid;

        if (!user_uuid) {
            await interaction.editReply('請先綁定您的帳號');
            return;
        }

        const guild = await interaction.client.guilds.fetch(config.discord.guild_id)
        const member = await guild.members.fetch(interaction.member.id)

        const player_roles = (await member).roles.cache.map(role => role.id).filter((role) => {
            if (Object.keys(roles).includes(role)) return true
            else return false
        })
        
        if (!config.whitelist.includes(await get_player_name(user_uuid)) && (!roles[player_roles[0]] || (!roles[player_roles[0]].record_settings.others && !roles[player_roles[0]].record_settings.advanced))) {
            await interaction.editReply('您沒有權限使用此指令');
            return;
        }

        const coin_type = interaction.options.getString('coin_type') === '綠寶石' ? 'emerald' : 'coin';
        const rank_type = interaction.options.getString('type');
        const order = interaction.options.getString('order');

        let all_user_data = await get_all_user_data();
        let all_pay_history = await get_all_bet_record();

        const time_type = ['late', 'early', 'duration'].find(type => interaction.options.getString(type)) || 'none';
        let time_unix, time_unix_2;
        if (time_type !== 'none') {
            const time = interaction.options.getString(time_type).split('~');
            time_unix = Math.round(new Date(time[0]) / 1000);
            if (time[1]) {
                time_unix_2 = Math.round(new Date(time[1]) / 1000);
            }
        }

        const amount_bigger_than = interaction.options.getInteger('amount-bigger-than');
        const amount_smaller_than = interaction.options.getInteger('amount-smaller-than');
        const amount_equal = interaction.options.getInteger('amount-equal');
        const result_type = interaction.options.getString('result_type');

        const rankings = all_user_data.map(user => {
            const userHistory = all_pay_history.filter(record =>
                record.player_uuid === user.player_uuid &&
                record.bet_type === coin_type &&
                (result_type === 'all' ||
                    (result_type === 'black_wool' && record.odds <= 0) ||
                    (result_type === 'white_wool' && record.odds > 0)) &&
                (time_type === 'none' ||
                    (time_type === 'late' && record.time >= time_unix) ||
                    (time_type === 'early' && record.time <= time_unix) ||
                    (time_type === 'duration' && record.time >= time_unix && record.time <= time_unix_2)) &&
                (!amount_bigger_than || record.amount > amount_bigger_than) &&
                (!amount_smaller_than || record.amount < amount_smaller_than) &&
                (!amount_equal || record.amount === amount_equal) &&
                (record.odds === interaction.options.getInteger('odds') || !interaction.options.getInteger('odds'))
            );

            let value = 0;
            switch (rank_type) {
                case 'bet_amount':
                    value = userHistory.reduce((sum, record) => sum + record.amount, 0);
                    break;
                case 'win_amount':
                    value = userHistory.reduce((sum, record) => sum + record.win, 0);
                    break;
                case 'profit_loss':
                    value = userHistory.reduce((sum, record) => sum + (record.win - record.amount), 0);
                    break;
                case 'bet_count':
                    value = userHistory.length;
                    break;
            }

            return {
                player_name: user.player_uuid,
                value: value
            };
        });

        // 排序
        rankings.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);

        // 创建排名嵌入消息
        const embed = new EmbedBuilder()
            .setTitle(`${interaction.options.getString('coin_type') === '綠寶石' ? '綠寶石' : '村民錠'} ${rank_type} 排行榜`)
            .setColor('#0099ff')
            .setTimestamp();

        const top10 = rankings.slice(0, 10);
        let descriptionPromises = top10.map(async (rank, index) => {
            const playerName = await get_player_name(rankings[index].player_name);
            return `${index + 1}. ${playerName}: ${rankings[index].value}`;
        });

        let descriptionArray = await Promise.all(descriptionPromises);
        let description = descriptionArray.join('\n');

        embed.setDescription(description);

        await interaction.editReply({ embeds: [embed] });
    }
};