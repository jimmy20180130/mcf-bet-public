const { SlashCommandBuilder, EmbedBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { get_user_data, get_all_user_data, get_all_bet_record } = require(`../utils/database.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);
const fs = require('fs')
const toml = require('toml');

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
        .setContexts(InteractionContextType.Guild)
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
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.member) {
            await interaction.editReply('請在伺服器中使用此指令');
            return;
        }

        const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/data/roles.json`, 'utf8'));
        const user_data = await get_user_data(undefined, String(interaction.member.id))
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
        let user_uuid = user_data?.player_uuid;

        if (!user_uuid) {
            await interaction.editReply('請先綁定您的帳號');
            return;
        }

        const guild = await interaction.client.guilds.fetch(configtoml.discord.guild_id)
        const member = await guild.members.fetch(interaction.member.id)

        const player_roles = (await member).roles.cache.map(role => role.id).filter((role) => {
            if (Object.keys(roles).includes(role)) return true
            else return false
        })

        if ((!configtoml.minecraft.whitelist.includes((await get_player_name(user_uuid)).toLowerCase()) && !configtoml.minecraft.whitelist.includes(await get_player_name(user_uuid))) && (!roles[player_roles[0]] || (!roles[player_roles[0]].record_settings.others && !roles[player_roles[0]].record_settings.advanced))) {
            await interaction.editReply('您沒有權限使用此指令');
            return;
        }

        const coin_type = interaction.options.getString('coin_type') === '綠寶石' ? 'emerald' : 'coin';
        const rank_type = interaction.options.getString('type');
        const order = interaction.options.getString('order');
        const queryUserUuid = user_uuid;

        let all_user_data = await get_all_user_data();
        let all_pay_history = await get_all_bet_record();

        const time_type = ['late', 'early', 'duration'].find(type => interaction.options.getString(type)) || 'none';
        let time_unix, time_unix_2;
        if (time_type !== 'none') {
            const time = interaction.options.getString(time_type).split('~');
            time_unix = Math.round(new Date(time[0]) / 1000) - 54400;
            if (time[1]) {
                time_unix_2 = Math.round(new Date(time[1]) / 1000) - 54400;
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
                    (result_type === 'black_wool' && record.result_amount <= 0) ||
                    (result_type === 'white_wool' && record.result_amount > 0)) &&
                (time_type === 'none' ||
                    (time_type === 'late' && record.time >= time_unix) ||
                    (time_type === 'early' && record.time <= time_unix) ||
                    (time_type === 'duration' && record.time >= time_unix && record.time <= time_unix_2)) &&
                (!amount_bigger_than || record.amount > amount_bigger_than) &&
                (!amount_smaller_than || record.amount < amount_smaller_than) &&
                (!amount_equal || record.amount === amount_equal) &&
                (record.odds === interaction.options.getNumber('odds') || !interaction.options.getNumber('odds'))
            );

            let value = 0;
            switch (rank_type) {
                case 'bet_amount':
                    value = userHistory.reduce((sum, record) => sum + record.amount, 0);
                    break;
                case 'win_amount':
                    value = userHistory.reduce((sum, record) => sum + record.result_amount, 0);
                    break;
                case 'profit_loss':
                    value = userHistory.reduce((sum, record) => sum + (record.result_amount - record.amount), 0);
                    break;
                case 'bet_count':
                    value = userHistory.length;
                    break;
            }

            return {
                player_name: user.player_uuid,
                value: value,
                isQueryUser: user.player_uuid === queryUserUuid
            };
        });

        // 排序
        rankings.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);

        // 對排名進行分組處理
        const groupedRankings = rankings.reduce((acc, current) => {
            const existingGroup = acc.find(group => group.value === current.value);
            if (existingGroup) {
                existingGroup.players.push({
                    uuid: current.player_name,
                    isQueryUser: current.isQueryUser
                });
            } else {
                acc.push({
                    value: current.value,
                    players: [{
                        uuid: current.player_name,
                        isQueryUser: current.isQueryUser
                    }]
                });
            }
            return acc;
        }, []);

        // 只取前10個不同的值
        const top10Groups = groupedRankings.slice(0, 10);

        const rank_type_name = {
            'bet_amount': '下注金額',
            'win_amount': '贏得金額',
            'profit_loss': '盈虧',
            'bet_count': '下注次數'
        }

        // 創建排名嵌入消息
        const embed = new EmbedBuilder()
            .setTitle(`${interaction.options.getString('coin_type') === '綠寶石' ? '綠寶石' : '村民錠'} ${rank_type_name[rank_type]} 排行榜 (${order === 'desc' ? '由大到小' : '由小到大'}，結果種類為${result_type === 'all' ? '全部' : result_type === 'black_wool' ? '黑羊毛' : '白羊毛'})`)
            .setColor('#0099ff')
            .setTimestamp();

        // 生成描述，確保查詢用戶在同值組中優先顯示
        let descriptionPromises = top10Groups.map(async (group, index) => {
            // 對玩家進行排序，查詢用戶優先
            const sortedPlayers = group.players.sort((a, b) => b.isQueryUser - a.isQueryUser);
            const playerNames = await Promise.all(sortedPlayers.map(player => get_player_name(player.uuid)));
            const playerCount = playerNames.length;

            const playerDisplay = playerCount > 1
                ? `${playerNames[0]} 等 ${playerCount} 位玩家`
                : playerNames[0];

            return `${index + 1}. ${playerDisplay}: ${group.value}`;
        });

        let descriptionArray = await Promise.all(descriptionPromises);
        let description = descriptionArray.join('\n');

        embed.setDescription(description);

        await interaction.editReply({ embeds: [embed] });
    }
};