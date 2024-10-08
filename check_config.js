const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class JsonSyncer {
    constructor(syncConfigs) {
        this.syncConfigs = syncConfigs;
    }

    async getGithubJson(url) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error(`無法從GitHub獲取JSON (${url}):`, error.message);
            return null;
        }
    }

    async getLocalJson(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`本地檔案不存在 (${filePath})，將創建新檔案`);
                return {};
            }
            console.error(`讀取本地JSON檔案時出錯 (${filePath}):`, error.message);
            return null;
        }
    }

    deepMerge(localObj, githubObj, path = '') {
        let hasChanges = false;
        const mergeResult = { ...localObj };

        for (const [key, githubValue] of Object.entries(githubObj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (!(key in mergeResult)) {
                // 如果本地對象完全沒有這個key
                mergeResult[key] = githubValue;
                console.log(`新增key: ${currentPath}`);
                hasChanges = true;
            } else if (
                typeof githubValue === 'object' && 
                githubValue !== null &&
                !Array.isArray(githubValue) &&
                typeof mergeResult[key] === 'object' &&
                mergeResult[key] !== null &&
                !Array.isArray(mergeResult[key])
            ) {
                // 如果兩邊都是對象，則遞迴處理
                const { result, changed } = this.deepMerge(
                    mergeResult[key], 
                    githubValue, 
                    currentPath
                );
                if (changed) {
                    mergeResult[key] = result;
                    hasChanges = true;
                }
            }
            // 如果本地已有此key且不是對象，則保留本地值
        }

        return {
            result: mergeResult,
            changed: hasChanges
        };
    }

    async syncSingleJson(githubUrl, localFilePath) {
        console.log(`開始同步: ${localFilePath}`);
        const githubJson = await this.getGithubJson(githubUrl);
        if (!githubJson) return false;

        let localJson = await this.getLocalJson(localFilePath);
        if (localJson === null) return false;

        const { result: mergedJson, changed: hasChanges } = this.deepMerge(localJson, githubJson);

        if (hasChanges) {
            try {
                await fs.mkdir(path.dirname(localFilePath), { recursive: true });
                await fs.writeFile(
                    localFilePath, 
                    JSON.stringify(mergedJson, null, 2),
                    'utf8'
                );
                console.log(`本地JSON檔案已更新: ${localFilePath}`);
            } catch (error) {
                console.error(`寫入本地JSON檔案時出錯 (${localFilePath}):`, error.message);
                return false;
            }
        } else {
            console.log(`本地檔案已是最新，無需更新: ${localFilePath}`);
        }

        return true;
    }

    async syncAllJson() {
        const results = [];
        for (const config of this.syncConfigs) {
            const result = await this.syncSingleJson(config.githubUrl, config.localPath);
            results.push({
                localPath: config.localPath,
                success: result
            });
        }
        return results;
    }
}

async function main() {
    // 使用示例
    const syncConfigs = [
        {
            githubUrl: 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/config/config.json',
            localPath: `${process.cwd()}/config/config.json`
        },
        {
            githubUrl: 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/config/commands.json',
            localPath: `${process.cwd()}/config/commands.json`
        },
        {
            githubUrl: 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/config/messages.json',
            localPath: `${process.cwd()}/config/messages.json`
        },
        {
            githubUrl: 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/config/roles.json',
            localPath: `${process.cwd()}/config/roles.json`
        },
        {
            githubUrl: 'https://raw.githubusercontent.com/jimmy20180130/mcf-bet-public/main/cache/cache.json',
            localPath: `${process.cwd()}/cache/cache.json`
        }
    ];

    const syncer = new JsonSyncer(syncConfigs);
    const results = await syncer.syncAllJson();

    console.log('檔案同步結果:');
    results.forEach(async result => {
        console.log(`${result.localPath}: ${result.success ? '成功' : '失敗'}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => console.error('An error occurred:', error));