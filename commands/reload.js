const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.reload.display_name,
    name: 'reload',
    description: commands.reload.description,
    aliases: commands.reload.name,
    usage: commands.reload.usage
}