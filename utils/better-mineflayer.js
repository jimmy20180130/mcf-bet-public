const Vec3 = require('vec3');

async function activateBlock (bot, block) {
    const cursorPos = new Vec3(0.5, 0.5, 0.5)
    bot._client.write('block_place', {
        location: block.position,
        direction: new Vec3(0, 1, 0),
        hand: 0,
        cursorX: cursorPos.x,
        cursorY: cursorPos.y,
        cursorZ: cursorPos.z,
        insideBlock: false
    })

    bot.swingArm()
}

module.exports = {
    activateBlock
}