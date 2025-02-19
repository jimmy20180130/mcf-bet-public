const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, InteractionContextType } = require('discord.js');
const { get_blacklist, add_blacklist, remove_blacklist, notified_blacklist } = require(`../utils/database.js`);
const { get_player_uuid, get_player_name } = require(`../utils/get_player_info.js`);
const fs = require('fs')
const Logger = require('../utils/logger.js');
const toml = require('toml');

const MAX_FIELDS_PER_EMBED = 10;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('黑名單')
		.setDescription('設定黑名單')
		.setContexts(InteractionContextType.Guild)
		.addSubcommand(subcommand =>
			subcommand
				.setName('新增')
				.setNameLocalizations({
					"en-US": "add",
					"zh-TW": "新增"
				})
				.setDescription('將玩家新增至黑名單')
				.setDescriptionLocalizations({
					"en-US": "add a player to the blacklist",
					"zh-TW": "將玩家新增至黑名單"
				})
				.addStringOption(option =>
					option
						.setName('玩家名稱')
						.setRequired(true)
						.setNameLocalizations({
							"en-US": "player-name",
							"zh-TW": "玩家名稱"
						})
						.setDescription('要新增至黑名單的玩家名稱')
						.setDescriptionLocalizations({
							"en-US": "the name of the player to add to the blacklist",
							"zh-TW": "要新增至黑名單的玩家名稱"
						})
				)
                .addStringOption(option =>
                    option
                        .setName('時間')
                        .setRequired(true)
                        .setNameLocalizations({
                            "en-US": "time",
                            "zh-TW": "時間"
                        })
                        .setDescription('處分時間')
                        .setDescriptionLocalizations({
                            "en-US": "the time of the punishment, format is number + unit, e.g. 1d, 1w, 1m, 1y",
                            "zh-TW": "處分時間，格式為數字+單位，例如 1d, 1w, 1m, 1y"
                        })
                )
                .addStringOption(option =>
                    option
                        .setName('原因')
                        .setRequired(false)
                        .setNameLocalizations({
                            "en-US": "reason",
                            "zh-TW": "原因"
                        })
                        .setDescription('新增至黑名單的原因')
                        .setDescriptionLocalizations({
                            "en-US": "the reason to add the player to the blacklist",
                            "zh-TW": "新增至黑名單的原因"
                        })
                )
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('移除')
				.setNameLocalizations({
					"en-US": "remove",
					"zh-TW": "移除"
				})
				.setDescription('將玩家從黑名單移除')
				.setDescriptionLocalizations({
					"en-US": "remove a player from the blacklist",
					"zh-TW": "將玩家從黑名單移除"
				})
				.addStringOption(option =>
					option
						.setName('玩家名稱')
						.setRequired(true)
						.setNameLocalizations({
							"en-US": "player-name",
							"zh-TW": "玩家名稱"
						})
						.setDescription('要從黑名單移除的玩家名稱')
						.setDescriptionLocalizations({
							"en-US": "the name of the player to remove from the blacklist",
							"zh-TW": "要從黑名單移除的玩家名稱"
						})
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('列出')
				.setNameLocalizations({
					"en-US": "list",
					"zh-TW": "列出"
				})
				.setDescription('列出所有黑名單中的玩家')
				.setDescriptionLocalizations({
					"en-US": "list all players in the blacklist",
					"zh-TW": "列出所有黑名單中的玩家"
				})
		),

	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const player_name = ['新增', '移除'].includes(subcommand) ? interaction.options.getString('玩家名稱') : null;
        const player_uuid = ['新增', '移除'].includes(subcommand) ? await get_player_uuid(player_name) : null;
        const blacklist = await get_blacklist();
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        switch (subcommand) {
            case '新增':
                if (!player_uuid || player_uuid == 'Not Found' || player_uuid == 'Unexpected Error') {
                    await interaction.editReply({ content: '找不到該玩家' });
                    return;
                }

                // check if the player is already in the blacklist
                if (blacklist == 'Unexpected Error') {
                    await interaction.editReply({ content: '無法新增玩家至黑名單' });
                    return;
                }
                
                //[ 
                //     {
                //         player_uuid: '932e7d14b5be4642920ad9012da11441',
                //         time: 1739803671294,
                //         last: 86400,
                //         reason: '無',
                //         notified: 'false'
                //     }
                // ]

                for (let i of blacklist) {
                    if (i.player_uuid == player_uuid) {
                        await interaction.editReply({ content: '該玩家已在黑名單中' });
                        return;
                    }
                }

                // time format: 1d, 1w, 1m, 1y
                // parse time format to time
                let time = interaction.options.getString('時間');
                const time_unit = time.slice(-1);
                const time_value = parseInt(time.slice(0, -1));

                switch (time_unit) {
                    case 'd':
                        time = time_value * 24 * 60 * 60;
                        break;
                    case 'w':
                        time = time_value * 7 * 24 * 60 * 60 ;
                        break;
                    case 'm':
                        time = time_value * 30 * 24 * 60 * 60;
                        break;
                    case 'y':
                        time = time_value * 365 * 24 * 60 * 60;
                        break;
                    default:
                        await interaction.editReply({ content: '時間格式錯誤' });
                        return;
                }

                const add_result = await add_blacklist(player_uuid, time, interaction.options.getString('原因') || '無');
                if (add_result == 'Unexpected Error') {
                    await interaction.editReply({ content: '無法新增玩家至黑名單' });
                    return;
                }

                await interaction.editReply({ content: '已新增玩家至黑名單' });
                break;

            case '移除':
                if (!player_uuid || player_uuid == 'Not Found' || player_uuid == 'Unexpected Error') {
                    await interaction.editReply({ content: '找不到詀玩家' });
                    return;
                }

                // check if the player is in the blacklist
                if (blacklist == 'Unexpected Error') {
                    await interaction.editReply({ content: '無法將玩家從黑名單刪除' });
                    return;
                }

                let is_in_blacklist = false;
                for (let i of blacklist) {
                    if (i.player_uuid == player_uuid) {
                        is_in_blacklist = true;
                        break;
                    }
                }

                if (!is_in_blacklist) {
                    await interaction.editReply({ content: '該玩家不在黑名單中' });
                    return;
                }

                const remove_result = await remove_blacklist(player_uuid);
                if (remove_result == 'Unexpected Error') {
                    await interaction.editReply({ content: '無法將玩家從黑名單刪除' });
                    return;
                }

                await interaction.editReply({ content: '已成功將玩家從黑名單刪除' });
                break;

            case '列出':
                if (blacklist == 'Unexpected Error') {
                    await interaction.editReply({ content: '無法列出黑名單中的玩家' });
                    return;
                }

                let currentPage = 0;
                const totalPages = Math.ceil(blacklist.length / MAX_FIELDS_PER_EMBED);

                const generateEmbed = async (page) => {
                    const start = page * MAX_FIELDS_PER_EMBED;
                    const end = start + MAX_FIELDS_PER_EMBED;
                    const currentBlacklist = blacklist.slice(start, end);

                    const embed = new EmbedBuilder()
                        .setTitle('黑名單')
                        .setDescription('以下是黑名單中的玩家')
                        .setColor('#FF0000')
                        .setTimestamp();

                    for (const player of currentBlacklist) {
                        const playerName = await get_player_name(player.player_uuid) || '發生錯誤';
                        const unbanTime = `<t:${Math.floor((player.time + player.last))}:F>`;
                        embed.addFields({ name: playerName, value: `UUID | ${player.player_uuid}\n解除時間 | ${unbanTime}` });
                    }

                    return embed;
                };

                const generateRow = (currentPage, totalPages) => {
                    return new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous')
                                .setLabel('上一頁')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('下一頁')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === totalPages - 1)
                        );
                };

                const message = await interaction.editReply({ embeds: [await generateEmbed(currentPage)], components: [generateRow(currentPage, totalPages)] });

                const collector = message.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async i => {
                    if (i.customId === 'previous') {
                        currentPage--;
                    } else if (i.customId === 'next') {
                        currentPage++;
                    }

                    await i.update({ embeds: [await generateEmbed(currentPage)], components: [generateRow(currentPage, totalPages)] });
                });

                collector.on('end', collected => {
                    const row = generateRow(currentPage, totalPages);
                    row.components.forEach(button => button.setDisabled(true));
                    //message.edit({ components: [row] });
                });

                break;
        }
    }
};