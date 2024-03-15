const fs = require('fs');
const commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf8'));

module.exports = {
    display_name: commands.donate.display_name,
    name: 'donate',
    description: commands.donate.description,
    aliases: commands.donate.name,
    usage: commands.donate.usage,
}