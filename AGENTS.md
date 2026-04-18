# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Snapshot
- Runtime is Bun (not Node.js).
- This app runs two bot surfaces in parallel:
  - Minecraft bot via mineflayer
  - Discord bot via discord.js slash commands/interactions
- Persistent storage is SQLite (`bun:sqlite`) initialized on startup.

Read first:
- [index.js](index.js)
- [core/mcBot.js](core/mcBot.js)
- [core/dcBot.js](core/dcBot.js)
- [services/configService.js](services/configService.js)
- [database/index.js](database/index.js)
- [utils/logger.js](utils/logger.js)
- [utils/i18n.js](utils/i18n.js)

## Run & Build
- Start locally: `bun run index.js`
- Build Windows executable: `bun run scripts/build.js`
- Build output: `dist/mcf-bet-bot.exe`

Notes:
- `package.json` has no scripts; use direct Bun commands.
- `config.toml` is required at runtime; `config.local.toml` is for local override/secrets.

## Architecture Boundaries
- Startup orchestration: [index.js](index.js)
- Minecraft runtime/events/command dispatch: [core/mcBot.js](core/mcBot.js)
- Discord runtime/command loading/interactions: [core/dcBot.js](core/dcBot.js)
- Business logic services: [services](services)
- Data access models: [models](models)
- DB schema/bootstrap: [database/index.js](database/index.js)
- Command entrypoints:
  - Minecraft: [commands/minecraft/manifest.js](commands/minecraft/manifest.js)
  - Discord: [commands/discord/manifest.js](commands/discord/manifest.js)

## Conventions To Follow
- Config reads/writes must go through [services/configService.js](services/configService.js) for atomic TOML writes.
- Financial math should use `decimal.js`; avoid native float arithmetic for balances/payouts.
- User-facing text should use i18n keys via [utils/i18n.js](utils/i18n.js) and [locales/zh_TW.json](locales/zh_TW.json).
- Keep logging through [utils/logger.js](utils/logger.js) (module-scoped logger instances).
- Follow existing command module patterns in:
  - [commands/minecraft](commands/minecraft)
  - [commands/discord/slash](commands/discord/slash)
  - [commands/discord/interactions](commands/discord/interactions)

## Common Pitfalls
- Bun-only APIs are used (`bun:sqlite`, `Bun.build`), so Node.js execution is not a drop-in substitute.
- Payment/betting flows are queue-based (async service sequencing); avoid bypassing service queues.
- Minecraft chat send timing is throttled; rapid sends can be dropped or behave unexpectedly.
- Keep DB foreign-key behavior in mind when changing model relationships.
- There is a local patch at [patch/minecraft-protocol/src/client/tcp_dns.js](patch/minecraft-protocol/src/client/tcp_dns.js); verify compatibility before dependency upgrades.

## Extra References
- Flow overview: [docs/index_flowchart.mmd](docs/index_flowchart.mmd)
- Entry workflow (if present): [.github/workflows/action.yml](.github/workflows/action.yml)

## Scope Guardrails For Agents
- Prefer minimal, targeted edits; do not refactor unrelated modules.
- Preserve existing public command names and behavior unless explicitly requested.
- If changing config shape, update both parser/writer logic and impacted command/service readers.
- If adding new user-visible strings, add locale keys in [locales/zh_TW.json](locales/zh_TW.json).
