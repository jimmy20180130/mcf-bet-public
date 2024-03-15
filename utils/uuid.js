function generateUUID() {
    // 產生 UUID 的算法可以參考 RFC4122（https://www.ietf.org/rfc/rfc4122.txt）
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    return uuid;
}

function generateVerificationCode() {
    return Math.random().toString(36).slice(2, 2+5);
}

module.exports = {
    generateUUID,
    generateVerificationCode
}