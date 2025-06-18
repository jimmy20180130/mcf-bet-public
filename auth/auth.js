const fs = require('fs');
const toml = require('toml');
const WebSocket = require('ws');
const Logger = require('../utils/logger.js');
const AuthClient = require('./test.js')

AuthClient.on('disconnected', async () => {
    AuthClient.connect();
})

async function check_token() {
    AuthClient.connect();

    return await new Promise((resolve, reject) => {
        function handleAuthenticated() {
            removeListeners();
            resolve();
        }

        AuthClient.on('authenticated', handleAuthenticated);

        function handleServerError(error) {
            removeListeners();
            reject(new Error(error)); 
        }

        AuthClient.on('serverError', handleServerError);

        function handleDisconnected(error) {
            removeListeners();
            Logger.error('驗證錯誤:', error);
            process.exit(1);
        }

        AuthClient.on('disconnected', handleDisconnected);

        // 設定超時
        setTimeout(() => {
            removeListeners();
            reject(new Error('認證超時'));
        }, 30000);

        function removeListeners() {
            AuthClient.removeListener('authenticated', handleAuthenticated);
            AuthClient.removeListener('serverError', handleServerError);
            AuthClient.removeListener('disconnected', handleDisconnected);
        }
    });
}

async function challenge() {
    return await new Promise((resolve, reject) => {
        AuthClient.on('challengeFail', handleChallengeFail);

        function handleChallengeFail(message) {
            Logger.error(`認證失敗: ${message.code} ${message.message} `);
            removeListeners();
            resolve();
        }

        AuthClient.on('challengeSuccess', handleChallengeSuccess);

        function handleChallengeSuccess(message) {
            removeListeners();
            resolve();
        }

        AuthClient.on('disconnected', handleDisconnected);

        function handleDisconnected(error) {
            Logger.error('驗證錯誤:', error);
            removeListeners();
            reject(new Error(error));
        }

        setTimeout(() => {
            removeListeners();
            reject(new Error('認證超時'));
        }, 30000);

        function removeListeners() {
            AuthClient.removeListener('challengeFail', handleChallengeFail);
            AuthClient.removeListener('challengeSuccess', handleChallengeSuccess);
            AuthClient.removeListener('disconnected', handleDisconnected);
        }
    });
}

module.exports = {
    check_token,
    challenge
};
