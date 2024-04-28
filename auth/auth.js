const crypto = require('crypto');
const axios = require('axios')
const fs = require('fs')

async function decryptMessage(encryptedMessage) {
    let resultt = ''
    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'))

    const headers = {
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };

    const data = {
        "time": Math.round(new Date() / 1000)
    }

    await axios.default.post('http://owo.freeserver.tw:20195/get_key', { data }, { headers }).then(async response => {
        if (response.data.error != undefined) {
            console.log('[WARN] 請確認您的金鑰是否正確，如果您認為這是個錯誤，請聯絡管理員')

        } else {
            try {
                const secretKey = response.data.secret_key;
                const encrypted = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0))
                
                const iv = encrypted.slice(0, 16);
                const ciphertext = encrypted.slice(16);
                
                const key = await crypto.subtle.importKey(
                    'raw', 
                    Uint8Array.from(atob(secretKey), c => c.charCodeAt(0)),
                    {name: 'AES-CBC'},
                    false, 
                    ['decrypt']
                );
                
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: 'AES-CBC',
                        iv: iv
                    },
                    key,
                    ciphertext
                );

                var uint8Array = new Uint8Array(decrypted);

                var textDecoder = new TextDecoder('utf-8');
                var resultString = textDecoder.decode(uint8Array);
                resultt = resultString
                return resultString

            } catch (e) {}
        }
    })
    .catch(async error => {
        const response = error.response;
        if (response.data.error == 'unauthorized') {
            console.log('[WARN] 請確認您的金鑰是否正確，如果您認為這是個錯誤，請聯絡管理員')
        } else if (response.data.error == 'forbidden') {
            console.log('[WARN] 您的 IP 已被列入黑名單，如果您認為這是個錯誤，請聯絡管理員')
        } else {
            console.log('[ERROR] 驗證伺服器無回應或發生錯誤，請稍後再試')
        }
    });
    return resultt
}

async function check_token() {
    return await new Promise(resolve => {
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf-8'));
        const url = 'http://owo.freeserver.tw:20195/verify';
        const headers = {
            Authorization: `Bearer ${config.key}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        };

        axios.post(url, {}, { headers })
            .then(async response => {
                const decryptedMessage = await decryptMessage(response.data);
                if (decryptedMessage.includes('{') && JSON.parse(decryptedMessage.replaceAll('\'', '"')).status == 'success') {
                    resolve(true)
                } else if (decryptedMessage.startsWith('錯誤')) {
                    if (decryptedMessage == '錯誤，已有ip在使用此金鑰') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: 已有ip在使用此金鑰，請稍後再試，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 好爛喔，一組序號居然只能同時間一個 IP 用，那麼就試試『再買一組序號』吧! 心動不如行動，立刻前往伺服器開啟客服單購買!');
                    
                    } else if (decryptedMessage == '錯誤，金鑰不存在') {
                        console.log(`[ERROR] 來自驗證伺服器的訊息: 無效的金鑰，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 好爛喔，這組序號居然沒用，千萬不要隨便使用陌生人給的序號，他給你的可能是別人被盜用的序號!\n[ERROR] 還不快試試『買一組序號』吧! 心動不如行動，立刻前往伺服器開啟客服單購買!`);
                    
                    } else if (decryptedMessage == '錯誤，金鑰已過期') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: 您的金鑰已過期，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 好爛喔，金鑰居然會過期! 還不快試試『買一組永久版序號』吧! 心動不如行動，立刻前往伺服器開啟客服單購買!');
    
                    } else if (decryptedMessage == '錯誤，您的金鑰已被停用') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: 您的金鑰已被停用，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 你的金鑰因某些原因被停用，請私訊管理員，並提供你的金鑰，以便我們確認是否為誤判，如果是誤判，我們會立刻恢復你的金鑰!');
                    
                    } else if (decryptedMessage == '錯誤，ip 使用量達上限') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: ip 使用量達上限，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 你的 IP 使用量達上限，請私訊管理員，並提供你的金鑰，以便我們確認是否為誤判，如果是誤判，我們會立刻恢復你的金鑰!');

                    } else {
                        if (String(error).startsWith('Error: connect ETIMEDOUT')) {
                            console.log('[ERROR] 連線到驗證伺服器時發生錯誤，無法連線至驗證伺服器，請確保您的網路連線正常，或是去Discord查看是否在維修中\n[ERROR] 來自 XiaoXi_TW 的話: 假設你被亞洲父母斷網的話，為什麼不要試試看『更改 mac 位址』呢?')
                        } else {
                            console.log('[ERROR] 發生意外的錯誤，可能為無法連線至驗證伺服器，請稍後再試\n[ERROR] 來自 XiaoXi_TW 的話: 這次我救不了你，自求多福吧')
                        }
                    }

                    resolve(false)
                } else {
                    console.log('[ERROR] 發生意外的錯誤，伺服器回應: d2#9$32@34*320x (這是什麼? 我也不知道)，請檢查您的檔案是否為最新版，如果您認為這是個錯誤，請私訊管理員');
                    resolve(false)
                }
            })
            .catch(async error => {
                console.log(`[ERROR] 發生錯誤: ${error.message}`)
                if (error.response) {
                    const decryptedMessage = await decryptMessage(error.response.data);

                    if (decryptedMessage == '錯誤，已有ip在使用此金鑰') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: 已有ip在使用此金鑰，請稍後再試，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 好爛喔，一組序號居然只能同時間一個 IP 用，那麼就試試『再買一組序號』吧! 心動不如行動，立刻前往伺服器開啟客服單購買!');
                    
                    } else if (decryptedMessage == '錯誤，金鑰不存在') {
                        console.log(`[ERROR] 來自驗證伺服器的訊息: 無效的金鑰，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 好爛喔，這組序號居然沒用，千萬不要隨便使用陌生人給的序號，他給你的可能是別人被盜用的序號!\n[ERROR] 還不快試試『買一組序號』吧! 心動不如行動，立刻前往伺服器開啟客服單購買!`);
                    
                    } else if (decryptedMessage == '錯誤，金鑰已過期') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: 您的金鑰已過期，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 好爛喔，金鑰居然會過期! 還不快試試『買一組永久版序號』吧! 心動不如行動，立刻前往伺服器開啟客服單購買!');

                    } else if (decryptedMessage == '錯誤，您的金鑰已被停用') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: 您的金鑰已被停用，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 你的金鑰因某些原因被停用，請私訊管理員，並提供你的金鑰，以便我們確認是否為誤判，如果是誤判，我們會立刻恢復你的金鑰!');
                    } else if (decryptedMessage == '錯誤，ip 使用量達上限') {
                        console.log('[ERROR] 來自驗證伺服器的訊息: ip 使用量達上限，如果您認為這是個錯誤，請私訊管理員\n[ERROR] 來自 XiaoXi_TW 的話: 你的 IP 使用量達上限，請私訊管理員，並提供你的金鑰，以便我們確認是否為誤判，如果是誤判，我們會立刻恢復你的金鑰!');

                    }

                } else {
                    if (String(error).startsWith('Error: connect ETIMEDOUT')) {
                        console.log('[ERROR] 連線到驗證伺服器時發生錯誤，無法連線至驗證伺服器，請確保您的網路連線正常，或是去Discord查看是否在維修中\n[ERROR] 來自 XiaoXi_TW 的話: 假設你被亞洲父母斷網的話，為什麼不要試試看『更改 mac 位址』呢?')
                    } else {
                        console.log('[ERROR] 發生意外的錯誤，可能為無法連線至驗證伺服器，請稍後再試\n[ERROR] 來自 XiaoXi_TW 的話: 這次我救不了你，自求多福吧')
                    }
                }

                resolve(false)
            });
    })
}

module.exports = {
    check_token
}
