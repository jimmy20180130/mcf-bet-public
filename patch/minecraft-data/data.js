module.exports =
{
  'pc': {
    '1.20.1': {
      get attributes () { return require("./minecraft-data/data/pc/1.17/attributes.json") },
      get blocks () { return require("./minecraft-data/data/pc/1.20/blocks.json") },
      get blockCollisionShapes () { return require("./minecraft-data/data/pc/1.20/blockCollisionShapes.json") },
      get biomes () { return require("./minecraft-data/data/pc/1.20/biomes.json") },
      get effects () { return require("./minecraft-data/data/pc/1.20/effects.json") },
      get items () { return require("./minecraft-data/data/pc/1.20/items.json") },
      get enchantments () { return require("./minecraft-data/data/pc/1.20/enchantments.json") },
      get recipes () { return require("./minecraft-data/data/pc/1.20/recipes.json") },
      get instruments () { return require("./minecraft-data/data/pc/1.20/instruments.json") },
      get materials () { return require("./minecraft-data/data/pc/1.20/materials.json") },
      get language () { return require("./minecraft-data/data/pc/1.20/language.json") },
      get entities () { return require("./minecraft-data/data/pc/1.20/entities.json") },
      get protocol () { return require("./minecraft-data/data/pc/1.20/protocol.json") },
      get windows () { return require("./minecraft-data/data/pc/1.16.1/windows.json") },
      get version () { return require("./minecraft-data/data/pc/1.20.1/version.json") },
      get foods () { return require("./minecraft-data/data/pc/1.20/foods.json") },
      get particles () { return require("./minecraft-data/data/pc/1.20/particles.json") },
      get blockLoot () { return require("./minecraft-data/data/pc/1.20/blockLoot.json") },
      get entityLoot () { return require("./minecraft-data/data/pc/1.20/entityLoot.json") },
      get loginPacket () { return require("./minecraft-data/data/pc/1.20/loginPacket.json") },
      get tints () { return require("./minecraft-data/data/pc/1.20/tints.json") },
      get mapIcons () { return require("./minecraft-data/data/pc/1.16/mapIcons.json") },
      get sounds () { return require("./minecraft-data/data/pc/1.20.1/sounds.json") }
    }
  },
  'bedrock': {}
}
