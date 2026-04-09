const { t } = require('../utils/i18n');

class ErrorHandler {
    constructor(bot) {
        this.bot = bot;
    }

    async handleBetError(errorData) {
        const { target, amount, currency, errType, error } = errorData;
        switch (errType) {
            case 'click':
            case 'spawn':
                // return player money
                await this.bot.PayService.pay(target, amount, currency)
                    .then(() => {
                        this.bot.logger.info(`已退回下注金額: ${amount} ${currency} 給 ${target} (type: ${errType}, reason: ${error.message})`);
                        this.bot.sendMsg(t('service.errorHandler.refunded', {
                            target,
                            amount,
                            currency,
                            reason: error.message
                        }));
                    })
                    .catch(err => {
                        this.bot.logger.error(`退回下注金額失敗: ${amount} ${currency} 給 ${target} (type: ${errType}, reason: ${error.message}, error: ${err.error.message})`);
                        this.bot.sendMsg(t('service.errorHandler.refundFailed', {
                            target,
                            amount,
                            currency,
                            reason: error.message
                        }));
                    });
                break;

            case 'pay':
                if (error.code == 'timeout') {
                    this.bot.logger.error(`轉帳逾時: ${amount} ${currency} 給 ${target} (type: ${errType}, reason: ${error.message})`);
                    this.bot.sendMsg(t('service.errorHandler.payTimeout', {
                        target,
                        amount,
                        currency,
                        reason: error.message
                    }));
                } else {
                    // return player money
                    await this.bot.PayService.pay(target, amount, currency)
                        .then(() => {
                            this.bot.logger.info(`已退回下注金額: ${amount} ${currency} 給 ${target} (type: ${errType}, reason: ${error.message})`);
                            this.bot.sendMsg(t('service.errorHandler.refundedReason', {
                                target,
                                amount,
                                currency,
                                reason: error.message
                            }));
                        })
                        .catch(err => {
                            this.bot.logger.error(`退回下注金額失敗: ${amount} ${currency} 給 ${target} (type: ${errType}, reason: ${error.message}, error: ${err.error.message})`);
                            this.bot.sendMsg(t('service.errorHandler.refundFailedReason', {
                                target,
                                amount,
                                currency,
                                reason: error.message
                            }));
                        });
                }
                break;

            case 'unknown':
            default:
                this.bot.logger.error(`處理錯誤失敗: ${amount} ${currency} 給 ${target} (type: ${errType}, reason: ${error?.message || error?.error?.message || error})`);
                break;
        }
    }
}

module.exports = ErrorHandler;