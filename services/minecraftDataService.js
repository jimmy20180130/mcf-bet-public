const { normalizeUuid } = require('../utils/identifier');
const Logger = require('../utils/logger');

class MinecraftDataService {
    constructor() {
        this.cache = {};
        this.logger = new Logger('MinecraftDataService');
    }

    async getPlayerUuid(playerid) {
        const id = playerid.toLowerCase();
        const now = Date.now();

        if (this.cache[id] && this.cache[id].playeruuid && this.cache[id].expires > now) {
            return this.cache[id].playeruuid;
        }

        let uuid = await this._fetchFromMCAPI(id);
        
        if (!uuid) {
            uuid = await this._fetchFromPlayerDB(id);
        }

        return uuid;
    }

    async getPlayerId(playeruuid) {
        const uuid = playeruuid.replace(/-/g, '').toLowerCase();
        const now = Date.now();

        if (this.cache[uuid] && this.cache[uuid].playername && this.cache[uuid].expires > now) {
            return this.cache[uuid].playername;
        }

        let name = await this._fetchFromMCAPI(uuid);

        if (!name) {
            name = await this._fetchFromPlayerDB(uuid);
        }

        return name;
    }

    async _fetchFromMCAPI(playerData) {
        const cleanData = playerData.replace(/-/g, '');
        const expires = Date.now() + 10 * 60 * 1000;

        if (cleanData.length !== 32) {
            const playername = playerData;
            const urls = [
                `https://api.mojang.com/users/profiles/minecraft/${playername}`,
                `https://api.minecraftservices.com/minecraft/profile/lookup/name/${playername}`
            ];

            for (const url of urls) {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        const normalizedUuid = normalizeUuid(data?.id);
                        if (data && normalizedUuid) {
                            this.cache[playername.toLowerCase()] = {
                                playeruuid: normalizedUuid,
                                expires: expires
                            };
                            this.cache[normalizedUuid] = {
                                playername: data.name,
                                expires: expires
                            };
                            return normalizedUuid;
                        }
                    }
                } catch (err) {
                    this.logger.warn(`Mojang API Error: ${err.message}`);
                }
            }
        } else {
            const uuid = normalizeUuid(cleanData);
            if (!uuid) {
                return null;
            }
            const url = `https://api.minecraftservices.com/minecraft/profile/lookup/${uuid}`;

            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.name) {
                        this.cache[uuid.toLowerCase()] = {
                            playername: data.name,
                            expires: expires
                        };
                        this.cache[data.name.toLowerCase()] = {
                            playeruuid: uuid.toLowerCase(),
                            expires: expires
                        };
                        return data.name;
                    }
                }
            } catch (err) {
                this.logger.warn(`Mojang API Error: ${err.message}`);
            }
        }
        return null;
    }

    async _fetchFromPlayerDB(playerData) {
        const cleanData = playerData.replace(/-/g, '').toLowerCase();

        try {
            const response = await fetch(`https://playerdb.co/api/player/minecraft/${cleanData}`);

            if (!response.ok) return null;

            const result = await response.json();

            if (result.success && result.data && result.data.player) {
                const player = result.data.player;
                const name = player.username;
                const uuid = normalizeUuid(player.raw_id);
                const expires = Date.now() + 10 * 60 * 1000;

                if (!uuid) {
                    return null;
                }

                this.cache[name.toLowerCase()] = {
                    playeruuid: uuid,
                    expires: expires
                };
                this.cache[uuid] = {
                    playername: name,
                    expires: expires
                };

                return (cleanData.length === 32) ? name : uuid;
            }
        } catch (err) {
            this.logger.warn(`PlayerDB Error: ${err.message}`);
        }

        return null;
    }
}

module.exports = new MinecraftDataService();