const path = require('path');

const slashEntries = [
    { file: 'link.js', load: () => require('./slash/link.js') },
    { file: 'ping.js', load: () => require('./slash/ping.js') },
    { file: 'record.js', load: () => require('./slash/record.js') },
    { file: 'roles.js', load: () => require('./slash/roles.js') },
    { file: 'settings.js', load: () => require('./slash/settings.js') },
    { file: 'template.js', load: () => require('./slash/template.js') },
    { file: 'wallet.js', load: () => require('./slash/wallet.js') },
];

const interactionEntries = [
    { file: 'minecraftData.js', load: () => require('./interactions/minecraftData.js') },
    { file: 'template.js', load: () => require('./interactions/template.js') },
];

function clearModuleCache(relativePath) {
    try {
        const resolvedPath = require.resolve(path.join(__dirname, relativePath));
        delete require.cache[resolvedPath];
    } catch {
        // Ignore cache clear failures to keep loader resilient in compiled/runtime environments.
    }
}

module.exports = {
    slashEntries,
    interactionEntries,
    clearModuleCache,
};