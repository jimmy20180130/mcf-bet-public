const fs = require('fs');

class Logger {
    constructor() {
        this.logs = [];
    }

    get count() {
        return this.logs.length;
    }

    get entries() {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }

    log(message) {
        // https://blog.darkthread.net/blog/js-date-yyyymmdd-hhmmss/
        const timestamp = new Date().toLocaleString('sv');
        this.logs.push({ message, timestamp });
        console.log(`[${timestamp}] \x1b[36m[INFO]\x1b[0m ${message}`);
    }

    warn(message) {
        // https://blog.darkthread.net/blog/js-date-yyyymmdd-hhmmss/
        const timestamp = new Date().toLocaleString('sv');
        this.logs.push({ message, timestamp });

        const fileInfo = ((stack) => {
            const match = stack.split('\n')[2].match(/\((.+?):(\d+):\d+\)$/);
            if (match) {
                const [, filePath, lineNumber] = match;
                return `\x1b[2m(${filePath.split(/[/\\]/).pop() + ':' + lineNumber})\x1b[0m`;
            }
            return '';
        })(new Error().stack || '');
        
        console.log(`[${timestamp}] \x1b[33m[WARN]\x1b[0m \x1b[43m${message}\x1b[0m ${fileInfo}`);
    }

    error(message) {
        // https://blog.darkthread.net/blog/js-date-yyyymmdd-hhmmss/
        const timestamp = new Date().toLocaleString('sv');
        this.logs.push({ message, timestamp });

        const fileInfo = ((stack) => {
            const match = stack.split('\n')[2].match(/\((.+?):(\d+):\d+\)$/);
            if (match) {
                const [, filePath, lineNumber] = match;
                return `\x1b[2m(${filePath.split(/[/\\]/).pop() + ':' + lineNumber})\x1b[0m`;
            }
            return '';
        })(new Error().stack || '');

        console.log(`[${timestamp}] \x1b[31m[ERROR]\x1b[0m \x1b[41m${message}\x1b[0m ${fileInfo}`);
    }

    debug(message) {
        // https://blog.darkthread.net/blog/js-date-yyyymmdd-hhmmss/
        const timestamp = new Date().toLocaleString('sv');
        this.logs.push({ message, timestamp });

        const fileInfo = ((stack) => {
            const match = stack.split('\n')[2].match(/\((.+?):(\d+):\d+\)$/);
            if (match) {
                const [, filePath, lineNumber] = match;
                return `\x1b[2m(${filePath.split(/[/\\]/).pop() + ':' + lineNumber})\x1b[0m`;
            }
            return '';
        })(new Error().stack || '');

        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        if (!config.debug) return;

        console.log(`[${timestamp}] \x1b[34m[DEBUG]\x1b[0m ${message} ${fileInfo}`);
    }
}

module.exports = new Logger();