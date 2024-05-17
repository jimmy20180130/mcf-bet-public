const fs = require('fs');
const { getPlayerRole } = require(`${process.cwd()}/utils/database.js`);

function orderStrings(strings, data) {
    const order = Object.keys(data);
    const items = strings.split(', ');
    const ordered = [];

    order.forEach(key => {
        if(items.includes(key)) {
            ordered.push(items.splice(items.indexOf(key), 1)[0]);
        }
    });

    return [...ordered, ...items];
}

async function canUseCommand(player_uuid, command) {
    let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'))
    let commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf-8'))
    let playerRole = await getPlayerRole(player_uuid);
    
    if (!playerRole || playerRole == 'Not Found') {
        return false;
    }

    playerRole = orderStrings(playerRole, roles);

    let command_can_use = [];
    let command_cannot_use = [];
    let full_command = Object.keys(commands);

    for (const role of playerRole) {
        try {
            if (roles[role].reverse_blacklist == false) {
                command_cannot_use.push(roles[role]['disallowed_commands'])
                command_can_use.push(full_command.filter((command) => !roles[role]['disallowed_commands'].includes(command)))

            } else {
                command_can_use.push(roles[role]['disallowed_commands'])
                command_cannot_use.push(full_command.filter((command) => !roles[role]['disallowed_commands'].includes(command)))
            }
        } catch (e) {
            continue;
        }
    }

    command_can_use = [...new Set(command_can_use.flat())];
    command_cannot_use = [...new Set(command_cannot_use.flat())];

    command_cannot_use = command_cannot_use.filter((command) => {
        return !command_can_use.includes(command);
    })

    let final_command;

    if (!Object.keys(commands).includes(command)) {
        for (const cmd of Object.keys(commands)) {
            if (commands[cmd].name.includes(command)) {
                final_command = cmd;
                break;
            }
        }
    } else {
        final_command = command;
    }

    console.log(final_command)
    console.log(command_can_use)
    console.log(command_cannot_use)

    if (!final_command) {
        return false;
    } else if (command_cannot_use.includes(final_command)) {
        return false;
    } else if (command_can_use.includes(final_command)) {
        return true;
    } else {
        return false;
    }
}

module.exports = {
    canUseCommand,
    orderStrings
};