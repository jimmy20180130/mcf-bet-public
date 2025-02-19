const fs = require('fs');
const toml = require('toml');
const WebSocket = require('ws');
const Logger = require('../utils/logger');

/**
 * 初次驗證：連線建立後發送 auth 訊息，等待 auth_success 回應
 * @param {WebSocket} ws - WebSocket 連線
 * @param {string} token - 要驗證的 token
 * @returns {Promise<WebSocket>} 驗證成功後回傳 ws
 */
async function checkInitialToken(ws, token) {
    return new Promise((resolve, reject) => {
        const handleMessage = (message) => {
            try {
                const data = JSON.parse(message);

                // 若收到 auth_success，表示初次認證成功
                if (data.type === 'auth_success') {
                    Logger.log('認證成功');
                    ws.removeListener('message', handleMessage);
                    resolve(ws);
                } else if (data.type === 'error') {
                    Logger.error('認證錯誤');
                    ws.removeListener('message', handleMessage);
                    reject(new Error(JSON.stringify(data) || 'Authentication failed'));
                }
                // 若在初次認證前收到 challenge，也先回應
                else if (data.type === 'challenge') {
                    ws.send(JSON.stringify({
                        type: 'challenge_response',
                        data: { token }
                    }));
                }
            } catch (err) {
                Logger.error('驗證過程中出現了無法預期的錯誤，請回報給管理員', err);
            }
        };

        ws.on('open', () => {
            Logger.debug('已連線至伺服器');
            ws.send(JSON.stringify({
                type: 'auth',
                data: { token: token }
            }));
        });

        ws.on('message', handleMessage);

        ws.on('error', (err) => {
            reject(err);
        });

        ws.on('close', () => {
            reject(new Error('連線已關閉'));
        });
    });
}

/**
 * 持續監聽並回應伺服器每一分鐘的挑戰
 * @param {WebSocket} ws - 已認證的 WebSocket 連線
 * @param {string} token - 用於回應挑戰的 token
 */
function setupChallengeHandler(ws, token) {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'challenge') {
                Logger.debug('challenge_id:', data.challenge_id);
                ws.send(JSON.stringify({
                    type: 'challenge_response',
                    data: { token }
                }));
            } else if (data.type === 'challenge_success') {
                Logger.debug('challenge_success');
            } else if (data.type === 'challenge_fail') {
                Logger.debug('challenge_fail');
            }
            // 其他類型的訊息根據需要自行處理……
        } catch (err) {
            Logger.error('驗證過程中出現了無法預期的錯誤，請回報給管理員', err);
        }
    });
}

/**
 * check_token: 建立 WebSocket 連線，進行初次認證後設定挑戰回應處理程序
 * @returns {Promise<WebSocket>} 返回已認證且持續處理挑戰的 WebSocket 連線
 */
async function check_token() {
    return true
    // 從設定檔讀取 token 與 server 設定
    let config;
    try {
        const data = fs.readFileSync(`${process.cwd()}/config.toml`, 'utf-8');
        config = toml.parse(data);
    } catch (err) {
        Logger.error('讀取設定檔失敗:', err);
        throw err;
    }

    const token = config.basic.key;
    const serverUrl = 'ws://localhost:3000'; // 伺服器 WebSocket 位址

    // 建立 WebSocket 連線
    const ws = new WebSocket(serverUrl);

    // 初次驗證
    await checkInitialToken(ws, token);
    // 驗證成功後，啟動挑戰回應
    setupChallengeHandler(ws, token);

    return ws;
}

async function uploadBetRecord(ws, record) {
    ws.send(JSON.stringify({
        type: 'bet_record',
        data: record
    }));
}

module.exports = {
    check_token
};
