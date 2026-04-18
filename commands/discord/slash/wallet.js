const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/User');
const PlayerStats = require('../../../models/PlayerStats');
const minecraftDataService = require('../../../services/minecraftDataService');
const { readConfig } = require('../../../services/configService');
const { tForInteraction } = require('../../../utils/i18n');
const { getBotKeyFromConfigBot, normalizeBotKey, findConfigBotByKey } = require('../../../utils/botKey');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wallet')
        .setNameLocalizations({
            'zh-TW': '錢包'
        })
        .setDescription('Query a player\'s wallet')
        .setDescriptionLocalizations({
            'zh-TW': '查詢玩家錢包'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('query')
                .setNameLocalizations({
                    'zh-TW': '查詢'
                })
                .setDescription('Query a player\'s wallet')
                .setDescriptionLocalizations({
                    'zh-TW': '查詢玩家錢包'
                })
                .addStringOption(option =>
                    option
                        .setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('The bot to query')
                        .setDescriptionLocalizations({
                            'zh-TW': '要查詢的機器人'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家'
                        })
                        .setDescription('The player to query')
                        .setDescriptionLocalizations({
                            'zh-TW': '要查詢的玩家'
                        })
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setNameLocalizations({
                    'zh-TW': '增加'
                })
                .setDescription('Add money to a player\'s wallet')
                .setDescriptionLocalizations({
                    'zh-TW': '增加玩家錢包的錢'
                })
                .addStringOption(option =>
                    option
                        .setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('The bot to add money to')
                        .setDescriptionLocalizations({
                            'zh-TW': '要增加錢的機器人'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家'
                        })
                        .setDescription('The player to add money to')
                        .setDescriptionLocalizations({
                            'zh-TW': '要增加錢的玩家'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('eamount')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石數量'
                        })
                        .setDescription('The amount of money to add')
                        .setDescriptionLocalizations({
                            'zh-TW': '要增加的綠寶石數量'
                        })
                )
                .addIntegerOption(option =>
                    option
                        .setName('camount')
                        .setNameLocalizations({
                            'zh-TW': '村民錠數量'
                        })
                        .setDescription('The amount of money to add')
                        .setDescriptionLocalizations({
                            'zh-TW': '要增加的村民錠數量'
                        })
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setNameLocalizations({
                    'zh-TW': '減少'
                })
                .setDescription('Remove money from a player\'s wallet')
                .setDescriptionLocalizations({
                    'zh-TW': '減少玩家錢包的錢'
                })
                .addStringOption(option =>
                    option
                        .setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('The bot to remove money from')
                        .setDescriptionLocalizations({
                            'zh-TW': '要減少錢的機器人'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家'
                        })
                        .setDescription('The player to remove money from')
                        .setDescriptionLocalizations({
                            'zh-TW': '要減少錢的玩家'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('eamount')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石數量'
                        })
                        .setDescription('The amount of money to remove')
                        .setDescriptionLocalizations({
                            'zh-TW': '要減少的綠寶石數量'
                        })
                )
                .addIntegerOption(option =>
                    option
                        .setName('camount')
                        .setNameLocalizations({
                            'zh-TW': '村民錠數量'
                        })
                        .setDescription('The amount of money to remove')
                        .setDescriptionLocalizations({
                            'zh-TW': '要減少的村民錠數量'
                        })
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setNameLocalizations({
                    'zh-TW': '設定'
                })
                .setDescription('Set a player\'s wallet to a specific amount')
                .setDescriptionLocalizations({
                    'zh-TW': '將玩家錢包設定為特定數量'
                })
                .addStringOption(option =>
                    option
                        .setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('The bot to set money for')
                        .setDescriptionLocalizations({
                            'zh-TW': '要設定錢的機器人'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家'
                        })
                        .setDescription('The player to set money for')
                        .setDescriptionLocalizations({
                            'zh-TW': '要設定錢的玩家'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('eamount')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石數量'
                        })
                        .setDescription('The amount of money to set')
                        .setDescriptionLocalizations({
                            'zh-TW': '要設定的綠寶石數量'
                        })
                )
                .addIntegerOption(option =>
                    option
                        .setName('camount')
                        .setNameLocalizations({
                            'zh-TW': '村民錠數量'
                        })
                        .setDescription('The amount of money to set')
                        .setDescriptionLocalizations({
                            'zh-TW': '要設定的村民錠數量'
                        })
                )
        ),
    autocomplete,
    execute
};

async function autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value;

    if (focusedOption.name === 'player' && interaction.member.permissions.has('Administrator')) {
        const choices = User.searchPlayers(focusedValue);
        await interaction.respond(
            choices.map(choice => ({ name: choice.playerid, value: choice.playerid }))
        );
        return;
    }

    if (focusedOption.name === 'bot') {
        const config = readConfig();

        const choices = await Promise.all(config.bots.map(async bot => ({
            botid: bot.username,
            botkey: getBotKeyFromConfigBot(bot)
        }))).then(results => results.filter(bot => bot.botid.includes(focusedValue)));

        await interaction.respond(
            choices.map(choice => ({
                name: choice.botid,
                value: choice.botkey
            }))
        );
    }
}

async function execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const subcommand = interaction.options.getSubcommand();
    const botKey = normalizeBotKey(interaction.options.getString('bot'));

    const config = readConfig();
    const botConfig = findConfigBotByKey(config.bots, botKey);
    const botName = botConfig?.username || botKey;

    if (subcommand === 'query') {
        const playerInput = interaction.options.getString('player');
        let targetUser = null;

        if (playerInput) {
            targetUser = User.getByPlayerId(playerInput) || User.getByUuid(playerInput);
        } else {
            targetUser = User.getByDiscordId(interaction.user.id);
            if (!targetUser) {
                await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.selfNotLinked') });
                return;
            }
        }

        if (!targetUser) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.targetNotFound') });
            return;
        }

        const stats = PlayerStats.get(targetUser.playeruuid, botKey);
        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.wallet.querySummary', {
                playerId: targetUser.playerid,
                botName,
                emerald: stats.emerald || 0,
                coin: stats.coin || 0
            })
        });
        return;
    }

    if (!interaction.member?.permissions?.has('Administrator')) {
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.noPermission') });
        return;
    }

    const playerInput = interaction.options.getString('player');
    const targetUser = await resolveOrCreateUser(playerInput);
    if (!targetUser) {
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.invalidPlayer') });
        return;
    }

    const eamount = interaction.options.getInteger('eamount');
    const camount = interaction.options.getInteger('camount');

    if (eamount === null && camount === null) {
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.needAmount') });
        return;
    }

    if (subcommand === 'add') {
        if ((eamount !== null && eamount <= 0) || (camount !== null && camount <= 0)) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.addAmountInvalid') });
            return;
        }

        PlayerStats.updateWallet(targetUser.playeruuid, botKey, {
            eChange: eamount || 0,
            cChange: camount || 0
        });

        const updated = PlayerStats.get(targetUser.playeruuid, botKey);
        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.wallet.addSummary', {
                playerId: targetUser.playerid,
                botName,
                emerald: updated.emerald || 0,
                coin: updated.coin || 0
            })
        });
        return;
    }

    if (subcommand === 'remove') {
        if ((eamount !== null && eamount <= 0) || (camount !== null && camount <= 0)) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.removeAmountInvalid') });
            return;
        }

        const current = PlayerStats.get(targetUser.playeruuid, botKey);
        const nextEmerald = (current.emerald || 0) - (eamount || 0);
        const nextCoin = (current.coin || 0) - (camount || 0);

        if (nextEmerald < 0 || nextCoin < 0) {
            await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.balanceCannotNegative') });
            return;
        }

        PlayerStats.updateWallet(targetUser.playeruuid, botKey, {
            eChange: -(eamount || 0),
            cChange: -(camount || 0)
        });

        const updated = PlayerStats.get(targetUser.playeruuid, botKey);
        await interaction.editReply({
            content: tForInteraction(interaction, 'dc.wallet.removeSummary', {
                playerId: targetUser.playerid,
                botName,
                emerald: updated.emerald || 0,
                coin: updated.coin || 0
            })
        });
        return;
    }

    if ((eamount !== null && eamount < 0) || (camount !== null && camount < 0)) {
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.wallet.setAmountInvalid') });
        return;
    }

    const current = PlayerStats.get(targetUser.playeruuid, botKey);
    const targetEmerald = eamount !== null ? eamount : (current.emerald || 0);
    const targetCoin = camount !== null ? camount : (current.coin || 0);

    PlayerStats.updateWallet(targetUser.playeruuid, botKey, {
        eChange: targetEmerald - (current.emerald || 0),
        cChange: targetCoin - (current.coin || 0)
    });

    const updated = PlayerStats.get(targetUser.playeruuid, botKey);
    await interaction.editReply({
        content: tForInteraction(interaction, 'dc.wallet.setSummary', {
            playerId: targetUser.playerid,
            botName,
            emerald: updated.emerald || 0,
            coin: updated.coin || 0
        })
    });
}

function isValidUuid(value) {
    const normalized = value.replace(/-/g, '').toLowerCase();
    return /^[0-9a-f]{32}$/.test(normalized);
}

async function resolveOrCreateUser(playerInput) {
    if (!playerInput) return null;

    const known = User.getByPlayerId(playerInput) || User.getByUuid(playerInput);
    if (known) return known;

    const normalizedInput = playerInput.replace(/-/g, '').toLowerCase();
    let playeruuid = null;
    let playerid = null;

    if (isValidUuid(playerInput)) {
        playeruuid = normalizedInput;
        playerid = await minecraftDataService.getPlayerId(normalizedInput) || playerInput;
    } else {
        playerid = playerInput;
        playeruuid = await minecraftDataService.getPlayerUuid(playerInput);
    }

    if (!playeruuid) return null;

    User.create({ playeruuid, playerid });
    return User.getByUuid(playeruuid) || User.getByPlayerId(playerid);
}
