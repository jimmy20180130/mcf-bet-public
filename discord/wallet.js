const {
    get_player_wallet,
    create_player_wallet,
    set_player_wallet,
    get_user_data
} = require(`../utils/database.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);
const fs = require('fs')

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('錢包')
        .setDescription('錢包設定')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
                .addStringOption(option => 
                    option
                        .setName('貨幣類型')
                        .setDescription('貨幣的種類')
                        .setRequired(true)
                        .addChoices(
                            { name: '綠寶石', value: 'emerald' },
                            { name: '村民錠', value: 'coin' }
                        )
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
                .addStringOption(option => 
                    option
                        .setName('貨幣類型')
                        .setDescription('貨幣的種類')
                        .setRequired(true)
                        .addChoices(
                            { name: '綠寶石', value: 'emerald' },
                            { name: '村民錠', value: 'coin' }
                        )
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
                .addStringOption(option => 
                    option
                        .setName('貨幣類型')
                        .setDescription('貨幣的種類')
                        .setRequired(true)
                        .addChoices(
                            { name: '綠寶石', value: 'emerald' },
                            { name: '村民錠', value: 'coin' }
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        let user_data = await get_user_data(undefined, interaction.user.id);
				
		if (!config.whitelist || !user_data || user_data == 'Not Found' || user_data == 'Unexpected Error' || (!config.whitelist.includes((await get_player_name(user_data.player_uuid)).toLowerCase()) && !config.whitelist.includes(await get_player_name(user_data.player_uuid)))) {
            await interaction.editReply({ content: '你沒有權限使用這個指令', ephemeral: true });
            return;
        }

        const user = interaction.options.getUser('使用者')
        const player_uuid = (await get_user_data(undefined, user.id)).player_uuid

        if (!player_uuid || player_uuid === 'Not Found' || player_uuid === 'Unexpected Error') {
            await interaction.editReply(`查無玩家資料`)
            return
        }

        let player_wallet = await get_player_wallet(player_uuid, 'emerald')

        if (player_wallet === 'Not Found') {
            await create_player_wallet(player_uuid)
            player_wallet = await get_player_wallet(player_uuid, 'emerald')
        }

        let player_wallet_e = await get_player_wallet(player_uuid, 'emerald')
        let player_wallet_c = await get_player_wallet(player_uuid, 'coin')

        switch (interaction.options.getSubcommand()) {
            case '查詢餘額':
                switch (player_wallet) {
                    case 'error':
                        await interaction.editReply('發生錯誤，請稍後再試')
                        break
                    case 'Not Found':
                        await interaction.editReply(`查無玩家資料`)
                        break
                    default:
                        await interaction.editReply(`玩家 <@${user.id}> 的綠寶石餘額為 ${player_wallet_e} 元，村民錠餘額為 ${player_wallet_c} 元 `)
                }

                break

            case '新增餘額':
                if (interaction.options.getString('貨幣類型') == 'emerald') {
                    await set_player_wallet(player_uuid, Number(player_wallet_e) + interaction.options.getInteger('數量'), 'emerald')
                    player_wallet_e = await get_player_wallet(player_uuid, 'emerald')

                    switch (player_wallet_e) {
                        case 'error':
                            await interaction.editReply('發生錯誤，請稍後再試')
                            break
                        case 'Not Found':
                            await interaction.editReply(`查無玩家資料`)
                            break
                        default:
                            await interaction.editReply(`已成功新增玩家 <@${user.id}> 的錢，他的錢包目前有 ${player_wallet_e} 個綠寶石`)
    
                            const dm = await user.createDM()
    
                            try {
                                await dm.send(`管理員已新增 ${interaction.options.getInteger('數量')} 個綠寶石至您的錢包中\n您的錢包目前有 ${player_wallet_e} 個綠寶石\n如要領取，請在遊戲中私訊我 "領錢" ，感謝您的配合`)
                            } catch (error) { }
                    }

                } else {
                    if (player_uuid, Number(player_wallet_c) - interaction.options.getInteger('數量') < 0) {
                        await interaction.editReply('玩家的錢不足')
                        return
                    }
                    
                    await set_player_wallet(player_uuid, Number(player_wallet_c) - interaction.options.getInteger('數量'), 'coin')
                    player_wallet_c = await get_player_wallet(player_uuid, 'coin')

                    switch (player_wallet_c) {
                        case 'error':
                            await interaction.editReply('發生錯誤，請稍後再試')
                            break
                        case 'Not Found':
                            await interaction.editReply(`查無玩家資料`)
                            break
                        default:
                            await interaction.editReply(`已成功新增玩家 <@${user.id}> 的錢，他的錢包目前有 ${player_wallet_c} 個綠寶石`)
    
                            const dm = await user.createDM()
    
                            try {
                                await dm.send(`管理員已新增 ${interaction.options.getInteger('數量')} 個綠寶石至您的錢包中\n您的錢包目前有 ${player_wallet_c} 個綠寶石\n如要領取，請在遊戲中私訊我 "領錢" ，感謝您的配合`)
                            } catch (error) { }
                    }
                }

                break

            case '減少餘額':
                if (interaction.options.getString('貨幣類型') == 'emerald') {
                    await set_player_wallet(player_uuid, Number(player_wallet_e) - interaction.options.getInteger('數量'), 'emerald')
                    player_wallet_e = await get_player_wallet(player_uuid, 'emerald')

                    switch (player_wallet_e) {
                        case 'error':
                            await interaction.editReply('發生錯誤，請稍後再試')
                            break
                        case 'Not Found':
                            await interaction.editReply(`查無玩家資料`)
                            break
                        default:
                            await interaction.editReply(`已成功減少玩家 <@${user.id}> 的錢，他的錢包目前有 ${player_wallet_e} 個綠寶石`)
                    }
                } else {
                    await set_player_wallet(player_uuid, Number(player_wallet_c) - interaction.options.getInteger('數量'), 'coin')
                    player_wallet_c = await get_player_wallet(player_uuid, 'coin')

                    switch (player_wallet_c) {
                        case 'error':
                            await interaction.editReply('發生錯誤，請稍後再試')
                            break
                        case 'Not Found':
                            await interaction.editReply(`查無玩家資料`)
                            break
                        default:
                            await interaction.editReply(`已成功減少玩家 <@${user.id}> 的錢，他的錢包目前有 ${player_wallet_c} 個村民錠`)
                    }
                }

                

                break

            case '清空餘額':
                if (interaction.options.getString('貨幣類型') == 'emerald') {
                    await set_player_wallet(player_uuid, 0, 'emerald')
                    player_wallet_e = await get_player_wallet(player_uuid, 'emerald')

                    switch (player_wallet_e) {
                        case 'error':
                            await interaction.editReply('發生錯誤，請稍後再試')
                            break
                        case 'Not Found':
                            await interaction.editReply(`查無玩家資料`)
                            break
                        default:
                            await interaction.editReply(`已清空玩家 <@${user.id}> 的錢包`)
                    }

                } else {
                    await set_player_wallet(player_uuid, 0, 'coin')
                    player_wallet_c = await get_player_wallet(player_uuid, 'coin')

                    switch (player_wallet_c) {
                        case 'error':
                            await interaction.editReply('發生錯誤，請稍後再試')
                            break
                        case 'Not Found':
                            await interaction.editReply(`查無玩家資料`)
                            break
                        default:
                            await interaction.editReply(`已清空玩家 <@${user.id}> 的錢包`)
                    }

                }

                break
        }
    }
}