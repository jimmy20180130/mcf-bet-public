const User = require('../../models/User');
const PlayerStats = require('../../models/PlayerStats');
const { t } = require('../../utils/i18n');
const { readConfig } = require('../../services/configService');
const { getBotKeyFromConfigBot, getBotKeyFromRuntimeBot } = require('../../utils/botKey');
const { entries } = require('./manifest');

const commands = new Map();

for (const { load } of entries) {
    const command = load();
    commands.set(command.name, command);
    if (command.aliases) {
        command.aliases.forEach(alias => {
            commands.set(alias, command);
        });
    }
}

async function executeCommand(bot, sender, command, args) {
    const cmd = commands.get(command);
    if (!cmd) return;

    const botKey = getBotKeyFromRuntimeBot(bot);
    if (sender.toLowerCase() === botKey) {
        return;
    }

    let user = User.getByPlayerId(sender);
    if (!user) {
        const playeruuid = await bot.MinecraftDataService.getPlayerId(sender);
        if (!playeruuid) return;

        User.create({ playerid: sender, playeruuid });
        user = User.getByPlayerId(sender);
    }

    if (!user) {
        bot.sendMsg(t('mc.command.unexpectedError', { sender }));
        bot.logger.error(`無法找到且無法創建使用者資料: ${sender}`);
        return;
    }

    PlayerStats.get(user.playeruuid, botKey);

    const config = readConfig();

    let isAdmin = false;
    config.bots.forEach(botConfig => {
        if (getBotKeyFromConfigBot(botConfig) === botKey) {
            if (botConfig.whitelist.includes(sender)) {
                isAdmin = true;
            }
        }
    });

    if (config.general.whitelist.includes(sender)) {
        isAdmin = true;
    }

    try {
        if (cmd.requireAdmin && !isAdmin) {
            return;
        }

        await cmd.execute(bot, command, sender, args);
    } catch (err) {
        bot.logger.error(`執行指令 ${command} 時發生錯誤: ${err.stack || err}`);
        bot.sendMsg(t('mc.command.internalError', { sender, command }));
    }
}

module.exports = {
    executeCommand
};