const tails = new Map();

function withLock(key, task) {
    const prev = tails.get(key) || Promise.resolve();
    const result = prev.then(() => task());

    const sequencer = result.then(() => {}, () => {});
    tails.set(key, sequencer);

    sequencer.then(() => {
        if (tails.get(key) === sequencer) {
            tails.delete(key);
        }
    });

    return result;
}

module.exports = { withLock };
