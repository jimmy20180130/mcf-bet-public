const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

async function send_giveaway(client, giveaway) {
    // # 好欸，有抽獎欸
    // ## 誰辦的?     👉 感謝拔拔 <@971730686685880322> 
    // ## 抽幾個人?     👉 抽 100 個人
    // ## 什麼時候開獎?     👉 <t:1716182040:F>  準時開獎！
    // ## 備註     👉 這是一個很棒的抽獎
    // ## 要怎麼參加?
    // ### - 您需要有身分組 <@&1178612139905261608> 
    // ### - 您不可有身分組 <@&1225108686263816252> 
    // ### - 符合上述條件，按底下的按鈕 ( ❤️ ) 即可參加抽獎

    // let giveaway = {
    //     message_id: null,
    //     prize: interaction.options.getString("prize"),
    //     winners: interaction.options.getInteger("winners"),
    //     duration: interaction.options.getInteger("duration"),
    //     start_time: Math.floor(Date.now() / 1000),
    //     channel: interaction.options.getChannel("channel").id,
    //     host: interaction.options.getUser("host") || interaction.user,
    //     role: interaction.options.getRole("include_role") || null,
    //     excluded_role: interaction.options.getRole("excluded_role") || null,
    //     description: interaction.options.getString("description") || null,
    //     entries: []
    // }

    let description = giveaway.description ? `## 備註     👉 ${giveaway.description}\n` : '';
    let exclude_role = giveaway.exclude_role ? `### - 您不可有身分組 ${giveaway.exclude_role}\n` : '';
    let require_role = giveaway.require_role ? `### - 您需要有身分組 ${giveaway.require_role}\n` : '';

    let message = (
        `# 好欸，有抽獎欸\n` +
        `## 抽什麼?     👉 ${giveaway.prize} 個綠寶石\n` +
        `## 誰辦的?     👉 ${giveaway.host}\n` +
        `## 抽幾個人?     👉 抽 ${giveaway.winners} 個人\n` +
        `## 什麼時候開獎?     👉 <t:${giveaway.duration + Math.floor(Date.now() / 1000)}:F>  準時開獎！\n` +
        `${description}` +
        `## 要怎麼參加?\n` + 
        `${require_role}` +
        `${exclude_role}` +
        `### - 符合上述條件，按底下的按鈕 ( ❤️ ) 即可參加抽獎`
    )
    
    //create button
    const join = new ButtonBuilder()
        .setCustomId('giveaway_join')
        .setLabel('參加抽獎')
        .setStyle(ButtonStyle.Primary);

    const total = new ButtonBuilder()
        .setCustomId('giveaway_total')
        .setLabel('參加人數 0')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const actionRow = new ActionRowBuilder()
        .addComponents(join)
        .addComponents(total);

    const channel = await client.channels.fetch(giveaway.channel);
    
    await channel.send({ content: message, components: [actionRow] }).then(msg => {
        giveaway.message_id = msg.id;
    });

    let giveaways = JSON.parse(fs.readFileSync(`${process.cwd()}/data/giveaways.json`));

    giveaways[giveaway.message_id] = giveaway;

    fs.writeFileSync(`${process.cwd()}/data/giveaways.json`, JSON.stringify(giveaways, null, 4));
}

module.exports = {
    send_giveaway
}