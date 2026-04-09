class AuthService {
    constructor({type, version, token, mcClient}) {
        this.type = type;
        this.version = version;
        this.token = token;
        this.mcClient = mcClient;
    }

    async authenticate() {
        return true
    }
}

module.exports = AuthService;