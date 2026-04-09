class MinecraftDataService {
    constructor() {
        this.cache = {};
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
                        if (data && data.id) {
                            this.cache[playername.toLowerCase()] = {
                                playeruuid: data.id,
                                expires: expires
                            };
                            this.cache[data.id.toLowerCase()] = {
                                playername: data.name,
                                expires: expires
                            };
                            return data.id;
                        }
                    }
                } catch (err) {
                    this.bot.logger.error(`Mojang API Error: ${err.message}`);
                }
            }
        } else {
            const uuid = cleanData;
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
                this.bot.logger.error(`Mojang API Error: ${err.message}`);
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
                const uuid = player.raw_id;
                const expires = Date.now() + 10 * 60 * 1000;

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
            this.bot.logger.error(`PlayerDB Error: ${err.message}`);
        }

        return null;
    }
}

module.exports = new MinecraftDataService();