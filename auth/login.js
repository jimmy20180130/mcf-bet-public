const { Authflow, Titles } = require('prismarine-auth')
const minecraftFolderPath = require('minecraft-folder-path')

const doAuth = async (acc) => {
    const flow = new Authflow(acc, minecraftFolderPath+'/nmp-cache', { authTitle: Titles.MinecraftJava, deviceType: 'Win32', flow: 'sisu' })
    await flow.getMinecraftJavaToken({ fetchEntitlements: true, fetchProfile: true, fetchCertificates: true })
}

module.exports = {
    doAuth
}