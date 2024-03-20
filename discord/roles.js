// for (const record of pay_history) {
//     if (interaction.options.getString(time_type)) {
//         if (time_type == 'late' && record.time < time_unix) continue
//         if (time_type == 'early' && record.time > time_unix) continue
//     }
//     if (interaction.options.getInteger('amount-bigger-than') && record.amount <= interaction.options.getInteger('amount-bigger-than')) continue
//     if (interaction.options.getInteger('amount-smaller-than') && record.amount >= interaction.options.getInteger('amount-smaller-than')) continue
//     if (interaction.options.getInteger('amount-equal') && record.amount != interaction.options.getInteger('amount-equal')) continue
//     if (time_type == 'duration' && (record.time < time_unix || record.time > time_unix_2)) continue
//     if (record.bet_type == 'emerald') {
//         total_bet += record.amount
//         total_win += record.win
//         total_bet_count += 1
//     } else if (record.bet_type == 'coin') {
//         total_coin_bet += record.amount
//         total_coin_win += record.win
//         total_coin_bet_count += 1
//     }
// }

const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');
const { add_user_role } = require(`${process.cwd()}/utils/database.js`); 
const { orderStrings } = require(`${process.cwd()}/utils/permissions.js`);

module.exports = {
    data: new SlashCommandBuilder()
    .setName('身份組')
    .setDescription('身份組設定')
    .addSubcommand(subcommand =>
        subcommand
            .setName('申請')
            .setDescription('申請身份組')
            .addRoleOption(option =>
                option
                    .setName('身份組')
                    .setDescription('要申請的身份組')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('重新整理')
            .setDescription('重新整理身份組')
            .addUserOption(option =>
                option
                    .setName('用戶')
                    .setDescription('要重新整理的用戶')
                    .setRequired(true)
            )
    ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        let role = interaction.options.getRole('身份組');
        let user = interaction.options.getUser('用戶');

        switch (interaction.options.getSubcommand()) {
            case '重新整理':
                // const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                // role = user.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id)

                // const player_data = (await get_user_data_from_dc(user.id))[0]
                // if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) return
                // const player_role = orderStrings(player_data.roles, roles)
                // if (!player_data.discord_id && player_role.includes('none')) return

                // for (const config_role of Object.keys(roles)) {
                //     for (const user_role of role) {
                //         if (roles[config_role] && roles[config_role].discord_id == user_role) {
                //             if (player_data.roles.includes(config_role)) {
                //                 await add_user_role(user.id, config_role)
                //             }
                //         }

                //         if (roles[config_role] && roles[config_role].discord_id == user_role) {
                //             await remove_user_role(user.id, config_role)
                //         }
                //     }
                // }

                // if ((await get_user_data_from_dc(newMember.id))[0].roles == '' || (await get_user_data_from_dc(newMember.id))[0].roles == undefined) {
                //     await add_user_role(newMember.id, 'none')
                // }

                const roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                let userRoles = user.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id)

                const player_data = (await get_user_data_from_dc(user.id))[0]
                if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) return
                const player_role = orderStrings(player_data.roles, roles)
                if (!player_data.discord_id && player_role.includes('none')) return

                let rolesToAdd = [];
                let rolesToRemove = [];

                for (const config_role of Object.keys(roles)) {
                    for (const user_role of userRoles) {
                        if (roles[config_role] && roles[config_role].discord_id == user_role) {
                            if (player_role.includes(config_role)) {
                                rolesToAdd.push(config_role);
                            } else {
                                rolesToRemove.push(config_role);
                            }
                        }
                    }
                }

                // Remove duplicate roles from rolesToAdd
                rolesToAdd = [...new Set(rolesToAdd)];

                // Remove roles that are in both rolesToAdd and rolesToRemove
                rolesToRemove = rolesToRemove.filter(role => !rolesToAdd.includes(role));

                for (let role of rolesToAdd) {
                    await add_user_role(user.id, role);
                }

                for (let role of rolesToRemove) {
                    await remove_user_role(user.id, role);
                }

                break
        }

        await interaction.editReply(`hello world`);
    }
}