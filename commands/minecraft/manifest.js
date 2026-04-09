const entries = [
    { file: 'cpay.js', load: () => require('./cpay.js') },
    { file: 'deposit.js', load: () => require('./deposit.js') },
    { file: 'epay.js', load: () => require('./epay.js') },
    { file: 'link.js', load: () => require('./link.js') },
    { file: 'money.js', load: () => require('./money.js') },
    { file: 'restart.js', load: () => require('./restart.js') },
    { file: 'signIn.js', load: () => require('./signIn.js') },
    { file: 'stop.js', load: () => require('./stop.js') },
    { file: 'wallet.js', load: () => require('./wallet.js') },
];

module.exports = {
    entries,
};