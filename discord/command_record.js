const { command_record, dc_command_record } = require(`../discord/embed.js`);
const fs = require('fs')
const toml = require('toml');

async function command_records(client, player_id, command_name) {
    try {
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
        const channel = await client.channels.fetch(configtoml.discord_channels.command_record);
        const embed = await command_record(player_id, command_name);
        await channel.send({ embeds: [embed] });
    } catch (error) {}
}

async function dc_command_records(client, player_id, command_name) {
    try {
        const configtoml = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf8'));
        const channel = await client.channels.fetch(configtoml.discord_channels.command_record);
        const embed = await dc_command_record(player_id, command_name);
        await channel.send({ embeds: [embed] });
    } catch (error) {}
}

module.exports = {
    command_records,
    dc_command_records
};