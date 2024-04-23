const fs = require('fs');
const axios = require('axios');

const githubFileUrl = 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-update/master/mcf-bet-public.txt';

const localFilePath = 'update.txt';

const updateInterval = 1000 * 60 * 60 * 24;

function update() {
    console.log('檢查更新中...');

    axios.get(githubFileUrl)
        .then(response => {
            const data = response.data;

            const lines = data.trim().split('\n');
            const updateTime = lines[0].trim();
            const updateContent = lines.slice(1);

            fs.stat(localFilePath, async (err, stats) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.log('找不到本地檔案。下載更新中...');
                        write_update(updateTime, updateContent);

                        for (let i = 0; i < updateContent.length; i++) {
                            await download_files(updateContent[i]);
                        }

                        console.log('檢查更新完畢。');
                    } else {
                        console.error('讀取本地檔案時出錯：', err);
                    }
                } else {
                    const localTime = fs.readFileSync(localFilePath, 'utf8').trim().split('\n')[0].trim();

                    if (localTime !== updateTime) {
                        console.log('本地檔案並非最新版。下載更新中...');
                        write_update(updateTime, updateContent);

                        for (let i = 0; i < updateContent.length; i++) {
                            await download_files(updateContent[i]);
                        }

                        console.log('檢查更新完畢。');
                    } else {
                        console.log('本地檔案已是最新。');
                    }
                }
            });
        })
        .catch(error => {
            console.error('從 GitHub 下載檔案時出錯：', error);
        });
}

function write_update(updateTime, updateContent) {
    if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }

    const file = fs.createWriteStream(localFilePath, { flags: 'w' });

    file.write(updateTime + '\n');
    updateContent.forEach(line => {
        file.write(line + '\n');
    });

    file.on('finish', () => {
        file.close(() => {
            console.log('更新成功寫入。');
        });
    });
}

async function download_files(file_url) {
    axios.get(file_url)
        .then(response => {
            // 例如檔案為 main.js ，則下載後的檔案名稱為 main.js
            const file_name = file_url.split('/').pop();
            const file = fs.createWriteStream(file_name);

            file.write(response.data);

            console.log('已下載檔案：', file_name);
        })
        .catch(error => {
            console.error(`下載檔案 ${file_url.split('/').pop()} 時出錯：`, error);
        });
}

setInterval(update, updateInterval);

update();
