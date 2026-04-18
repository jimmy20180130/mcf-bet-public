const { Database } = require('bun:sqlite');
const db = new Database('./data/database.db');

db.run('PRAGMA foreign_keys = ON;');

const schema = `
CREATE TABLE IF NOT EXISTS ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    discordid TEXT DEFAULT '',
    daily TEXT DEFAULT '{}',
    bonusodds REAL DEFAULT 0,
    bot TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    playeruuid TEXT PRIMARY KEY, 
    playerid TEXT,
    discordid TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS signInRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playeruuid TEXT NOT NULL,
    bot TEXT NOT NULL,
    rewardAmount TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playeruuid) REFERENCES users(playeruuid) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS recordTemplates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerDiscordId TEXT NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    filters TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ownerDiscordId, name)
);
`;

db.run(schema);

// init ranks
const { readConfig } = require('../services/configService');
const { getBotKeyFromConfigBot } = require('../utils/botKey');
let config = null;

try {
    config = readConfig();
} catch (error) {
    config = null;
}

const bots = config?.bots || [];

for (const bot of bots) {
    const botKey = getBotKeyFromConfigBot(bot);
    if (!botKey) continue;

    db.query(`
        INSERT OR IGNORE INTO ranks (id, displayName, daily, bonusodds, bot) 
        VALUES (1, '未綁定', '{"e":0, "c":0}', 0, ?)
    `).run(botKey);
}

module.exports = db;