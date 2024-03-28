const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { get_pay_history, getPlayerRole, get_user_data } = require(`${process.cwd()}/utils/database.js`);
const { validate_code } = require(`${process.cwd()}/utils/link_handler.js`);
const { get_player_uuid, get_player_name } = require(`${process.cwd()}/utils/get_player_info.js`);
const { command_record, dc_command_record } = require(`${process.cwd()}/discord/embed.js`);
const fs = require('fs')

async function command_records(client, player_id, command_name) {
    try {
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        const channel = await client.channels.fetch(config.discord_channels.command_record);
        const embed = await command_record(player_id, command_name);
        await channel.send({ embeds: [embed] });
    } catch (error) {}
}

async function dc_command_records(client, player_id, command_name) {
    try {
        const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
        const channel = await client.channels.fetch(config.discord_channels.command_record);
        const embed = await dc_command_record(player_id, command_name);
        await channel.send({ embeds: [embed] });
    } catch (error) {}
}

module.exports = {
    command_records,
    dc_command_records
};