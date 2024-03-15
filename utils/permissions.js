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
    let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config/config.json`, 'utf-8'))
    let roles = JSON.parse(fs.readFileSync(`${process.cwd()}/config/roles.json`, 'utf8'))
    let commands = JSON.parse(fs.readFileSync(`${process.cwd()}/config/commands.json`, 'utf-8'))
    let playerRole = await getPlayerRole(player_uuid);
    
    if (!playerRole || playerRole == 'Not Found') {
        return false;
    }

    playerRole = orderStrings(playerRole, roles);

    let isReversed = roles[playerRole[0]]['reverse_blacklist'];
    const inputArray = command.split(' ');
    let currentCommand = commands;
    let final_command = []
    for (const word of inputArray) {
        let matchingName = Object.keys(currentCommand).find((key) => {
            const names = currentCommand[key].name;
            return names && names.includes(word);
        });
        final_command.push(matchingName);
        if (inputArray.length > 1 && matchingName && currentCommand[matchingName].sub_commands) {
            currentCommand = currentCommand[matchingName].sub_commands;
            matchingName = Object.keys(currentCommand).find((key) => {
                const names = currentCommand[key].name;
                return names && names.includes(inputArray[inputArray.indexOf(word)+1]);
            });
        } else if (matchingName) {
            const commandName = final_command.join(' ');
            if (isReversed) {
                if (
                    roles[playerRole[0]].disallowed_commands === undefined ||
                    !roles[playerRole[0]].disallowed_commands.includes(commandName)
                ) {
                    return false;
                } else {
                    return true;
                }
            } else {
                if (
                    roles[playerRole[0]].disallowed_commands === undefined ||
                    !roles[playerRole[0]].disallowed_commands.includes(commandName)
                ) {
                    return true;
                } else {
                    return false;
                }
            }
        } else {
            return false;
        }
    }

    return true;
}

module.exports = {
    canUseCommand,
    orderStrings
};