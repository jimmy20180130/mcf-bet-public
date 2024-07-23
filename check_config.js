const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/default_files';
const LOCAL_BASE_PATH = './default_files';

const FILES_TO_CHECK = {
  'config/config.json': true,
  'config/messages.json': true,
  'config/commands.json': true,
  'config/roles.json': true,
  'data/user_data.db': false,
  'data/pay_history.db': false,
  'data/errors.db': false,
  'data/giveaways.json': true,
  'cache/cache.json': true
};

async function downloadFile(filePath) {
  const url = `${GITHUB_RAW_URL}/${filePath}`;
  const response = await axios.get(url);
  const localPath = path.join(LOCAL_BASE_PATH, filePath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, JSON.stringify(response.data, null, 2));
  console.log(`Downloaded: ${filePath}`);
}

async function updateJsonFile(filePath) {
  const url = `${GITHUB_RAW_URL}/${filePath}`;
  const response = await axios.get(url);
  const githubData = response.data;

  const localPath = path.join(LOCAL_BASE_PATH, filePath);
  let localData = JSON.parse(await fs.readFile(localPath, 'utf-8'));

  for (const key in githubData) {
    if (!(key in localData)) {
      localData[key] = githubData[key];
    }
  }

  for (const key in localData) {
    if (!(key in githubData)) {
      delete localData[key];
    }
  }

  await fs.writeFile(localPath, JSON.stringify(localData, null, 2));
  console.log(`Updated: ${filePath}`);
}

async function updateDbFile(filePath) {
  const url = `${GITHUB_RAW_URL}/${filePath}`;
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const githubDb = new sqlite3.Database(':memory:');

  await new Promise((resolve, reject) => {
    githubDb.serialize(() => {
      githubDb.run('BEGIN TRANSACTION');
      githubDb.exec(response.data, (err) => {
        if (err) reject(err);
        githubDb.run('COMMIT', resolve);
      });
    });
  });

  const localPath = path.join(LOCAL_BASE_PATH, filePath);
  const localDb = new sqlite3.Database(localPath);

  await new Promise((resolve, reject) => {
    localDb.serialize(() => {
      localDb.run('BEGIN TRANSACTION');
      
      // Get all tables from GitHub DB
      githubDb.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) reject(err);

        tables.forEach(table => {
          // Get all columns for each table
          githubDb.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
            if (err) reject(err);

            // Create table if it doesn't exist in local DB
            const createTableSQL = `CREATE TABLE IF NOT EXISTS ${table.name} (${columns.map(col => `${col.name} ${col.type}`).join(', ')})`;
            localDb.run(createTableSQL);

            // Add missing columns to local DB
            columns.forEach(column => {
              localDb.run(`ALTER TABLE ${table.name} ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
            });

            // Remove extra columns from local DB
            localDb.all(`PRAGMA table_info(${table.name})`, [], (err, localColumns) => {
              if (err) reject(err);

              localColumns.forEach(localColumn => {
                if (!columns.find(col => col.name === localColumn.name)) {
                  localDb.run(`ALTER TABLE ${table.name} DROP COLUMN ${localColumn.name}`);
                }
              });
            });
          });
        });
      });

      localDb.run('COMMIT', resolve);
    });
  });

  localDb.close();
  githubDb.close();
  console.log(`Updated: ${filePath}`);
}

async function checkAndUpdateFile(filePath, isJson) {
  const localPath = path.join(LOCAL_BASE_PATH, filePath);
  try {
    await fs.access(localPath);
    if (isJson) {
      await updateJsonFile(filePath);
    } else {
      await updateDbFile(filePath);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await downloadFile(filePath);
    } else {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
}

async function main() {
  for (const [filePath, isJson] of Object.entries(FILES_TO_CHECK)) {
    await checkAndUpdateFile(filePath, isJson);
  }
}

main()
    .then(() => process.exit(0))
    .catch(error => console.error('An error occurred:', error));