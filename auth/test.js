const WebSocket = require('ws');
const crypto = require('crypto');
const Logger = require('../utils/logger');
const fs = require('fs');
const toml = require('toml');
const EventEmitter = require('events');
const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));

function generateSecretFromToken(e){const t=crypto.createHash("sha512").update(e).digest("hex"),a=t.match(/.{1,32}/g),r=a.map((e,t)=>{t=crypto.createHash("sha256").update(e+t.toString()).digest("hex");return crypto.createHmac("sha256",t).update(e).digest("hex")});var c=r.join("");const s=crypto.createHash("sha384").update(c+e.slice(0,8)).digest("hex");return s.slice(0,64)}

class AuthClient extends EventEmitter {
    constructor(serverUrl, token, secretKey) {
        super();
        this.serverUrl = serverUrl;
        this.token = token;
        this.secretKey = secretKey;
        this.ws = null;
        this.isAuthenticated = false;
    }

    connect() {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
            Logger.log('已連接到伺服器');
            this.authenticate();
            this.emit('connected');
        });
        
        this.ws.on('message', (data) => {
            const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
            this.token = config.basic.key;
            this.secretKey = generateSecretFromToken(config.basic.key);
            const message = JSON.parse(data);
            this.handleServerMessage(message);
            this.emit('message', message);
        });

        this.ws.on('close', () => {
            this.isAuthenticated = false;
            this.emit('disconnected');
        });

        this.ws.on('error', (error) => {
            Logger.error('驗證錯誤:', error);
            this.emit('error', error);
        });
    }

    authenticate() {
        const authMessage = {
            type: 'auth',
            data: {
                token: this.token
            }
        };
        this.ws.send(JSON.stringify(authMessage));
    }

    handleServerMessage(message) {
        switch (message.type) {
            case 'auth_success':
                Logger.log('認證成功');
                this.isAuthenticated = true;
                this.emit('authenticated');
                break;

            case 'challenge':
                this.handleChallenge(message);
                this.emit('challenge', message);
                break;

            case 'challenge_fail':
                //Logger.error('認證失敗:', message.code, message.message);
                this.emit('challengeFail', message);
                break;

            case 'challenge_success':
                this.isAuthenticated = true;
                this.emit('challengeSuccess', message);
                break;

            case 'error':
                Logger.error('收到錯誤:', message.code, message.message);
                if (message.remaining) {
                    Logger.log(`冷卻時間剩餘: ${message.remaining} 秒`);
                }
                this.emit('serverError', JSON.stringify(message));
                break;

            case 'bet_confirmed':
                Logger.log('下注記錄已確認:', message.data);
                this.emit('betConfirmed', message.data);
                break;
        }
    }

    handleChallenge(message) {
        const response = {
            type: 'challenge_response',
            data: {
                token: this.token,
                challenge_id: message.challenge_id
            }
        };
        this.ws.send(JSON.stringify(response));
    }

    sendBetRecord(betData) {
        if (!this.isAuthenticated) {
            Logger.error('尚未認證，無法發送下注記錄');
            this.emit('error', new Error('尚未認證，無法發送下注記錄'));
            return;
        }

        const nonce = Date.now().toString();
        const recordUUID = crypto.randomUUID();

        // 創建簽名
        const dataToSign = `${recordUUID}|${betData.amount}|${nonce}|${this.token}`;
        const signature = crypto.createHmac('sha256', this.secretKey)
            .update(dataToSign)
            .digest('hex');

        const betRecord = {
            type: 'bet_record',
            data: {
                recordUUID: recordUUID,
                playeruuid: betData.playeruuid,
                bet_type: betData.bet_type,
                odds: betData.odds,
                amount: betData.amount,
                result_amount: betData.result_amount,
                nonce: nonce,
                signature: signature
            }
        };

        this.ws.send(JSON.stringify(betRecord));
        this.emit('betSent', betRecord.data);
    }
}

// 使用範例
const client = new AuthClient(
    'ws://uwu.freeserver.tw:21318',
    config.basic.key,
    generateSecretFromToken(config.basic.key)
);

module.exports = client;

// client.connect();

// // 發送下注記錄範例
// setTimeout(() => {
//     const betData = {
//         playeruuid: 'player123',
//         bet_type: 'some_type',
//         odds: 2.0,
//         amount: 100,
//         result_amount: 200
//     };
//     client.sendBetRecord(betData);
// }, 2000);