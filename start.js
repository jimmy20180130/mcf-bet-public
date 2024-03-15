const { fork } = require('child_process');
const readline = require('readline')

let appProcess = undefined;

console.log('[INFO] 正在開始執行由 Jimmy 開發的 [廢土對賭機器人]');

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout   
});

rl.on('line', async function (line) {
    if (appProcess != undefined) appProcess.stdin.write(line + '\n');
});

function startApp() {
    appProcess = fork(__dirname + '/main.js', [], { silent: true })

    appProcess.stdout.on('data', (data) => {
        console.log(`${String(data).replace(/\n$/, '')}`);
    });

    appProcess.stderr.on('data', (data) => {
        console.error(`[ERROR] 發現以下錯誤 ${data} ，正在重新啟動中...`);
    });

    appProcess.on('error', (err) => {
        console.log(`[ERROR] ${err}`)
    })

    appProcess.on('close', (code) => {
        if (code == 135) {
            console.log(`[INFO] 機器人已關閉`)
            process.kill()
        } else if (code == 246) {
            console.log(`[INFO] 機器人正在重新啟動中...`)
        } else {
            console.log(`[ERROR] 程式回傳錯誤碼 ${code} ，正在重新啟動中...`);
        }
        appProcess = undefined
        startApp();
    });
}

startApp();