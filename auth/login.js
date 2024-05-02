const puppeteer = require("puppeteer");

const loginUrl =
    "https://login.live.com/oauth20_authorize.srf" +
    "?client_id=00000000402b5328" +
    "&response_type=code" +
    "&scope=service%3A%3Auser.auth.xboxlive.com%3A%3AMBI_SSL" +
    "&redirect_uri=https%3A%2F%2Flogin.live.com%2Foauth20_desktop.srf";

const redirectUrlSuffix = "https://login.live.com/oauth20_desktop.srf?code=";

const authTokenUrl = "https://login.live.com/oauth20_token.srf";

const xblAuthUrl = "https://user.auth.xboxlive.com/user/authenticate";

const xstsAuthUrl = "https://xsts.auth.xboxlive.com/xsts/authorize";

const mcLoginUrl =
    "https://api.minecraftservices.com/authentication/login_with_xbox";

const mcStoreUrl = "https://api.minecraftservices.com/entitlements/mcstore";

const mcProfileUrl = "https://api.minecraftservices.com/minecraft/profile";

async function acquireMinecraftAccessToken() {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:\\Users\\Jimmy\\.cache\\puppeteer\\chrome\\win64-123.0.6312.122\\chrome-win64\\chrome.exe",
        args: ["--disable-infobars", "--disable-features=site-per-process", "--no-sandbox", "--hide-scrollbars", "--disable-gpu", `--app=${loginUrl}`, "--window-size=800,600"],
        timeout: 0,

    });
    
    const page = (await browser.pages())[0];

    // 等待登錄完成
    console.log("請在新開的視窗中完成 Microsoft 帳號登錄");

    var login = false

    while (!login) {
        const navigationPromise = page.waitForNavigation();
        // 登錄後會自動重定向,獲取授權碼
        await navigationPromise.then(async () => {
            console.log("當前頁面: " + page.url());
            if (page.url().startsWith(redirectUrlSuffix)) {
                console.log("登錄成功");
                login = true
            } else {
                login = false
            }
        });
    }
    
    const redirectUrl = page.url();
    const authCode = redirectUrl.split("code=")[1].replace(/&lc=\d+/, "");

    // 在當前頁面獲取 Minecraft Access Token
    await acquireAccessToken(authCode);

    await browser.close();
}

function acquireAccessToken(authcode) {
    const uri = new URL(authTokenUrl);

    const data = {
        client_id: "00000000402b5328",
        code: authcode,
        grant_type: "authorization_code",
        redirect_uri: "https://login.live.com/oauth20_desktop.srf",
        scope: "service::user.auth.xboxlive.com::MBI_SSL",
    };

    const request = new Request(uri, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(data),
    });

    fetch(request)
        .then((resp) => {
            if (resp.ok) {
                return resp.json();
            } else {
                throw new Error(`HTTP error ${resp.status}`);
            }
        })
        .then((jsonObject) => {
            const accessToken = jsonObject.access_token;
            console.log("accessToken: " + accessToken);
            acquireXBLToken(accessToken);
        })
        .catch((error) => {
            console.error(error);
        });
}

function acquireXBLToken(accessToken) {
    const uri = new URL(xblAuthUrl);

    const data = {
        Properties: {
            AuthMethod: "RPS",
            SiteName: "user.auth.xboxlive.com",
            RpsTicket: accessToken,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
    };

    const request = new Request(uri, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    });

    fetch(request)
        .then((resp) => {
            if (resp.ok) {
                return resp.json();
            } else {
                throw new Error(`HTTP error ${resp.status}`);
            }
        })
        .then((jsonObject) => {
            const xblToken = jsonObject.Token;
            console.log("xblToken: " + xblToken);
            acquireXsts(xblToken);
        })
        .catch((error) => {
            console.error(error);
        });
}

function acquireXsts(xblToken) {
    const uri = new URL(xstsAuthUrl);

    const data = {
        Properties: {
            SandboxId: "RETAIL",
            UserTokens: [xblToken],
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT",
    };

    const request = new Request(uri, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    });

    fetch(request)
        .then((resp) => {
            if (resp.ok) {
                return resp.json();
            } else {
                throw new Error(`HTTP error ${resp.status}`);
            }
        })
        .then((jsonObject) => {
            const xblXsts = jsonObject.Token;
            const claims = jsonObject.DisplayClaims;
            const xui = claims.xui;
            const uhs = xui[0].uhs;
            console.log("xblXsts: " + xblXsts + ", uhs: " + uhs);
            acquireMinecraftToken(uhs, xblXsts);
        })
        .catch((error) => {
            console.error(error);
        });
}

function acquireMinecraftToken(xblUhs, xblXsts) {
    const uri = new URL(mcLoginUrl);

    const data = {
        identityToken: "XBL3.0 x=" + xblUhs + ";" + xblXsts,
    };

    const request = new Request(uri, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    });

    fetch(request)
        .then((resp) => {
            if (resp.ok) {
                return resp.json();
            } else {
                throw new Error(`HTTP error ${resp.status}`);
            }
        })
        .then((jsonObject) => {
            const mcAccessToken = jsonObject.access_token;
            console.log("mcAccessToken: " + mcAccessToken);
            checkMcStore(mcAccessToken);
            checkMcProfile(mcAccessToken);
        })
        .catch((error) => {
            console.error(error);
        });
}

function checkMcStore(mcAccessToken) {
    const uri = new URL(mcStoreUrl);

    const request = new Request(uri, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + mcAccessToken,
        },
    });

    fetch(request)
        .then((resp) => {
            if (resp.ok) {
                return resp.text();
            } else {
                throw new Error(`HTTP error ${resp.status}`);
            }
        })
        .then((body) => {
            console.log("store: " + body);
        })
        .catch((error) => {
            console.error(error);
        });
}

function checkMcProfile(mcAccessToken) {
    const uri = new URL(mcProfileUrl);

    const request = new Request(uri, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + mcAccessToken,
        },
    });

    fetch(request)
        .then((resp) => {
            if (resp.ok) {
                return resp.text();
            } else {
                throw new Error(`HTTP error ${resp.status}`);
            }
        })
        .then((body) => {
            console.log("profile:" + body);
        })
        .catch((error) => {
            console.error(error);
        });
}

const doAuth = async () => {
    acquireMinecraftAccessToken();
}

module.exports = {
    doAuth
}
