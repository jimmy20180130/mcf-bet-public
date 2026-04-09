const fs = require('fs');
const path = require('path');
const toml = require('../node_modules/smol-toml/dist/');
const Logger = require('../utils/logger');

const logger = new Logger('ConfigService');

function resolvePaths(configPath) {
    const targetPath = configPath || path.join(process.cwd(), 'config.toml');

    return {
        configPath: targetPath,
        backupPath: `${targetPath}.bak`,
        swapPath: `${targetPath}.swap`,
        tempPath: `${targetPath}.tmp`
    };
}

function parseConfigContent(content, sourcePath) {
    try {
        return toml.parse(content);
    } catch (error) {
        throw new Error(`設定檔解析失敗 (${sourcePath}): ${error.message}`);
    }
}

function readAndParseIfExists(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return parseConfigContent(content, filePath);
}

function atomicWriteConfigString(configText, paths) {
    const tempWritePath = `${paths.tempPath}.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempWritePath, configText, 'utf-8');

    // 寫入後再次解析，避免把不可解析內容覆蓋正式設定
    parseConfigContent(fs.readFileSync(tempWritePath, 'utf-8'), tempWritePath);

    const hasCurrentConfig = fs.existsSync(paths.configPath);
    if (hasCurrentConfig) {
        fs.copyFileSync(paths.configPath, paths.backupPath);
    }

    if (!hasCurrentConfig) {
        fs.renameSync(tempWritePath, paths.configPath);
        return;
    }

    if (fs.existsSync(paths.swapPath)) {
        fs.unlinkSync(paths.swapPath);
    }

    fs.renameSync(paths.configPath, paths.swapPath);

    try {
        fs.renameSync(tempWritePath, paths.configPath);

        if (fs.existsSync(paths.swapPath)) {
            fs.unlinkSync(paths.swapPath);
        }
    } catch (error) {
        if (fs.existsSync(paths.swapPath) && !fs.existsSync(paths.configPath)) {
            fs.renameSync(paths.swapPath, paths.configPath);
        }

        if (fs.existsSync(tempWritePath)) {
            fs.unlinkSync(tempWritePath);
        }

        throw error;
    }
}

function restoreFrom(paths, sourcePath) {
    const restoredText = fs.readFileSync(sourcePath, 'utf-8');
    atomicWriteConfigString(restoredText, paths);
    logger.warn(`已從備援檔復原設定: ${path.basename(sourcePath)}`);
    return parseConfigContent(restoredText, sourcePath);
}

function readConfig(options = {}) {
    const paths = resolvePaths(options.configPath);

    try {
        const config = readAndParseIfExists(paths.configPath);
        if (config) {
            return config;
        }
    } catch (error) {
        logger.warn(error.message);
    }

    const recoveryCandidates = [paths.swapPath, paths.tempPath, paths.backupPath];
    for (const recoveryPath of recoveryCandidates) {
        try {
            if (!fs.existsSync(recoveryPath)) {
                continue;
            }

            return restoreFrom(paths, recoveryPath);
        } catch (error) {
            logger.warn(`復原失敗 (${path.basename(recoveryPath)}): ${error.message}`);
        }
    }

    throw new Error(`找不到可用的設定檔: ${paths.configPath}`);
}

function writeConfig(config, options = {}) {
    const paths = resolvePaths(options.configPath);
    const configText = toml.stringify(config);
    atomicWriteConfigString(configText, paths);
}

function updateConfig(mutator, options = {}) {
    const currentConfig = readConfig(options);
    const nextConfig = mutator(currentConfig) || currentConfig;
    writeConfig(nextConfig, options);
    return nextConfig;
}

module.exports = {
    readConfig,
    writeConfig,
    updateConfig
};