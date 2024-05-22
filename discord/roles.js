const fs = require('fs');
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { add_user_role, get_user_data_from_dc, remove_user_role,  } = require(`${process.cwd()}/utils/database.js`); 
const { orderStrings } = require(`${process.cwd()}/utils/permissions.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('身份組')
        .setDescription('身份組相關')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('照資料庫重新整理')
                .setDescription('照資料庫重新整理身份組')
                .addUserOption(option =>
                    option
                        .setName('使用者')
                        .setDescription('要重新整理的使用者')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('照discord重新整理')
                .setDescription('照discord重新整理身份組')
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
                        .setName('設定')
                        .setDescription('建立身份組')
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
                        .addBooleanOption(option =>
                            option
                                .setName('管理員')
                                .setDescription('是否為管理員')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('資訊')
                        .setDescription('身份組的資訊')
                        .addRoleOption(option =>
                            option
                                .setName('dc身份組')
                                .setDescription('要查詢資訊的身份組')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('刪除')
                        .setDescription('刪除身份組')
                        .addRoleOption(option =>
                            option
                                .setName('身份組名稱')
                                .setDescription('要刪除的身份組名稱')
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let user_roles = interaction.member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
		let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));

        let user = interaction.options.getUser('使用者');
        let rolesToAdd = [];
        let rolesToRemove = [];
        let userRoles
        let role_name
        let player_data
        let dc_role = interaction.options.getRole('dc身份組');
        let daily_reward = interaction.options.getInteger('簽到金額');
        let basic_query = interaction.options.getBoolean('基本流水查詢');
        let global_query = interaction.options.getBoolean('全域流水查詢');
        let win_loss_query = interaction.options.getBoolean('盈虧流水查詢');
        let is_admin = interaction.options.getBoolean('管理員');

        switch (interaction.options.getSubcommand()) {
            case '照資料庫重新整理':
                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));
                userRoles = interaction.guild.members.cache.find(member => member.id == user.id).roles.cache.filter(role => role.name !== '@everyone').map(role => role.id);
                player_data = (await get_user_data_from_dc(user.id))[0];

                if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) return;

                const player_role = orderStrings(player_data.roles, roles);

                rolesToAdd = [];
                rolesToRemove = [];

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

            case '照discord重新整理':
                let members = await interaction.guild.members.fetch().then(member => {
                    return member
                }).catch(err => {
                    console.log(err)
                });

                members = members.filter(member => member[1].user.id == user.id)

                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

                for (const member of members) {
                    const player_data = (await get_user_data_from_dc(member[1].user.id))[0]
                    if (player_data == undefined || player_data == 'Not Found' || player_data == 'error' || player_data.roles == undefined) continue
                    const player_role = orderStrings(player_data.roles, roles)
                    
                    if (!player_data.discord_id && player_role.includes('none')) continue

                    let discord_user_roles = []

                    for (const config_role of Object.keys(roles)) {
                        if (guild.members.cache.get(member[1].user.id).roles.cache.map(role => role.id).includes(roles[config_role].discord_id)) {
                            discord_user_roles.push(config_role)
                        }
                    }

                    if (player_data.discord_id && config.roles.link_role == 'default') discord_user_roles.push('default')

                    if (discord_user_roles.length == 0) {
                        discord_user_roles.push('none')
                    }

                    set_user_role(member[1].user.id, discord_user_roles.join(', '))
                }

                await interaction.editReply(`身份組重新整理完成`);

                break

            case '設定':
                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

                for (const role of Object.keys(roles)) {
                    if (role == dc_role.id) {
                        //edit role
                        if (daily_reward) {
                            roles[role].daily = daily_reward
                        }
                        if (basic_query) {
                            roles[role].record_settings.me = basic_query
                        }
                        if (global_query) {
                            roles[role].record_settings.others = global_query
                        }
                        if (win_loss_query) {
                            roles[role].record_settings.advanced = win_loss_query
                        }
                        if (is_admin) {
                            roles[role].disallowed_commands = []
                            roles[role].reverse_blacklist = false
                        } else {
                            roles[role].disallowed_commands = [
                                "help",
                                "hi",
                                "unlink",
                                "play",
                                "daily",
                                "wallet"
                            ]
                            roles[role].reverse_blacklist = true
                        }

                        fs.writeFileSync(`${process.cwd()}/config/roles.json`, JSON.stringify(roles, null, 4));

                        await interaction.editReply('身份組 <@&' + dc_role.id + '> 已更新');
                        return
                    }
                }

                // get role name using id
                role_name = dc_role.name
                
                roles[dc_role.id] = {
                    name: role_name,
                    daily: daily_reward,
                    discord_id: dc_role.id,
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

                if (is_admin) {
                    roles[dc_role.id].disallowed_commands = []
                    roles[dc_role.id].reverse_blacklist = false
                }

                fs.writeFileSync(`${process.cwd()}/config/roles.json`, JSON.stringify(roles, null, 4));

                await interaction.editReply('身份組 <@&' + dc_role.id + '> 已建立');

                break

            case '資訊':
                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

                //get role_name using discord_role_id from roles
                role_name = dc_role.id

                if (!role_name || !roles[role_name]) {
                    await interaction.editReply('找不到身份組 ' + '<@&' + dc_role.id + '>')
                    return
                }

                let response_string = `名稱: ${roles[role_name].name}\n每日簽到獎勵: ${roles[role_name].daily} 元\n連結之身份組: <@&${roles[role_name].discord_id}>\n查自己的流水: ${roles[role_name].record_settings.me}\n查別人的流水: ${roles[role_name].record_settings.others}\n查盈虧: ${roles[role_name].record_settings.advanced}\n管理員: ${roles[role_name].disallowed_commands.length == 0 ? '是' : '否'}`

                await interaction.editReply('身份組 <@&' + dc_role.id + '> 的資料為\n' + response_string)

                break

            case '刪除':
                roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf-8'));

                delete roles[dc_role.id]

                fs.writeFileSync(`${process.cwd()}/config/roles.json`, JSON.stringify(roles, null, 4));

                await interaction.editReply('已刪除身份組 <@&' + dc_role.id + '>')

                break

        }

    }
}