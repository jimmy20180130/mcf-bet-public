const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.stop.display_name,
    name: 'stop',
    description: commands.stop.description,
    aliases: commands.stop.name,
    usage: commands.stop.usage
}