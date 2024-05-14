const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');

async function bet_record(field0, field1, field2, field3, field4, field5, field6, field7, image_url) {
    const embed = new EmbedBuilder()
        .setColor(0x00FFFF)
        .setTitle('流水查詢')
        .addFields(
            { name: '玩家 ID', value: field0.replaceAll(/([^\\])_/g, '$1\\_'), inline: true },
            { name: 'Discord', value: field1, inline: true },
            { name: '查詢場所', value: field2, inline: true },
            { name: '玩家 UUID', value: field3, inline: false },
            { name: '查詢期間', value: field4, inline: false },
            { name: '金額限制', value: field5, inline: false },
            { name: '綠寶石', value: field6, inline: false },
            { name: '村民錠', value: field7, inline: false },
        )
        .setColor("#313338")
        .setThumbnail(image_url)
        .setFooter({ text: 'Jimmy Bot', iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
        .setTimestamp();

    return embed;
}

async function command_record(field0, field1) {
    const embed = new EmbedBuilder()
        .setColor("#0097f5")
        .setTitle("指令紀錄")
        .setDescription(`玩家 ${field0.replaceAll(/([^\\])_/g, '$1\\_')} 觸發了指令 ${field1}`)
        .setColor("#313338")
        .setFooter({ text: 'Jimmy Bot', iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
        .setTimestamp();

    return embed;
}

async function dc_command_record(field0, field1) {
    const embed = new EmbedBuilder()
        .setColor("#0097f5")
        .setTitle("Discord 指令紀錄")
        .setDescription(`玩家 ${field0.replaceAll(/([^\\])_/g, '$1\\_')} 觸發了 Discord 指令 ${field1}`)
        .setColor("#313338")
        .setFooter({ text: 'Jimmy Bot', iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
        .setTimestamp();

    return embed;
}

async function bet_win(field0, field1) {
    const embed = new EmbedBuilder()
        .setDescription("中獎" + "【" + field0.replaceAll(/([^\\])_/g, '$1\\_') + "】" + field1)
        .setColor("#00f597")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();

    return embed;
}

async function bet_lose(field0, field1) {
    const embed = new EmbedBuilder()
        .setDescription("未中獎" + "【" + field0.replaceAll(/([^\\])_/g, '$1\\_') + "】" + field1)
        .setColor("#f50000")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();
    
    return embed;
}

async function bot_on(field0) {
    const embed = new EmbedBuilder()
        .setTitle("🟢 | Minecraft 機器人上線囉")
        .setDescription(field0)
        .setColor("#04f500")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();

    return embed;
}

async function bot_off(field0) {
    const embed = new EmbedBuilder()
        .setTitle("🔴 | Minecraft 機器人下線了")
        .setDescription(field0)
        .setColor("#f50000")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();

    return embed;
}

async function bot_kicked(field0) {
    const embed = new EmbedBuilder()
        .setTitle("🟠 | Minecraft 機器人被伺服器踢出")
        .setDescription(field0)
        .setColor("#f57600")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();

    return embed;
}

async function link_embed(playerid, player_uuid, dc_tag, dc_id, player_id) {
    const embed = new EmbedBuilder()
        .setTitle("綁定成功")
        .setDescription(`玩家 ${playerid.replaceAll(/([^\\])_/g, '$1\\_')} 成功綁定帳號`)
        .addFields(
            {
                name: "玩家名稱",
                value: playerid.replaceAll(/([^\\])_/g, '$1\\_'),
                inline: true
            },
            {
                name: "玩家UUID",
                value: player_uuid,
                inline: false
            },
            {
                name: "Discord名稱",
                value: dc_tag,
                inline: true
            },
            {
                name: "Discord ID",
                value: dc_id,
                inline: true
            },
            {
                name: "綁定時間",
                value: moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
                inline: false
            },
        )
        .setThumbnail(`https://mc-heads.net/avatar/${player_id}/100.png`)
        .setColor("#00b0f4")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();

    return embed
}

async function error_embed(field0) {
    const embed = new EmbedBuilder()
        .setTitle("❌ | 發生錯誤")
        .addFields(
            {
                name: "原因",
                value: field0,
                inline: false
            }
        )
        .setColor("#f50000")
        .setFooter({
            text: "Jimmy Bot",
            iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
        })
        .setTimestamp();

    return embed;
}

module.exports = {
    bet_record,
    command_record,
    dc_command_record,
    bet_win,
    bet_lose,
    bot_on,
    bot_off,
    bot_kicked,
    link_embed,
    error_embed
}