function normalizeBotKey(value) {
    return String(value || '').trim().toLowerCase();
}

function getBotKeyFromConfigBot(botConfig) {
    return normalizeBotKey(botConfig?.username);
}

function getBotKeyFromRuntimeBot(bot) {
    // Prefer the key bound from config username, then fallback to runtime fields.
    return normalizeBotKey(bot?.botKey || bot?.options?.username);
}

function resolveBotKeyFromIdentifier(configBots, identifier) {
    const normalizedIdentifier = normalizeBotKey(identifier);
    if (!normalizedIdentifier) {
        return '';
    }

    const bot = (configBots || []).find((entry) => {
        return getBotKeyFromConfigBot(entry) === normalizedIdentifier
            || normalizeBotKey(entry?.username) === normalizedIdentifier
            || normalizeBotKey(entry?.key) === normalizedIdentifier;
    });

    return bot ? getBotKeyFromConfigBot(bot) : '';
}

function findConfigBotByKey(configBots, botKey) {
    const resolvedKey = resolveBotKeyFromIdentifier(configBots, botKey);
    return (configBots || []).find(bot => getBotKeyFromConfigBot(bot) === resolvedKey) || null;
}

module.exports = {
    normalizeBotKey,
    getBotKeyFromConfigBot,
    getBotKeyFromRuntimeBot,
    resolveBotKeyFromIdentifier,
    findConfigBotByKey
};