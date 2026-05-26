function normalizeUuid(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/-/g, '').toLowerCase();
    return /^[0-9a-f]{32}$/.test(normalized) ? normalized : null;
}

function normalizePlayerId(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

module.exports = {
    normalizeUuid,
    normalizePlayerId
};
