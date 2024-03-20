const {
    get_player_wallet_discord,
    create_player_wallet,
    add_player_wallet_dc,
    clear_player_wallet_dc
} = require(`${process.cwd()}/utils/database.js`);

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('錢包')
    .setDescription('錢包設定')
    .addSubcommand(subcommand =>
        subcommand
            .setName('查詢餘額')
            .setDescription('查詢使用者的餘額')
            .addUserOption(option =>
                option
                    .setName('使用者')
                    .setDescription('欲查詢的使用者')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('新增餘額')
            .setDescription('新增餘額給使用者')
            .addUserOption(option =>
                option
                    .setName('使用者')
                    .setDescription('欲新增餘額的使用者')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('數量')
                    .setDescription('欲新增的數量')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('減少餘額')
            .setDescription('減少使用者的餘額')
            .addUserOption(option =>
                option
                    .setName('使用者')
                    .setDescription('欲減少餘額的使用者')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('數量')
                    .setDescription('欲減少的數量')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('清空餘額')
            .setDescription('清空使用者的餘額')
            .addUserOption(option =>
                option
                    .setName('使用者')
                    .setDescription('欲清空餘額的使用者')
                    .setRequired(true)
            )
    ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const user = interaction.options.getUser('使用者')
        let wallet;

        switch (interaction.options.getSubcommand()) {
            case '查詢餘額':
                wallet = await get_player_wallet_discord(user.id)

                switch (wallet) {
                    case 'error':
                        await interaction.editReply('發生錯誤，請稍後再試')
                        break
                    case 'Not Found':
                        await interaction.editReply(`查無玩家資料`)
                        break
                    default:
                        await interaction.editReply(`玩家 <@${user.id}> 的錢包餘額為 ${wallet} 元`)
                }

                break

            case '新增餘額':
                await add_player_wallet_dc(user.id, interaction.options.getInterger('數量'))
                wallet = await get_player_wallet_discord(user.id)

                switch (wallet) {
                    case 'error':
                        await interaction.editReply('發生錯誤，請稍後再試')
                        break
                    case 'Not Found':
                        await interaction.editReply(`查無玩家資料`)
                        break
                    default:
                        await interaction.editReply(`已成功新增玩家 <@${user.id}> 的錢，他目前有 ${wallet} 元`)
                }

                break

            case '減少餘額':
                await add_player_wallet_dc(user.id, -interaction.options.getInterger('數量'))
                wallet = await get_player_wallet_discord(user.id)

                switch (wallet) {
                    case 'error':
                        await interaction.editReply('發生錯誤，請稍後再試')
                        break
                    case 'Not Found':
                        await interaction.editReply(`查無玩家資料`)
                        break
                    default:
                        await interaction.editReply(`已成功減少玩家 <@${user.id}> 的錢，他目前有 ${wallet} 元`)
                }

                break

            case '清空餘額':
                wallet = await clear_player_wallet_dc(user.id)

                switch (wallet) {
                    case 'error':
                        await interaction.editReply('發生錯誤，請稍後再試')
                        break
                    case 'Not Found':
                        await interaction.editReply(`查無玩家資料`)
                        break
                    default:
                        await interaction.editReply(`已清空玩家 <@${user.id}> 的錢包`)
                }

                break
        }
    }
}