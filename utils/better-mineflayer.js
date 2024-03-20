const Vec3 = require('vec3');

async function activateBlock (bot, block) {
    function vectorToDirection (v) {
        if (v.y < 0) {
            return 0
        } else if (v.y > 0) {
            return 1
        } else if (v.z < 0) {
            return 2
        } else if (v.z > 0) {
            return 3
        } else if (v.x < 0) {
            return 4
        } else if (v.x > 0) {
            return 5
        }
    }

    let direction = new Vec3(0, 1, 0)
    const directionNum = vectorToDirection(direction) // The packet needs a number as the direction
    let cursorPos = new Vec3(0.5, 0.5, 0.5)

    if (bot.supportFeature('blockPlaceHasHeldItem')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            heldItem: Item.toNotch(bot.heldItem),
            cursorX: cursorPos.scaled(16).x,
            cursorY: cursorPos.scaled(16).y,
            cursorZ: cursorPos.scaled(16).z
        })
    } else if (bot.supportFeature('blockPlaceHasHandAndIntCursor')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            hand: 0,
            cursorX: cursorPos.scaled(16).x,
            cursorY: cursorPos.scaled(16).y,
            cursorZ: cursorPos.scaled(16).z
        })
    } else if (bot.supportFeature('blockPlaceHasHandAndFloatCursor')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            hand: 0,
            cursorX: cursorPos.x,
            cursorY: cursorPos.y,
            cursorZ: cursorPos.z
        })
    } else if (bot.supportFeature('blockPlaceHasInsideBlock')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            hand: 0,
            cursorX: cursorPos.x,
            cursorY: cursorPos.y,
            cursorZ: cursorPos.z,
            insideBlock: false
        })
    }
}

module.exports = {
    activateBlock
}