const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const crypto = require('crypto');
const io = require('socket.io-client');
const path = require('path');
const Logger = require('./utils/logger.js');
const toml = require('toml');

let appProcess = undefined;

Logger.log('正在開始執行由 Jimmy 開發的 [廢土對賭機器人]');

let config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
let configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));

config.version = 'v.3.0.0-beta-18'
fs.writeFileSync(`${process.cwd()}/data/config.json`, JSON.stringify(config, null, 4));

function hashPassword(password) {
    const hashBuffer = crypto.createHash('sha256').update(password).digest();
    return hashBuffer.toString('hex');
}

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout   
});

rl.on('line', async function (line) {
    if (appProcess != undefined) appProcess.stdin.write(line + '\n');
});

const socket = io(`http://uwu.freeserver.tw:21097`);

if (config.auth_server.enabled) {
  async function connectToServer() {
      const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
      const token = config.auth_server.key;
      const user = 'bot';
      const username = config.auth_server.username;
      const passwordHash = hashPassword(config.auth_server.password);

      Logger.log('Connected to server');
      socket.emit('join', { room: token, username: user, user: username, password: passwordHash });
  }

  socket.on('connect', connectToServer);

  socket.on('join', (value) => {
      Logger.log(`${value.username} joined`);
  });

  socket.on('leave', (value) => {
      Logger.log(`${value.username} left`);
  });

  socket.on('disconnect', async () => {
      Logger.log('Disconnected... trying to reconnect to the server');
      await connectToServer();
  });

  socket.on('response', (data) => {
      Logger.log(`Server response: ${data.data}`);
  });

  socket.on('message', (data) => {
      if (data.username === 'bot') return;
      Logger.log(`${data.username}: ${data.message}`);
      try {
          if (appProcess != undefined) appProcess.stdin.write(data.message + '\n');
      } catch (error) {
          Logger.error(error);
      }
  });

  socket.on('status', (data) => {
      Logger.log(`Server status: ${data.data}`);
      if (data.data == 'stop') process.exit(135);
      if (data.data == 'restart') process.exit(246);
  });
}

function startApp() {
    const filesToRun = ['check_config.js', 'fixData.js']; // 添加你想要先執行的檔案
    let currentIndex = 0;

    function runNextFile() {
        if (currentIndex < filesToRun.length) {
            const file = filesToRun[currentIndex];
            const process = spawn('node', [path.join(__dirname, file), '--spawned']);

            process.stdout.on('data', (data) => {
                Logger.log(`[${file}] 輸出: ${String(data).replace(/\n$/, '')}`);
            });

            process.stderr.on('data', (data) => {
                Logger.error(`[${file}] 錯誤: ${data}`);
            });

            process.on('close', (code) => {
                currentIndex++;
                runNextFile();
            });
        } else {
            appProcess = spawn('node', [path.join(__dirname, 'main.js'), '--spawned']);

            const sendMessage = (message) => {
                const config = JSON.parse(fs.readFileSync(`${process.cwd()}/data/config.json`, 'utf8'));
                const token = config.auth_server.key;
                const user = 'bot';
                const username = config.auth_server.username;
                const passwordHash = hashPassword(config.auth_server.password);
                socket.emit('message', { data: message, username: user, room: token, user: username, password: passwordHash });
            };

            appProcess.stdout.on('data', (data) => {
                console.log(`${String(data).replace(/\n$/, '')}`);
                sendMessage(String(data).replace(/\n$/, ''));
            });

            appProcess.stderr.on('data', (data) => {
                Logger.error(`發現以下錯誤 ${data}`);
            });

            appProcess.on('close', (code) => {
                if (code == 135) {
                    Logger.log(`機器人已關閉`);
                    process.exit();
                } else if (code == 246) {
                    Logger.log(`機器人正在重新啟動中...`);
                } else {
                    Logger.error(`程式回傳錯誤碼 ${code} ，正在重新啟動中...`);
                }
                appProcess = undefined;
                startApp();
            });
        }
    }

    runNextFile();
}

startApp();
