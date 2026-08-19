const { expect, test } = require('bun:test');
const McBot = require('./mcBot');

const bot = new McBot({ username: 'mcf-bet-bot' }, null);

test('私訊指令格式', () => {
    for (const line of [
        '[Jimmy4Real -> 您] wallet',
        '[Jimmy4Real → 您] wallet',
        '[Jimmy4Real -> 您]wallet'
    ]) {
        const m = line.match(bot.commandRegex);
        expect(m?.[1]).toBe('Jimmy4Real');
        expect(m?.[2]).toBe('wallet');
    }

    expect('[閒聊] Jimmy4Real: wallet'.match(bot.commandRegex)).toBeNull();
    expect('[Jimmy4Real -> 您] epay Someone 100'.match(bot.commandRegex).slice(1))
        .toEqual(['Jimmy4Real', 'epay', 'Someone 100']);
});

test('登入後就會註冊聊天格式 (不必等 spawn)', () => {
    const added = [];
    bot.bot = { addChatPattern: (n) => added.push(n), on: () => {}, logger: { log: () => {}, warn: () => {} } };
    bot._ensureChatPatterns();
    expect(added).toEqual(['command', 'getEmerald', 'getCoin', 'tpRequest']);
});
