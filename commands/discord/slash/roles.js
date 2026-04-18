const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { readConfig } = require('../../../services/configService');
const { tForInteraction } = require('../../../utils/i18n');
const Rank = require('../../../models/Rank');
const { getBotKeyFromConfigBot, normalizeBotKey, resolveBotKeyFromIdentifier } = require('../../../utils/botKey');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roles')
		.setNameLocalizations({
			'zh-TW': '身份組'
		})
		.setDescription('Manage role mappings')
		.setDescriptionLocalizations({
			'zh-TW': '管理身份組與 Discord 身份組綁定'
		})
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setNameLocalizations({
					'zh-TW': '新增'
				})
				.setDescription('Add a role')
				.setDescriptionLocalizations({
					'zh-TW': '新增身份組'
				})
				.addStringOption(option =>
					option
						.setName('bot')
						.setNameLocalizations({ 'zh-TW': '機器人' })
						.setDescription('Target bot')
						.setDescriptionLocalizations({ 'zh-TW': '要套用的機器人' })
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('name')
						.setNameLocalizations({ 'zh-TW': '名稱' })
						.setDescription('role display name')
						.setDescriptionLocalizations({ 'zh-TW': '身份組顯示名稱' })
						.setRequired(true)
				)
				.addRoleOption(option =>
					option
						.setName('discord_role')
						.setNameLocalizations({ 'zh-TW': 'discord身份組' })
						.setDescription('Discord role to map')
						.setDescriptionLocalizations({ 'zh-TW': '要綁定的 Discord 身份組' })
                        .setRequired(true)
				)
				.addNumberOption(option =>
					option
						.setName('bonusodds')
						.setNameLocalizations({ 'zh-TW': '加成賠率' })
						.setDescription('Bonus odds for this role')
						.setDescriptionLocalizations({ 'zh-TW': '此身份組的加成賠率' })
				)
				.addIntegerOption(option =>
					option
						.setName('daily_emerald')
						.setNameLocalizations({ 'zh-TW': '每日簽到綠寶石' })
						.setDescription('Daily sign-in emerald reward')
						.setDescriptionLocalizations({ 'zh-TW': '每日簽到綠寶石獎勵' })
						.setMinValue(0)
				)
				.addIntegerOption(option =>
					option
						.setName('daily_coin')
						.setNameLocalizations({ 'zh-TW': '每日簽到村民錠' })
						.setDescription('Daily sign-in coin reward')
						.setDescriptionLocalizations({ 'zh-TW': '每日簽到村民錠獎勵' })
						.setMinValue(0)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setNameLocalizations({
					'zh-TW': '移除'
				})
				.setDescription('Remove a role')
				.setDescriptionLocalizations({
					'zh-TW': '移除身份組'
				})
				.addStringOption(option =>
					option
						.setName('rank')
						.setNameLocalizations({ 'zh-TW': '身份組' })
						.setDescription('Rank id to remove')
						.setDescriptionLocalizations({ 'zh-TW': '要移除的身份組' })
						.setAutocomplete(true)
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('edit')
				.setNameLocalizations({
					'zh-TW': '編輯'
				})
				.setDescription('Edit a role')
				.setDescriptionLocalizations({
					'zh-TW': '編輯身份組'
				})
                .addStringOption(option =>
					option
						.setName('rank')
						.setNameLocalizations({ 'zh-TW': '身份組' })
						.setDescription('Rank id to edit')
						.setDescriptionLocalizations({ 'zh-TW': '要編輯的身份組' })
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('bot')
						.setNameLocalizations({ 'zh-TW': '機器人' })
						.setDescription('Target bot after edit')
						.setDescriptionLocalizations({ 'zh-TW': '編輯後套用的機器人' })
						.setAutocomplete(true)
				)
				.addStringOption(option =>
					option
						.setName('name')
						.setNameLocalizations({ 'zh-TW': '名稱' })
						.setDescription('New display name')
						.setDescriptionLocalizations({ 'zh-TW': '新的顯示名稱' })
				)
				.addRoleOption(option =>
					option
						.setName('discord_role')
						.setNameLocalizations({ 'zh-TW': 'discord身份組' })
						.setDescription('New Discord role mapping')
						.setDescriptionLocalizations({ 'zh-TW': '新的 Discord 身份組綁定' })
				)
				.addNumberOption(option =>
					option
						.setName('bonusodds')
						.setNameLocalizations({ 'zh-TW': '加成賠率' })
						.setDescription('New bonus odds')
						.setDescriptionLocalizations({ 'zh-TW': '新的加成賠率' })
				)
				.addIntegerOption(option =>
					option
						.setName('daily_emerald')
						.setNameLocalizations({ 'zh-TW': '每日簽到綠寶石' })
						.setDescription('New daily sign-in emerald reward')
						.setDescriptionLocalizations({ 'zh-TW': '新的每日簽到綠寶石獎勵' })
						.setMinValue(0)
				)
				.addIntegerOption(option =>
					option
						.setName('daily_coin')
						.setNameLocalizations({ 'zh-TW': '每日簽到村民錠' })
						.setDescription('New daily sign-in coin reward')
						.setDescriptionLocalizations({ 'zh-TW': '新的每日簽到村民錠獎勵' })
						.setMinValue(0)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setNameLocalizations({
					'zh-TW': '查看'
				})
				.setDescription('Listroles')
				.setDescriptionLocalizations({
					'zh-TW': '查看身份組'
				})
				.addStringOption(option =>
					option
						.setName('bot')
						.setNameLocalizations({ 'zh-TW': '機器人' })
						.setDescription('Target bot (optional)')
						.setDescriptionLocalizations({ 'zh-TW': '要查詢的機器人（可省略）' })
						.setAutocomplete(true)
				)
				.addStringOption(option =>
					option
						.setName('rank')
						.setNameLocalizations({ 'zh-TW': '身份組' })
						.setDescription('Rank id to view details')
						.setDescriptionLocalizations({ 'zh-TW': '指定後顯示該身份組的詳細資料' })
						.setAutocomplete(true)
				)
		),

	autocomplete,
	execute
};

async function autocomplete(interaction) {
	const focusedOption = interaction.options.getFocused(true);
	const focusedValue = String(focusedOption.value || '');

	if (focusedOption.name === 'bot') {
		const config = readConfig();
		const choices = await Promise.all((config.bots || []).map(async bot => ({
			botid: bot.username,
			botkey: getBotKeyFromConfigBot(bot)
		})));

		await interaction.respond(
			choices
				.filter(choice => (choice.botid || '').toLowerCase().includes(focusedValue.toLowerCase()))
				.slice(0, 25)
				.map(choice => ({ name: choice.botid, value: choice.botkey }))
		);
		return;
	}

	if (focusedOption.name === 'rank') {
		const query = focusedValue.toLowerCase();
		const config = readConfig();
		const botInput = interaction.options.getString('bot');
		const subcommand = interaction.options.getSubcommand(false);

		const botKeys = (subcommand === 'list' && botInput)
			? [resolveBotKeyFromIdentifier(config.bots || [], botInput)].filter(Boolean)
			: (config.bots || []).map(bot => getBotKeyFromConfigBot(bot));

		const allRanks = botKeys.flatMap(botKey => Rank.getByBot(botKey));

		await interaction.respond(
			allRanks
				.filter(rank => {
					const label = `${rank.id} ${rank.displayName} ${rank.discordid || ''}`.toLowerCase();
					return label.includes(query);
				})
				.slice(0, 25)
				.map(rank => ({
					name: `[${rank.id}] ${rank.displayName} ${rank.discordid ? `(<@&${rank.discordid}>)` : '(未綁定 Discord 身份組)'}`,
					value: String(rank.id)
				}))
		);
	}
}

async function execute(interaction) {
	await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

	if (!interaction.member?.permissions?.has('Administrator')) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.noPermission') });
		return;
	}

	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'add') {
		await handleAdd(interaction);
		return;
	}

	if (subcommand === 'remove') {
		await handleRemove(interaction);
		return;
	}

	if (subcommand === 'edit') {
		await handleEdit(interaction);
		return;
	}

	if (subcommand === 'list') {
		await handleList(interaction);
	}
}

async function handleAdd(interaction) {
	const config = readConfig();
	const botKey = resolveBotKeyFromIdentifier(config.bots || [], interaction.options.getString('bot', true));
	const name = interaction.options.getString('name', true).trim();
	const discordRole = interaction.options.getRole('discord_role');
	const bonusodds = interaction.options.getNumber('bonusodds');
	const dailyEmerald = interaction.options.getInteger('daily_emerald');
	const dailyCoin = interaction.options.getInteger('daily_coin');

	if (!botKey) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.botNotFound') });
		return;
	}

	if (!name) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.nameRequired') });
		return;
	}

	const existing = Rank.getByBot(botKey).find(rank => rank.displayName.toLowerCase() === name.toLowerCase());
	if (existing) {
		await interaction.editReply({
			content: tForInteraction(interaction, 'dc.roles.duplicateName', { name })
		});
		return;
	}

	const result = Rank.create({
		displayName: name,
		bot: botKey,
		discordid: discordRole?.id || '',
		bonusodds: bonusodds || 0,
		daily: {
			e: Number(dailyEmerald ?? 0),
			c: Number(dailyCoin ?? 0)
		}
	});

	await interaction.editReply({
		content: tForInteraction(interaction, 'dc.roles.added', {
			id: result.lastInsertRowid,
			name,
			discordRole: discordRole ? `<@&${discordRole.id}>` : tForInteraction(interaction, 'common.none'),
			bonusodds: String(Number(bonusodds || 0)),
			dailyEmerald: String(Number(dailyEmerald ?? 0)),
			dailyCoin: String(Number(dailyCoin ?? 0))
		})
	});
}

async function handleRemove(interaction) {
	const rankId = Number(interaction.options.getString('rank', true));
	const rank = Rank.getById(rankId);

	if (!rank) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.notFound') });
		return;
	}

	const defaultRank = Rank.ensureDefaultForBot(rank.bot);
	if (Number(defaultRank.id) === Number(rank.id)) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.cannotRemoveDefault') });
		return;
	}

	Rank.delete(rank.id);
	await interaction.editReply({
		content: tForInteraction(interaction, 'dc.roles.removed', {
			id: rank.id,
			name: rank.displayName
		})
	});
}

async function handleEdit(interaction) {
	const nextBotKey = interaction.options.getString('bot');
	const rankId = Number(interaction.options.getString('rank', true));
	const rank = Rank.getById(rankId);
	const config = readConfig();

	if (!rank) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.notFound') });
		return;
	}

	const name = interaction.options.getString('name');
	const discordRole = interaction.options.getRole('discord_role');
	const bonusodds = interaction.options.getNumber('bonusodds');
	const dailyEmerald = interaction.options.getInteger('daily_emerald');
	const dailyCoin = interaction.options.getInteger('daily_coin');

	const updates = {};
	if (name !== null) updates.displayName = name.trim();
	if (bonusodds !== null) updates.bonusodds = bonusodds;
	if (nextBotKey !== null) {
		const resolvedBotKey = resolveBotKeyFromIdentifier(config.bots || [], nextBotKey);
		if (!resolvedBotKey) {
			await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.botNotFound') });
			return;
		}

		updates.bot = resolvedBotKey;
	}
	if (discordRole) {
		updates.discordid = discordRole.id;
	}

	if (dailyEmerald !== null || dailyCoin !== null) {
		const currentDaily = rank?.daily && typeof rank.daily === 'object' ? rank.daily : {};
		updates.daily = {
			e: Number(dailyEmerald ?? currentDaily.e ?? 0),
			c: Number(dailyCoin ?? currentDaily.c ?? 0)
		};
	}

	if (Object.keys(updates).length === 0) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.noChanges') });
		return;
	}

	Rank.update(rankId, updates);
	const updated = Rank.getById(rankId);
	await interaction.editReply({
		content: tForInteraction(interaction, 'dc.roles.edited', {
			id: updated.id,
			name: updated.displayName,
			bot: updated.bot,
			discordRole: updated.discordid ? `<@&${updated.discordid}>` : tForInteraction(interaction, 'common.none'),
			bonusodds: String(Number(updated.bonusodds || 0)),
			dailyEmerald: String(Number(updated?.daily?.e || 0)),
			dailyCoin: String(Number(updated?.daily?.c || 0))
		})
	});
}

async function handleList(interaction) {
	const botKey = interaction.options.getString('bot');
	const rankInput = interaction.options.getString('rank');
	const config = readConfig();
	const resolvedFilterBotKey = botKey
		? resolveBotKeyFromIdentifier(config.bots || [], botKey)
		: '';

	if (botKey && !resolvedFilterBotKey) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.botNotFound') });
		return;
	}

	if (rankInput) {
		const rankId = Number(rankInput);
		const rank = Rank.getById(rankId);

		if (!rank) {
			await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.notFound') });
			return;
		}

		if (resolvedFilterBotKey) {
			if (rank.bot !== resolvedFilterBotKey) {
				await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.rankNotInBot') });
				return;
			}
		}

		const botName = (config.bots || []).find(b => getBotKeyFromConfigBot(b) === rank.bot)?.username || rank.bot;
		const dcRole = rank.discordid ? `<@&${rank.discordid}>` : tForInteraction(interaction, 'common.none');
		const daily = rank?.daily && typeof rank.daily === 'object' ? rank.daily : {};

		await interaction.editReply({
			content: tForInteraction(interaction, 'dc.roles.detail', {
				id: String(rank.id),
				name: rank.displayName,
				botName,
				botKey: rank.bot,
				discordRole: dcRole,
				bonusodds: String(Number(rank.bonusodds || 0)),
				dailyEmerald: String(Number(daily.e || 0)),
				dailyCoin: String(Number(daily.c || 0))
			})
		});
		return;
	}

	const targetBots = resolvedFilterBotKey
		? [resolvedFilterBotKey]
		: (config.bots || []).map(bot => getBotKeyFromConfigBot(bot));

	const sections = [];

	for (const botKey of targetBots) {
		const ranks = Rank.getByBot(botKey);
		if (ranks.length === 0) continue;

		const botName = (config.bots || []).find(b => getBotKeyFromConfigBot(b) === botKey)?.username || botKey;
		const lines = ranks.map(rank => {
			const dcRole = rank.discordid ? `<@&${rank.discordid}>` : tForInteraction(interaction, 'common.none');
			const daily = rank?.daily && typeof rank.daily === 'object' ? rank.daily : {};
			return `- [${rank.id}] ${rank.displayName} | Discord: ${dcRole} | bonusodds: ${Number(rank.bonusodds || 0)} | daily: e=${Number(daily.e || 0)}, c=${Number(daily.c || 0)}`;
		});

		sections.push(`${botName} (${botKey})\n${lines.join('\n')}`);
	}

	if (sections.length === 0) {
		await interaction.editReply({ content: tForInteraction(interaction, 'dc.roles.empty') });
		return;
	}

	await interaction.editReply({
		content: tForInteraction(interaction, 'dc.roles.listHeader', {
			content: sections.join('\n\n')
		})
	});
}
