class PayService {
    constructor(bot) {
        this.bot = bot;
        this.queue = [];
        this.isProcessing = false;
        this.chatPatternsAdded = false;
    }

    async pay(target, amount, currency = 'emerald') {
        return await new Promise((resolve, reject) => {
            this.queue.push({ target, amount, currency, resolve, reject });
            this._execute();
        });
    }

    async _execute() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        const task = this.queue.shift();
        const { target, amount, currency, resolve, reject } = task;

        try {
            this.bot.logger.info(`準備處理轉帳: ${target} ${amount} ${currency} (剩餘任務: ${this.queue.length})`);
            const result = await this._performTransfer(target, amount, currency);
            resolve(result);

        } catch (err) {
            this.bot.logger.error(`轉帳失敗: ${err.error?.message || err?.message}`);
            reject(err);

        } finally {
            await new Promise(r => setTimeout(r, 500));
            this.isProcessing = false;
            this._execute();
        }
    }

    _normalizeNumber(value) {
        const normalized = Number(String(value ?? '').replace(/,/g, '').trim());
        return Number.isFinite(normalized) ? normalized : null;
    }

    _matchesExpectedSuccess(currency, matches, target, amount) {
        const captures = Array.isArray(matches?.[0]) ? matches[0] : matches;
        if (!Array.isArray(captures)) return false;

        const actualAmount = this._normalizeNumber(captures[0]);
        const expectedAmount = Number(amount);
        if (actualAmount === null || actualAmount !== expectedAmount) {
            return false;
        }

        if (currency === 'emerald') {
            const actualTarget = String(captures[1] || '').trim().toLowerCase();
            return actualTarget === String(target || '').trim().toLowerCase();
        }

        return true;
    }

    _performTransfer(target, amount, currency) {
        return new Promise(async (resolve, reject) => {
            let finalized = false;
            let timer = null;

            const successEvents = currency === 'coin'
                ? ['cpaySuccess']
                : ['epaySuccess'];
            const failureEvents = currency === 'coin'
                ? ['cpayDifferentName', 'cpayNoMoney', 'generalCannotSend', 'dataBusy']
                : ['epayNoMoney', 'epayNotSamePlace', 'epayNegative', 'generalCannotSend', 'epayProcessing', 'dataBusy'];

            const cleanup = () => {
                finalized = true;
                if (timer) clearTimeout(timer);
                successEvents.forEach(e => this.bot.removeListener(`chat:${e}`, handlers[e]));
                failureEvents.forEach(e => this.bot.removeListener(`chat:${e}`, handlers[e]));
            };

            const onSuccess = (matches) => {
                if (finalized) return;

                if (!this._matchesExpectedSuccess(currency, matches, target, amount)) {
                    this.bot.logger.warn(`忽略不符合目前轉帳的成功訊息: expected=${target}/${amount}/${currency}`);
                    return;
                }

                cleanup();
                resolve({ success: true, target, amount, currency });
            };

            const onFailure = (eventName, matches) => {
                if (finalized) return;
                cleanup();

                const errorMessage = errorMap[eventName] || '未知錯誤';
                const error = new Error(errorMessage);

                error.code = eventName;
                error.raw = matches?.[0] || matches;

                reject({ success: false, target, amount, currency, error });
            };

            const handlers = {};
            for (const e of successEvents) {
                handlers[e] = (matches) => onSuccess(matches);
            }
            for (const e of failureEvents) {
                handlers[e] = (matches) => onFailure(e, matches);
            }

            const chatPatterns = [
                { name: 'epayProcessing', regex: new RegExp(`^\\[系統\\] 正在處理您的其他請求, 請稍後`) },
                { name: 'epayNoMoney', regex: /^\[系統\] 綠寶石不足, 尚需(.+)$/ },
                { name: 'epayNotSamePlace', regex: /^\[系統\] 只能轉帳給同一分流的線上玩家\. 請檢查對方的ID與所在分流(.*)/ },
                { name: 'epaySuccess', regex: /^\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/ },
                { name: 'epayNegative', regex: new RegExp(`^\\[系統\\] 轉帳金額需為正數`) },
                { name: 'cpaySuccess', regex: /^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/ },
                { name: 'cpayDifferentName', regex: new RegExp(`^\\[系統\\] 兩次所輸入的玩家名稱不一致!`) },
                { name: 'cpayNoMoney', regex: /^\[系統\] 村民錠不足, 尚需 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前剩餘 (\d{1,3}(,\d{3})*|\d+) \)/ },
                { name: 'generalCannotSend', regex: new RegExp(`^\\[系統\\] 無法傳送訊息`) },
                { name: 'dataBusy', regex: /^\[系統\] 資料忙碌中, 請稍後再試/ }
            ];

            const errorMap = {
                'epayProcessing': '伺服器忙碌中，請稍後再試',
                'epayNoMoney': '綠寶石不足',
                'epayNotSamePlace': '玩家不在同一分流或 ID 錯誤',
                'epayNegative': '金額必須為正數',
                'cpayDifferentName': '兩次輸入的名稱不一致',
                'cpayNoMoney': '村民錠不足',
                'generalCannotSend': '系統限制，無法傳送訊息',
                'dataBusy': '伺服器資料忙碌中，請稍後再試'
            };

            if (!this.chatPatternsAdded) {
                for (const { name, regex } of chatPatterns) {
                    this.bot.addChatPattern(name, regex, { parse: true });
                }
                this.chatPatternsAdded = true;
            }

            successEvents.forEach(e => this.bot.on(`chat:${e}`, handlers[e]));
            failureEvents.forEach(e => this.bot.on(`chat:${e}`, handlers[e]));

            try {
                let sendResult;
                if (currency === 'emerald') {
                    sendResult = await this.bot.sendMsg(`/pay ${target} ${amount}`);
                } else if (currency === 'coin') {
                    await this.bot.sendMsg(`/cointrans ${target} ${amount}`);
                    await this.bot.waitForTicks(30);
                    sendResult = await this.bot.sendMsg(target);
                } else {
                    throw new Error(`unsupported currency: ${currency}`);
                }

                if (finalized) return;

                if (sendResult?.success === false) {
                    cleanup();
                    const sendError = sendResult.error instanceof Error
                        ? sendResult.error
                        : new Error(sendResult?.error?.message || '無法送出付款指令');
                    reject({ success: false, target, amount, currency, error: sendError });
                    return;
                }

                timer = setTimeout(() => {
                    if (finalized) return;
                    cleanup();
                    const timeoutError = new Error('轉帳逾時');
                    timeoutError.code = 'timeout';
                    timeoutError.raw = '';
                    reject({ success: false, target, amount, currency, error: timeoutError });
                }, 10000);
            } catch (sendErr) {
                if (finalized) return;
                cleanup();
                const error = sendErr instanceof Error ? sendErr : new Error(String(sendErr));
                reject({ success: false, target, amount, currency, error });
            }
        });
    }
}

module.exports = PayService;
