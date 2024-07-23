const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/default_files';
const LOCAL_DIR = 'default_files';

const filesToCheck = [
  'config/config.json',
  'config/messages.json',
  'config/commands.json',
  'config/roles.json',
  'data/user_data.db',
  'data/pay_history.db',
  'data/errors.db',
  'data/giveaways.json',
  'cache/cache.json'
];

async function downloadFile(filePath) {
  const url = `${GITHUB_RAW_URL}/${filePath}`;
  const response = await axios.get(url);
  const localPath = path.join(LOCAL_DIR, filePath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, response.data);
  console.log(`Downloaded: ${filePath}`);
}

async function updateJsonFile(filePath, githubContent) {
  const localPath = path.join(LOCAL_DIR, filePath);
  let localContent = {};
  try {
    localContent = JSON.parse(await fs.readFile(localPath, 'utf-8'));
  } catch (error) {
    console.log(`Error reading local file ${filePath}: ${error.message}`);
  }

  const updatedContent = { ...localContent };
  for (const key in githubContent) {
    if (!(key in localContent)) {
      updatedContent[key] = githubContent[key];
    }
  }

  for (const key in localContent) {
    if (!(key in githubContent)) {
      delete updatedContent[key];
    }
  }

  await fs.writeFile(localPath, JSON.stringify(updatedContent, null, 2));
  console.log(`Updated: ${filePath}`);
}

async function updateDbFile(filePath) {
  // For .db files, we'll just replace the local file with the GitHub version
  await downloadFile(filePath);
}

async function checkAndUpdateFile(filePath) {
  const url = `${GITHUB_RAW_URL}/${filePath}`;
  const localPath = path.join(LOCAL_DIR, filePath);

  try {
    await fs.access(localPath);
    // File exists, check and update
    const response = await axios.get(url);
    const githubContent = response.data;

    if (filePath.endsWith('.json')) {
      await updateJsonFile(filePath, githubContent);
    } else if (filePath.endsWith('.db')) {
      await updateDbFile(filePath);
    }
  } catch (error) {
    // File doesn't exist or can't be accessed, download it
    await downloadFile(filePath);
  }
}

async function main() {
  for (const file of filesToCheck) {
    await checkAndUpdateFile(file);
  }
  console.log('All files checked and updated.');
}

main()
.then(() => process.exit(0))
.catch(error => console.error('An error occurred:', error));