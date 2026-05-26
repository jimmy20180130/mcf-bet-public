const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Database } = require('bun:sqlite');
const toml = require('smol-toml');
const { normalizeBotKey } = require('../utils/botKey');
const { normalizeUuid } = require('../utils/identifier');

const SOURCE_SCHEMA = {
    users: `
CREATE TABLE IF NOT EXISTS users (
    playeruuid TEXT PRIMARY KEY,
    playerid TEXT,
    discordid TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
`,
    ranks: `
CREATE TABLE IF NOT EXISTS ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    discordid TEXT DEFAULT '',
    daily TEXT DEFAULT '{}',
    bonusodds REAL DEFAULT 0,
    bot TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
`,
    playerStats: `
CREATE TABLE IF NOT EXISTS playerStats (
    playeruuid TEXT NOT NULL,
    bot TEXT NOT NULL,
    rankId INTEGER,
    emerald REAL DEFAULT 0,
    coin REAL DEFAULT 0,
    PRIMARY KEY (playeruuid, bot),
    FOREIGN KEY (playeruuid) REFERENCES users(playeruuid) ON DELETE CASCADE,
    FOREIGN KEY (rankId) REFERENCES ranks(id) ON DELETE SET NULL
);
`,
    signInRecords: `
CREATE TABLE IF NOT EXISTS signInRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playeruuid TEXT NOT NULL,
    bot TEXT NOT NULL,
    rewardAmount TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playeruuid) REFERENCES users(playeruuid) ON DELETE CASCADE
);
`,
    betRecords: `
CREATE TABLE IF NOT EXISTS betRecords (
    betuuid TEXT PRIMARY KEY,
    playeruuid TEXT NOT NULL,
    bot TEXT NOT NULL,
    playerid TEXT,
    currency TEXT,
    amount REAL,
    result TEXT,
    odds REAL,
    bonusodds REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playeruuid) REFERENCES users(playeruuid) ON DELETE CASCADE
);
`,
    recordTemplates: `
CREATE TABLE IF NOT EXISTS recordTemplates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerDiscordId TEXT NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    filters TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ownerDiscordId, name)
);
`
};

function parseArgs(argv) {
    const positional = argv.filter((arg) => !arg.startsWith('--'));
    const force = argv.includes('--force');

    if (positional.length < 3) {
        throw new Error('參數不足');
    }

    return {
        sourcePath: path.resolve(positional[0]),
        outputPath: path.resolve(positional[1]),
        botName: String(positional[2] || '').trim(),
        force
    };
}

function getUsageText() {
    return '用法: bun run migrate.js <old_db_path> <output_path> <botName> [--force]';
}

function ensureDirectory(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeMaybeUuid(value) {
    return String(value || '').replace(/-/g, '').trim().toLowerCase();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMigrationUuid(value) {
    return normalizeUuid(String(value || ''));
}

function logInvalidUuid(context, rawValue, sourceRowId) {
    console.error(`[migrate] 跳過無效 playeruuid (${context}${sourceRowId ? `#${sourceRowId}` : ''}): ${String(rawValue || '').trim()}`);
}

function collectRowsByUuid(rows, tableName) {
    const rowsByUuid = new Map();

    for (const row of rows) {
        const playeruuid = normalizeMigrationUuid(row.player_uuid);
        if (!playeruuid) {
            logInvalidUuid(tableName, row.player_uuid, row.sourceRowId);
            continue;
        }

        if (!rowsByUuid.has(playeruuid)) {
            rowsByUuid.set(playeruuid, []);
        }

        rowsByUuid.get(playeruuid).push({
            ...row,
            playeruuid
        });
    }

    return rowsByUuid;
}

function toIsoDateTimeFromUnixSeconds(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function toIsoDateTimeFromDayCode(dateCode) {
    const text = String(dateCode || '');
    const match = text.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]} 00:00:00`;
}

function parseRewardAmount(dateCode) {
    const text = String(dateCode || '');
    const parts = text.split('|');
    const amount = Number(String(parts[2] || '').replace(/,/g, ''));

    return {
        e: Number.isFinite(amount) ? amount : 0,
        c: 0
    };
}

function buildRewardAmount(dateCode) {
    return JSON.stringify(parseRewardAmount(dateCode));
}

function buildBetUuid(row, seenBetUuids) {
    const sourceBetUuid = normalizeMaybeUuid(row.bet_uuid);
    let nextBetUuid = /^[0-9a-f]{32}$/.test(sourceBetUuid) ? sourceBetUuid : '';

    if (!nextBetUuid) {
        nextBetUuid = crypto.randomUUID().replace(/-/g, '');
    }

    while (!nextBetUuid || seenBetUuids.has(nextBetUuid)) {
        nextBetUuid = crypto.randomUUID().replace(/-/g, '');
    }

    seenBetUuids.add(nextBetUuid);
    return nextBetUuid;
}

function parseConfigText(configPath) {
    const content = fs.readFileSync(configPath, 'utf-8');
    return toml.parse(content);
}

function loadBotKey(botName) {
    const normalizedBotName = normalizeBotKey(botName);
    if (!normalizedBotName) {
        throw new Error('botName 不能為空。');
    }

    const candidates = [path.resolve('config.toml'), path.resolve('config.local.toml')].filter((filePath) => fs.existsSync(filePath));
    for (const configPath of candidates) {
        const config = parseConfigText(configPath);
        const bot = (config.bots || []).find((entry) => normalizeBotKey(entry?.username) === normalizedBotName);
        if (bot) {
            return normalizeBotKey(bot.username);
        }
    }

    return normalizedBotName;
}

function createSchema(db) {
    db.run('PRAGMA foreign_keys = ON;');
    db.run(SOURCE_SCHEMA.users);
    db.run(SOURCE_SCHEMA.ranks);
    db.run(SOURCE_SCHEMA.playerStats);
    db.run(SOURCE_SCHEMA.signInRecords);
    db.run(SOURCE_SCHEMA.betRecords);
    db.run(SOURCE_SCHEMA.recordTemplates);
}

function tableExists(db, tableName) {
    const row = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1").get(tableName);
    return Boolean(row);
}

function getTableColumns(db, tableName) {
    return db.query(`PRAGMA table_info(${tableName})`).all().map((row) => String(row.name));
}

function parseDailyValue(value) {
    if (value === null || value === undefined || value === '') return { e: 0, c: 0 };

    if (typeof value === 'number') {
        return {
            e: Number.isFinite(value) ? value : 0,
            c: 0
        };
    }

    if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return { e: numeric, c: 0 };
        }

        try {
            const parsed = JSON.parse(value);
            return {
                e: Number(parsed?.e || 0),
                c: Number(parsed?.c || 0)
            };
        } catch {
            return { e: 0, c: 0 };
        }
    }

    if (typeof value === 'object') {
        return {
            e: Number(value?.e || 0),
            c: Number(value?.c || 0)
        };
    }

    return { e: 0, c: 0 };
}

function loadRolesFromJson(sourcePath) {
    const rolesJsonPath = path.resolve(path.dirname(sourcePath), 'roles.json');
    if (!fs.existsSync(rolesJsonPath)) {
        return [];
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(rolesJsonPath, 'utf-8'));
        if (!parsed || typeof parsed !== 'object') {
            return [];
        }

        return Object.entries(parsed).map(([discordid, data], index) => ({
            sourceRowId: index + 1,
            displayName: data?.name,
            discordid: data?.discord_id || discordid,
            daily: data?.daily,
            bonusodds: data?.bonusodds ?? 0
        }));
    } catch {
        return [];
    }
}

function migrateRanksFromSource(sourceDb, outputDb, botKey, sourcePath) {
    const rolesFromJson = loadRolesFromJson(sourcePath);
    const hasRolesTable = tableExists(sourceDb, 'roles');
    const rows = rolesFromJson.length > 0
        ? rolesFromJson
        : (hasRolesTable ? sourceDb.query('SELECT rowid AS sourceRowId, * FROM roles ORDER BY rowid ASC').all() : []);

    const inserted = [];
    if (rows.length === 0) {
        return inserted;
    }

    const columns = hasRolesTable ? new Set(getTableColumns(sourceDb, 'roles')) : new Set();
    const insertRank = outputDb.query(`
        INSERT INTO ranks (displayName, discordid, daily, bonusodds, bot)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (const row of rows) {
        const displayName = String(
            row.displayName
            || row.name
            || ''
        ).trim();
        if (!displayName) continue;

        const discordid = String(
            row.discordid
            || row.discord_id
            || ''
        ).trim();

        const bonusodds = Number(
            row.bonusodds
            ?? 0
        );

        let daily = { e: 0, c: 0 };
        if (columns.has('daily')) {
            daily = parseDailyValue(row.daily);
        } else {
            daily = {
                e: Number(row.daily_emerald ?? row.daily ?? 0),
                c: Number(row.daily_coin ?? 0)
            };
        }

        const existed = outputDb.query(`
            SELECT id
            FROM ranks
            WHERE bot = ?
              AND lower(displayName) = lower(?)
            LIMIT 1
        `).get(botKey, displayName);

        if (existed) {
            inserted.push({ sourceRowId: row.sourceRowId, id: existed.id, displayName, discordid });
            continue;
        }

        const result = insertRank.run(displayName, discordid, JSON.stringify(daily), Number.isFinite(bonusodds) ? bonusodds : 0, botKey);
        inserted.push({ sourceRowId: row.sourceRowId, id: Number(result.lastInsertRowid), displayName, discordid });
    }

    return inserted;
}

function ensureDefaultRole(db, botKey) {
    db.query(`
        INSERT OR IGNORE INTO ranks (id, displayName, discordid, daily, bonusodds, bot)
        VALUES (1, '未綁定', '', ?, 0, ?)
    `).run(JSON.stringify({ e: 0, c: 0 }), botKey);

    return db.query(`
        SELECT *
        FROM ranks
        WHERE bot = ?
          AND displayName = '未綁定'
        ORDER BY id ASC
        LIMIT 1
    `).get(botKey);
}

function formatNowAsSqliteDatetime() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function lookupPlayerIdByUuid(playeruuid, cache) {
    const normalizedUuid = normalizeMigrationUuid(playeruuid);
    if (!normalizedUuid) return { status: 'invalid', playerid: null };

    if (cache.has(normalizedUuid)) {
        return cache.get(normalizedUuid);
    }

    const urls = [
        `https://sessionserver.mojang.com/session/minecraft/profile/${normalizedUuid}`,
        `https://api.mojang.com/users/profiles/minecraft/${normalizedUuid}`,
        `https://playerdb.co/api/player/minecraft/${normalizedUuid}`
    ];

    async function fetchJsonWithTimeout(url, timeoutMs = 3000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (response.status === 404 || response.status === 204) {
                return { status: 'not_found' };
            }

            if (!response.ok) {
                return {
                    status: 'error',
                    message: `HTTP ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json();
            return {
                status: 'ok',
                data
            };
        } catch (error) {
            return {
                status: 'error',
                message: error?.message || String(error)
            };
        } finally {
            clearTimeout(timer);
        }
    }

    await sleep(750);

    let sawNotFound = false;
    let sawError = false;

    for (const url of urls) {
        console.log(`[migrate] Minecraft API 查詢 uuid=${normalizedUuid} url=${url}`);

        const result = await fetchJsonWithTimeout(url);
        if (result.status === 'ok') {
            const data = result.data;
            let playerId = '';

            if (url.includes('playerdb.co')) {
                if (data?.success === false) {
                    sawNotFound = true;
                    continue;
                }

                playerId = String(data?.data?.player?.username || '').trim();
            } else if (Array.isArray(data)) {
                playerId = String(data[data.length - 1]?.name || '').trim();
            } else {
                playerId = String(data?.name || data?.username || '').trim();
            }

            if (playerId) {
                const cachedResult = { status: 'found', playerid: playerId };
                cache.set(normalizedUuid, cachedResult);
                return cachedResult;
            }

            sawError = true;
            console.error(`[migrate] Minecraft API 回應缺少 playerid uuid=${normalizedUuid} url=${url}`);
            continue;
        }

        if (result.status === 'not_found') {
            sawNotFound = true;
            continue;
        }

        sawError = true;
        console.error(`[migrate] Minecraft API 失敗 uuid=${normalizedUuid} url=${url} reason=${result.message || 'unknown'}`);
    }

    const cachedResult = sawNotFound
        ? { status: 'not_found', playerid: null }
        : { status: 'error', playerid: null };

    cache.set(normalizedUuid, cachedResult);
    return cachedResult;
}

function readTable(db, table) {
    if (!tableExists(db, table)) {
        return [];
    }
    return db.query(`SELECT rowid AS sourceRowId, * FROM ${table} ORDER BY rowid ASC`).all();
}

async function mapWithConcurrency(items, limit, worker) {
    const safeLimit = Math.max(1, Number(limit || 1));
    let cursor = 0;

    async function runOne() {
        while (true) {
            const current = cursor;
            cursor += 1;
            if (current >= items.length) {
                return;
            }
            await worker(items[current], current);
        }
    }

    await Promise.all(Array.from({ length: Math.min(safeLimit, items.length) }, () => runOne()));
}

async function main() {
    const { sourcePath, outputPath, botName, force } = parseArgs(process.argv.slice(2));

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`找不到來源資料庫: ${sourcePath}`);
    }

    ensureDirectory(outputPath);

    if (fs.existsSync(outputPath)) {
        const outputDbProbe = new Database(outputPath);
        try {
            const hasData = ['users', 'ranks', 'playerStats', 'signInRecords', 'betRecords', 'recordTemplates']
                .some((table) => {
                    try {
                        return outputDbProbe.query(`SELECT COUNT(*) AS count FROM ${table}`).get().count > 0;
                    } catch {
                        return false;
                    }
                });

            if (hasData && !force) {
                throw new Error(`輸出資料庫已存在資料：${outputPath}。若要覆蓋，請加上 --force。`);
            }
        } finally {
            outputDbProbe.close();
        }

        if (force) {
            fs.rmSync(outputPath, { force: true });
        }
    }

    const sourceDb = new Database(sourcePath);
    const outputDb = new Database(outputPath);
    createSchema(outputDb);

    const botKey = loadBotKey(botName);
    const defaultRole = ensureDefaultRole(outputDb, botKey);
    const migratedRanks = migrateRanksFromSource(sourceDb, outputDb, botKey, sourcePath);
    const roleByDiscordId = new Map(
        outputDb.query('SELECT id, discordid FROM ranks WHERE bot = ? AND discordid != ?').all(botKey, '')
            .map((row) => [String(row.discordid).trim(), Number(row.id)])
    );

    const sourceUsers = readTable(sourceDb, 'user_data');
    const sourceWallets = readTable(sourceDb, 'wallet');
    const sourceDailies = readTable(sourceDb, 'daily');
    const sourceBets = readTable(sourceDb, 'bet_history');

    const usersByUuid = new Map();
    for (const row of sourceUsers) {
        const playeruuid = normalizeMigrationUuid(row.player_uuid);
        if (!playeruuid) {
            logInvalidUuid('user_data', row.player_uuid, row.sourceRowId);
            continue;
        }

        usersByUuid.set(playeruuid, {
            ...row,
            playeruuid
        });
    }

    const walletsByUuid = collectRowsByUuid(sourceWallets, 'wallet');
    const signInRowsByUuid = collectRowsByUuid(sourceDailies, 'daily');

    const playerUuids = new Set([
        ...usersByUuid.keys(),
        ...walletsByUuid.keys(),
        ...signInRowsByUuid.keys(),
        ...sourceBets.map((row) => normalizeMigrationUuid(row.player_uuid)).filter(Boolean)
    ]);

    const playerLookupCache = new Map();
    const seenBetUuids = new Set();
    const insertUser = outputDb.query(`
        INSERT OR REPLACE INTO users (playeruuid, playerid, discordid, createdAt)
        VALUES (?, ?, ?, ?)
    `);
    const insertStats = outputDb.query(`
        INSERT OR REPLACE INTO playerStats (playeruuid, bot, rankId, emerald, coin)
        VALUES (?, ?, ?, ?, ?)
    `);
    const insertSignIn = outputDb.query(`
        INSERT OR REPLACE INTO signInRecords (id, playeruuid, bot, rewardAmount, createdAt)
        VALUES (?, ?, ?, ?, ?)
    `);
    const insertBet = outputDb.query(`
        INSERT OR REPLACE INTO betRecords (betuuid, playeruuid, bot, playerid, currency, amount, result, odds, bonusodds, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const userRows = [];
    const statRows = [];
    const signInRecordRows = [];
    const betRecordRows = [];
    const resolvedPlayerLookupByUuid = new Map();
    const skippedPlayerUuids = new Set();

    const uuidsNeedLookup = [...playerUuids].filter((playeruuid) => {
        const row = usersByUuid.get(playeruuid);
        return !(row && String(row.player_id || '').trim());
    });

    await mapWithConcurrency(uuidsNeedLookup, 1, async (playeruuid) => {
        const resolved = await lookupPlayerIdByUuid(playeruuid, playerLookupCache);
        resolvedPlayerLookupByUuid.set(playeruuid, resolved);
        if (resolved.status === 'not_found') {
            skippedPlayerUuids.add(playeruuid);
            console.error(`[migrate] API 回應 uuid 不存在，跳過 playeruuid=${playeruuid}`);
        }
    });

    for (const playeruuid of playerUuids) {
        if (skippedPlayerUuids.has(playeruuid)) {
            continue;
        }

        const userRow = usersByUuid.get(playeruuid) || null;
        const lookupResult = resolvedPlayerLookupByUuid.get(playeruuid) || { status: 'error', playerid: null };
        const playerid = String(userRow?.player_id || '').trim()
            || lookupResult.playerid
            || '';
        const discordid = userRow?.discord_id ? String(userRow.discord_id).trim() : '';
        const createdAt = userRow?.create_time ? toIsoDateTimeFromUnixSeconds(userRow.create_time) : formatNowAsSqliteDatetime();

        userRows.push({ playeruuid, playerid, discordid, createdAt });
        resolvedPlayerLookupByUuid.set(playeruuid, playerid
            ? { status: 'found', playerid }
            : lookupResult);

        const walletHistory = walletsByUuid.get(playeruuid) || [];
        const walletRow = walletHistory.length > 0
            ? walletHistory.find((row) => Number(row.emerald_amount || 0) !== 0 || Number(row.coin_amount || 0) !== 0) || walletHistory[walletHistory.length - 1]
            : null;

        statRows.push({
            playeruuid,
            bot: botKey,
            rankId: roleByDiscordId.get(String(discordid || '').trim()) || defaultRole.id,
            emerald: Number(walletRow?.emerald_amount || 0),
            coin: Number(walletRow?.coin_amount || 0)
        });

        const dailyRows = signInRowsByUuid.get(playeruuid) || [];
        for (const row of dailyRows) {
            const createdAtForSignIn = toIsoDateTimeFromDayCode(row.date_code);
            if (!createdAtForSignIn) continue;

            signInRecordRows.push({
                id: row.sourceRowId,
                playeruuid,
                bot: botKey,
                rewardAmount: buildRewardAmount(row.date_code),
                createdAt: createdAtForSignIn
            });
        }
    }

    for (const row of sourceBets) {
        const playeruuid = normalizeMigrationUuid(row.player_uuid);
        if (!playeruuid) {
            logInvalidUuid('bet_history', row.player_uuid, row.sourceRowId);
            continue;
        }

        if (skippedPlayerUuids.has(playeruuid)) {
            continue;
        }

        const lookupResult = resolvedPlayerLookupByUuid.get(playeruuid) || { status: 'error', playerid: null };
        let playerid = lookupResult.playerid || '';

        if (!playerid) {
            const resolved = await lookupPlayerIdByUuid(playeruuid, playerLookupCache);
            resolvedPlayerLookupByUuid.set(playeruuid, resolved);

            if (resolved.status === 'not_found') {
                skippedPlayerUuids.add(playeruuid);
                console.error(`[migrate] API 回應 uuid 不存在，跳過 bet_history playeruuid=${playeruuid}`);
                continue;
            }

            playerid = resolved.playerid || '';
        }

        betRecordRows.push({
            betuuid: buildBetUuid(row, seenBetUuids),
            playeruuid,
            bot: botKey,
            playerid: playerid || '',
            currency: row.bet_type === 'coin' || row.bet_type === 'c' ? 'coin' : 'emerald',
            amount: Number(row.amount || 0),
            result: Number(row.result_amount || 0),
            odds: Number(row.odds || 0),
            bonusodds: 0,
            createdAt: toIsoDateTimeFromUnixSeconds(row.time) || formatNowAsSqliteDatetime()
        });
    }

    let totalRanks = 0;
    outputDb.run('BEGIN IMMEDIATE TRANSACTION');
    try {
        for (const row of userRows) {
            insertUser.run(row.playeruuid, row.playerid, row.discordid, row.createdAt);
        }

        for (const row of statRows) {
            insertStats.run(row.playeruuid, row.bot, row.rankId, row.emerald, row.coin);
        }

        for (const row of signInRecordRows) {
            insertSignIn.run(row.id, row.playeruuid, row.bot, row.rewardAmount, row.createdAt);
        }

        for (const row of betRecordRows) {
            insertBet.run(row.betuuid, row.playeruuid, row.bot, row.playerid, row.currency, row.amount, row.result, row.odds, row.bonusodds, row.createdAt);
        }

        totalRanks = outputDb.query('SELECT COUNT(*) AS c FROM ranks WHERE bot = ?').get(botKey).c;
        outputDb.run('COMMIT');
    } catch (error) {
        outputDb.run('ROLLBACK');
        throw error;
    } finally {
        sourceDb.close();
        outputDb.close();
    }

    console.log('資料遷移完成');
    console.log(`來源: ${sourcePath}`);
    console.log(`輸出: ${outputPath}`);
    console.log(`bot: ${botKey}`);
    console.log(`ranks: ${totalRanks} (default=${defaultRole.displayName})`);
    console.log(`users: ${userRows.length}`);
    console.log(`playerStats: ${statRows.length}`);
    console.log(`signInRecords: ${signInRecordRows.length}`);
    console.log(`betRecords: ${betRecordRows.length}`);
}

main().catch((error) => {
    console.error(error.message || error);
    console.error(getUsageText());
    process.exit(1);
});