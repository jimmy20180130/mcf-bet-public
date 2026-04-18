module.exports =
{
  'pc': {
    '1.21.4': {
      get attributes () { return require("./minecraft-data/data/pc/1.21.3/attributes.json") },
      get blockCollisionShapes () { return require("./minecraft-data/data/pc/1.21.4/blockCollisionShapes.json") },
      get blocks () { return require("./minecraft-data/data/pc/1.21.4/blocks.json") },
      get blockLoot () { return require("./minecraft-data/data/pc/1.20/blockLoot.json") },
      get biomes () { return require("./minecraft-data/data/pc/1.21.4/biomes.json") },
      get commands () { return require("./minecraft-data/data/pc/1.20.3/commands.json") },
      get effects () { return require("./minecraft-data/data/pc/1.21.4/effects.json") },
      get enchantments () { return require("./minecraft-data/data/pc/1.21.1/enchantments.json") },
      get entities () { return require("./minecraft-data/data/pc/1.21.4/entities.json") },
      get entityLoot () { return require("./minecraft-data/data/pc/1.20/entityLoot.json") },
      get foods () { return require("./minecraft-data/data/pc/1.21.1/foods.json") },
      get instruments () { return require("./minecraft-data/data/pc/1.20.5/instruments.json") },
      get items () { return require("./minecraft-data/data/pc/1.21.4/items.json") },
      get language () { return require("./minecraft-data/data/pc/1.21.4/language.json") },
      get loginPacket () { return require("./minecraft-data/data/pc/1.21.3/loginPacket.json") },
      get mapIcons () { return require("./minecraft-data/data/pc/1.20.2/mapIcons.json") },
      get materials () { return require("./minecraft-data/data/pc/1.21.4/materials.json") },
      get particles () { return require("./minecraft-data/data/pc/1.21.4/particles.json") },
      get protocol () { return require("./minecraft-data/data/pc/1.21.4/protocol.json") },
      get recipes () { return require("./minecraft-data/data/pc/1.21.4/recipes.json") },
      get sounds () { return require("./minecraft-data/data/pc/1.21.4/sounds.json") },
      get tints () { return require("./minecraft-data/data/pc/1.21.4/tints.json") },
      get version () { return require("./minecraft-data/data/pc/1.21.4/version.json") },
      get windows () { return require("./minecraft-data/data/pc/1.16.1/windows.json") },
      proto: __dirname + '/minecraft-data/data/pc/1.21.4/proto.yml'
    },
  },
  'bedrock': {
    
  }
}
