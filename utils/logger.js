class Logger {
    constructor(prefix, debugMode = false) {
        this.logs = [];
        this.debugMode = debugMode;
        this.prefix = prefix;
        this.levels = {
            INFO: { color: '\x1b[36m', label: 'INFO' },
            WARN: { color: '\x1b[33m', label: 'WARN', bg: '\x1b[43m' },
            ERROR: { color: '\x1b[31m', label: 'ERROR', bg: '\x1b[41m' },
            DEBUG: { color: '\x1b[34m', label: 'DEBUG' }
        };
    }

    get count() { return this.logs.length; }
    get entries() { return this.logs; }
    clear() { this.logs = []; }

    _formatTimestamp(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    _formatMessage(args) {
        return args.map(arg => {
            if (arg instanceof Error) {
                return arg.stack || arg.message;
            } else if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return '[Unserializable Object]';
                }
            } else {
                return String(arg);
            }
        }).join(' ');
    }

    _getFileInfo(stack) {
        const lines = stack.split('\n');
        const targetLine = lines[3] || lines[2];
        const match = targetLine.match(/\((.+?):(\d+):\d+\)$/) || targetLine.match(/at (.+?):(\d+):\d+$/);
        
        if (match) {
            const [, filePath, lineNumber] = match;
            const fileName = filePath.split(/[/\\]/).pop();
            return `\x1b[2m(${fileName}:${lineNumber})\x1b[0m`;
        }
        return '';
    }

    _print(levelKey, ...args) {
        const timestamp = this._formatTimestamp(new Date());
        const message = this._formatMessage(args);
        const level = this.levels[levelKey];
        const fileInfo = this._getFileInfo(new Error().stack || '');

        this.logs.push({ level: levelKey, message, timestamp });

        const colorTag = `${level.color}[${level.label}]\x1b[0m`;
        const content = level.bg ? `${level.bg}${message}\x1b[0m` : message;
        
        console.log(`[${timestamp}] [${this.prefix}] ${colorTag} ${content} ${fileInfo}`);
    }

    log(...args) { this._print('INFO', ...args); }
    info(...args) { this._print('INFO', ...args); }
    
    warn(...args) { this._print('WARN', ...args); }
    
    error(...args) { this._print('ERROR', ...args); }

    debug(...args) {
        if (this.debugMode) {
            this._print('DEBUG', ...args);
        }
    }
}

module.exports = Logger;