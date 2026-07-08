// 千分位點
function money(n) {
    const num = Number(n);
    return Number.isFinite(num) ? num.toLocaleString('en-US') : String(n);
}

// 跳脫字元
function escapeDiscordId(id) {
    return String(id).replace(/_/g, '\\_');
}

module.exports = { money, escapeDiscordId };
