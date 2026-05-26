const path = require('path');

function getPackageVersion() {
    return require(path.join(__dirname, '..', 'package.json')).version;
}

function getCliArgValue(flagName) {
    const flagIndex = process.argv.indexOf(flagName);
    if (flagIndex === -1) {
        return '';
    }

    return process.argv[flagIndex + 1] || '';
}

function getAppVersion() {
    return process.env.MCF_BET_VERSION || getCliArgValue('--version') || getPackageVersion();
}

function normalizeWindowsVersion(version) {
    const numericParts = String(version)
        .split('+')[0]
        .split('-')[0]
        .split('.')
        .map(part => part.replace(/\D/g, ''))
        .filter(Boolean)
        .slice(0, 4);

    while (numericParts.length < 4) {
        numericParts.push('0');
    }

    return numericParts.join('.');
}

function getWindowsVersion() {
    return process.env.MCF_BET_WINDOWS_VERSION || getCliArgValue('--windows-version') || normalizeWindowsVersion(getAppVersion());
}

module.exports = {
    getAppVersion,
    getWindowsVersion,
    normalizeWindowsVersion,
};