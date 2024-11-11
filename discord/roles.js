const fs = require('fs');
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { get_user_data } = require(`../utils/database.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('身份組')
        .setDescription('身份組相關')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
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
                                .setName('dc身份組')
                                .setDescription('要刪除的dc身份組名稱')
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        const player_uuid = (await get_user_data(undefined, interaction.user.id)).player_uuid
        
        if (!config.whitelist || (!config.whitelist.includes((await get_player_name(player_uuid)).toLowerCase()) && !config.whitelist.includes(await get_player_name(player_uuid)))) {
            await interaction.editReply({ content: '你沒有權限使用這個指令', ephemeral: true });
            return;
        }
        
		let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'));

        let role_name
        let dc_role = interaction.options.getRole('dc身份組');
        let daily_reward = interaction.options.getInteger('簽到金額');
        let basic_query = interaction.options.getBoolean('基本流水查詢');
        let global_query = interaction.options.getBoolean('全域流水查詢');
        let win_loss_query = interaction.options.getBoolean('盈虧流水查詢');

        switch (interaction.options.getSubcommand()) {
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
                    }
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

                let response_string = `名稱: ${roles[role_name].name}\n每日簽到獎勵: ${roles[role_name].daily} 元\n連結之身份組: <@&${roles[role_name].discord_id}>\n查自己的流水: ${roles[role_name].record_settings.me}\n查別人的流水: ${roles[role_name].record_settings.others}\n查盈虧: ${roles[role_name].record_settings.advanced}`

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