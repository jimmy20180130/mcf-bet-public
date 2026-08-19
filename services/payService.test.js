const { expect, test } = require('bun:test');
const { EventEmitter } = require('events');
const PayService = require('./payService');

test('coin payment uses the two-step server flow', async () => {
    const sent = [];
    const bot = new EventEmitter();

    bot.logger = { info() {}, error() {}, warn() {} };
    bot.addChatPattern = () => {};
    bot.waitForTicks = async (ticks) => expect(ticks).toBe(30);
    bot.sendMsg = async (message) => {
        sent.push(message);
        if (sent.length === 2) {
            queueMicrotask(() => bot.emit('chat:cpaySuccess', [['10', undefined, '90', undefined]]));
        }
    };

    const result = await new PayService(bot).pay('ExamplePlayer', 10, 'coin');

    expect(sent).toEqual(['/cointrans ExamplePlayer 10', 'ExamplePlayer']);
    expect(result).toEqual({ success: true, target: 'ExamplePlayer', amount: 10, currency: 'coin' });
});

test('資料忙碌中會立刻失敗，不用等 10 秒逾時', async () => {
    const bot = new EventEmitter();
    const patterns = [];

    bot.logger = { info() {}, error() {}, warn() {} };
    bot.addChatPattern = (name, regex) => patterns.push({ name, regex });
    bot.sendMsg = async () => {
        queueMicrotask(() => {
            const p = patterns.find(x => x.name === 'dataBusy');
            expect('[系統] 資料忙碌中, 請稍後再試. '.match(p.regex)).not.toBeNull();
            bot.emit('chat:dataBusy', [[]]);
        });
    };

    const err = await new PayService(bot).pay('ExamplePlayer', 100).catch(e => e);

    expect(err.success).toBe(false);
    expect(err.error.code).toBe('dataBusy');
    expect(err.error.message).toBe('伺服器資料忙碌中，請稍後再試');
});
