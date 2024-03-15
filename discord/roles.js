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
    ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const role = interaction.options.getRole('身份組');

        await interaction.editReply(`hello world`);
    }
}