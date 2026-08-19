const { expect, test } = require('bun:test');
const RoleSyncService = require('./roleSyncService');

// 不跑 constructor (會建 timer / 需要 discord client)
const svc = Object.create(RoleSyncService.prototype);

const ranks = [
    { id: 1, displayName: '未綁定', daily: {}, bonusodds: 0 },
    { id: 2, displayName: '贊助者', daily: { e: 100, c: 2 }, bonusodds: 0.1 },
    { id: 3, displayName: '老玩家', daily: { e: 50 }, bonusodds: 0.05 }
];

test('簽到獎勵是所有身份組加總', () => {
    expect(svc._sumDailyReward(ranks)).toEqual({ e: 150, c: 2 });
    expect(svc._sumDailyReward([])).toEqual({ e: 0, c: 0 });
});

test('賠率加成是所有身份組加總', () => {
    expect(svc._sumBonusOdds(ranks)).toBeCloseTo(0.15);
    expect(svc._sumBonusOdds([])).toBe(0);
});
