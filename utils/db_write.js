const sqlite3 = require('sqlite3').verbose();

let user_data = null;
let pay_history = null;
let errors = null;

function initDB() {
    user_data = new sqlite3.Database(`${process.cwd()}/data/user_data.db`);
    pay_history = new sqlite3.Database(`${process.cwd()}/data/pay_history.db`);
    errors = new sqlite3.Database(`${process.cwd()}/data/errors.db`);
}

function closeDB() {
    if (user_data) {
        user_data.close((err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }

    if (pay_history) {
        pay_history.close((err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }

    if (errors) {
        errors.close((err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }
}

function executeQuery(type, query, params, callback) {
    let db = null;

    switch (type) {
        case 'user_data':
            db = user_data;
            break;
        case 'pay_history':
            db = pay_history;
            break;
        case 'errors':
            db = errors;
            break;
        default:
            throw new Error('Invalid database type');
    }

    db.serialize(() => {
        db.all(query, params, (err, rows) => {
            callback(err, rows);
        });
    });
}

module.exports = {
    initDB,
    closeDB,
    executeQuery
};