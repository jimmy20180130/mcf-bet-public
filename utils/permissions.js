const fs = require('fs');
const { get_user_data } = require(`../utils/database.js`);
const { get_player_name } = require(`../utils/get_player_info.js`);
const config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf8'));
const Logger = require('../utils/logger.js');

async function canUseCommand(player_uuid, command) {
    const not_linked_user_commands = [ "help", "wallet", "link" ];
    const normal_user_commands = [ "help", "hi", "play", "daily", "wallet" ];
    const admin_commands = [ "help", "hi", "link", "play", "stop", "reload", "daily", "wallet", "donate", "cmd", "epay", "cpay", "say", "money" ];

    const player_data = await get_user_data(player_uuid);

    if (config.whitelist.includes(await get_player_name(player_uuid))) {
        Logger.debug(`[權限] 玩家 ${await get_player_name(player_uuid)} ，權限：管理員，指令：${command}，是否可用：${'是' ? admin_commands.includes(command) : '否'}`);
        return admin_commands.includes(command);

    } else if (player_data) {
        Logger.debug(`[權限] 玩家 ${await get_player_name(player_uuid)} ，權限：已綁定，指令：${command}，是否可用：${'是' ? normal_user_commands.includes(command) : '否'}`);
        return normal_user_commands.includes(command);

    } else {
        Logger.debug(`[權限] 玩家 ${await get_player_name(player_uuid)} ，權限：未綁定，指令：${command}，是否可用：${'是' ? not_linked_user_commands.includes(command) : '否'}`);
        return not_linked_user_commands.includes(command);

    };
};

module.exports = {
    canUseCommand
};