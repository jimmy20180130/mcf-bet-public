const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');
const { add_user_role, get_user_data_from_dc, remove_user_role } = require(`${process.cwd()}/utils/database.js`); 
const { orderStrings } = require(`${process.cwd()}/utils/permissions.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('身份組')
        .setDescription('身份組相關')
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
                        .setName('使用者')
                        .setDescription('要重新整理的使用者')
                        .setRequired(true)
                )
        )
        .addSubcommandGroup(SubcommandGroup =>
            SubcommandGroup
                .setName('設定')
                .setDescription('身分組設定')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('建立')
                        .setDescription('建立身份組')
                        .addStringOption(option =>
                            option
                                .setName('身份組名稱')
                                .setDescription('要建立的身份組名稱')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('簽到金額')
                                .setDescription('每日簽到獎勵金額')
                                .setRequired(true)
                        )
                        .addRoleOption(option =>
                            option
                                .setName('dc身份組')
                                .setDescription('連動 Discord 的身份組')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('基本流水查詢')
                                .setDescription('是否可查詢自己的流水 (不包括盈虧)')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('全域流水查詢')
                                .setDescription('是否可查詢除自己外全部人的流水資料 (不包括盈虧)')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('盈虧流水查詢')
                                .setDescription('是否可查詢盈虧')
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        let role = interaction.options.getRole('身份組');
        let user = interaction.options.getUser('使用者');
        let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

        switch (interaction.options.getSubcommand()) {
            case '重新整理':
                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                let userRoles = interaction.guild.members.cache.find(member => member.id == user.id).roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
                const player_data = (await get_user_data_from_dc(user.id))[0];

                if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) return;

                const player_role = orderStrings(player_data.roles, roles);

                let rolesToAdd = [];
                let rolesToRemove = [];

                for (const config_role of Object.keys(roles)) {
                    const discordRoleId = roles[config_role].discord_id;
                    const hasDiscordRole = userRoles.includes(discordRoleId);
                    const hasPlayerRole = player_role.includes(config_role);

                    if (hasPlayerRole && !hasDiscordRole) {
                        rolesToAdd.push(config_role);
                    } else if (!hasPlayerRole && hasDiscordRole) {
                        rolesToRemove.push(config_role);
                    }
                }

                rolesToAdd = [...new Set(rolesToAdd)];

                for (let role of rolesToAdd) {
                    interaction.guild.members.cache.find(member => member.id == user.id).roles.add(roles[role].discord_id);
                }

                for (let role of rolesToRemove) {
                    interaction.guild.members.cache.find(member => member.id == user.id).roles.remove(roles[role].discord_id);
                }

                rolesToAdd = rolesToAdd.map(role => `<@&${roles[role].discord_id}>`);
                rolesToRemove = rolesToRemove.map(role => `<@&${roles[role].discord_id}>`);

                await interaction.editReply(`身份組重新整理完成，新增了 ${rolesToAdd.join(', ')}，移除了 ${rolesToRemove.join(', ')}`);

                break

            case '建立':
                let role_name = interaction.options.getString('身份組名稱');
                let role = interaction.options.getRole('dc身份組');
                let daily_reward = interaction.options.getInteger('簽到金額');
                let basic_query = interaction.options.getBoolean('基本流水查詢');
                let global_query = interaction.options.getBoolean('全域流水查詢');
                let win_loss_query = interaction.options.getBoolean('盈虧流水查詢');

                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                
                roles[role_name] = {
                    name: role_name,
                    daily: daily_reward,
                    discord_id: role.id,
                    record_settings: {
                        advanced: win_loss_query,
                        others: global_query,
                        me: basic_query
                    },
                    reverse_blacklist: true,
                    disallowed_commands: [
                        "help",
                        "hi",
                        "unlink",
                        "play",
                        "daily",
                        "wallet"
                    ]
                }

                fs.writeFileSync(`${process.cwd()}/config/roles.json`, JSON.stringify(roles, null, 4));

                await interaction.editReply('身份組 ' + role_name + ' 已建立');

                break
        }

    }
}