const { SlashCommandBuilder, PermissionFlagsBits, Component } = require("discord.js");
const fs = require("fs");
const { start } = require("repl");
const { send_giveaway } = require(`${process.cwd()}/discord/giveaway_manager.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Create a giveaway")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setNameLocalizations({
                    "en-US": "start",
                    "zh-CN": "start",
                    "zh-TW": "建立"
                })
                .setDescription("Start a giveaway")
                .addStringOption(option =>
                    option
                        .setName("prize")
                        .setNameLocalizations({
                            "en-US": "prize",
                            "zh-CN": "prize",
                            "zh-TW": "獎品"
                        })
                        .setDescription("The prize for the giveaway")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("winners")
                        .setNameLocalizations({
                            "en-US": "winners",
                            "zh-CN": "winners",
                            "zh-TW": "贏家"
                        })
                        .setDescription("The number of winners for the giveaway")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("duration")
                        .setNameLocalizations({
                            "en-US": "duration",
                            "zh-CN": "duration",
                            "zh-TW": "持續時間"
                        })
                        .setDescription("The duration of the giveaway")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setNameLocalizations({
                            "en-US": "channel",
                            "zh-CN": "channel",
                            "zh-TW": "頻道"
                        })
                        .setDescription("The channel to create the giveaway in")
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName("host")
                        .setNameLocalizations({
                            "en-US": "host",
                            "zh-CN": "host",
                            "zh-TW": "主持人"
                        })
                        .setDescription("The host of the giveaway")
                )
                .addRoleOption(option =>
                    option
                        .setName("include_role")
                        .setNameLocalizations({
                            "en-US": "include_role",
                            "zh-CN": "include_role",
                            "zh-TW": "身分組"
                        })
                        .setDescription("The role that can enter the giveaway")
                )
                .addRoleOption(option =>
                    option
                        .setName("excluded_role")
                        .setNameLocalizations({
                            "en-US": "excluded_role",
                            "zh-CN": "excluded_role",
                            "zh-TW": "排除身分組"
                        })
                        .setDescription("The role that cannot enter the giveaway")
                )
                .addStringOption(option =>
                    option
                        .setName("description")
                        .setNameLocalizations({
                            "en-US": "description",
                            "zh-CN": "description",
                            "zh-TW": "描述"
                        })
                        .setDescription("The description of the giveaway")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("end")
                .setNameLocalizations({
                    "en-US": "end",
                    "zh-CN": "end",
                    "zh-TW": "結束"
                })
                .setDescription("End a giveaway")
                .addStringOption(option =>
                    option
                        .setName("message_id")
                        .setDescription("The message ID of the giveaway")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("reroll")
                .setNameLocalizations({
                    "en-US": "reroll",
                    "zh-CN": "reroll",
                    "zh-TW": "重抽"
                })
                .setDescription("Reroll a giveaway")
                .addStringOption(option =>
                    option
                        .setName("message_id")
                        .setDescription("The message ID of the giveaway")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setNameLocalizations({
                    "en-US": "list",
                    "zh-CN": "list",
                    "zh-TW": "列表"
                })
                .setDescription("List all giveaways")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setNameLocalizations({
                    "en-US": "cancel",
                    "zh-CN": "cancel",
                    "zh-TW": "取消"
                })
                .setDescription('Cancel a giveaway')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setNameLocalizations({
                    "en-US": "edit",
                    "zh-CN": "edit",
                    "zh-TW": "編輯"
                })
                .setDescription('Edit a giveaway')
                .addStringOption(option =>
                    option
                        .setName('messageid')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('prize')
                        .setNameLocalizations({
                            "en-US": "prize",
                            "zh-CN": "prize",
                            "zh-TW": "獎品"
                        })
                        .setDescription('The prize for the giveaway')
                )
                .addIntegerOption(option =>
                    option
                        .setName('winners')
                        .setNameLocalizations({
                            "en-US": "winners",
                            "zh-CN": "winners",
                            "zh-TW": "贏家"
                        })
                        .setDescription('The number of winners for the giveaway')
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setNameLocalizations({
                            "en-US": "duration",
                            "zh-CN": "duration",
                            "zh-TW": "持續時間"
                        })
                        .setDescription('The duration of the giveaway')
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setNameLocalizations({
                            "en-US": "channel",
                            "zh-CN": "channel",
                            "zh-TW": "頻道"
                        })
                        .setDescription('The channel to create the giveaway in')
                )
                .addRoleOption(option =>
                    option
                        .setName('include_role')
                        .setNameLocalizations({
                            "en-US": "include_role",
                            "zh-CN": "include_role",
                            "zh-TW": "包含身分組"
                        })
                        .setDescription('The role that can enter the giveaway')
                )
                .addRoleOption(option =>
                    option
                        .setName('excluded_role')
                        .setNameLocalizations({
                            "en-US": "excluded_role",
                            "zh-CN": "excluded_role",
                            "zh-TW": "排除身分組"
                        })
                        .setDescription('The role that cannot enter the giveaway')
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setNameLocalizations({
                            "en-US": "description",
                            "zh-CN": "description",
                            "zh-TW": "描述"
                        })
                        .setDescription('The description of the giveaway')
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();

        let message_id = interaction.options.getString("message_id");
        let channel = interaction.channel;

        let message = await channel.messages.fetch(message_id);

        switch (subcommand) {
            case "start":
                //create a giveaway

                let giveaway = {
                    message_id: null,
                    prize: interaction.options.getString("prize"),
                    winners: interaction.options.getInteger("winners"),
                    duration: interaction.options.getInteger("duration"),
                    start_time: Math.floor(Date.now() / 1000),
                    channel: interaction.options.getChannel("channel").id,
                    host: interaction.options.getUser("host") || interaction.user,
                    require_role: interaction.options.getRole("include_role") || null,
                    excluded_role: interaction.options.getRole("excluded_role") || null,
                    description: interaction.options.getString("description") || null,
                    entries: []
                }

                interaction.editReply("Giveaway created successfully");

                send_giveaway(interaction.client, giveaway);

                break;

            case "end":
                //end a giveaway

                if (!message) {
                    interaction.editReply("Message not found");
                    return;
                } else {
                    interaction.editReply("Giveaway ended successfully");

                    await message.edit({ components: [] });

                    let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`, "utf8"));

                    let giveaway_copy = giveaways[message_id];

                    delete giveaways[message_id];
                    fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));

                    let entries = giveaway_copy.entries
                    let winner = entries[Math.floor(Math.random() * entries.length)]
                    let channel = await client.channels.fetch(giveaway_copy.channel)
                    let message = await channel.messages.fetch(giveaway_copy.message_id)
                    let prize = giveaway_copy.prize
                    let user = await client.users.fetch(winner)
                    
                    if (!winner) {
                        await message.reply({ content: '抽獎已結束，無人中獎' })
                    } else {
                        await message.reply({ content: `抽獎已結束，獲獎者為 <@${winner}>，獎品已自動新增至您的錢包中，私訊 ${bot.username} 領錢 即可領取` })

                        const { add_player_wallet_dc, get_player_wallet_discord } = require('./utils/database.js')

                        await add_player_wallet_dc(winner, Number(prize))
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        wallet = await get_player_wallet_discord(winner)

                        switch (wallet) {
                            case 'error':
                                await channel.send('新增錢至錢包時發生錯誤')
                                break
                            case 'Not Found':
                                await channel.send(`該玩家無綁定資料`)
                                break
                            default:
                                await channel.send(`已成功新增玩家 <@${winner}> 的錢，如未收到，請聯絡管理員`)

                                const dm = await user.createDM()

                                try {
                                    await dm.send(`管理員已新增 ${Number(prize)} 元至您的錢包中，您目前有 ${wallet} 元，在遊戲中私訊我 "領錢" 即可領取。`)
                                } catch (error) { }
                        }
                    }

                }

                break;

            
        }
    }
}