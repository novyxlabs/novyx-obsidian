# Novyx for Obsidian

**Persistent AI memory for your Obsidian vault.**

Your AI assistant forgets everything between sessions. Vector search plugins just search your notes when you ask a question — they don't remember. Novyx gives your vault a persistent memory layer that survives across sessions, surfaces hidden connections between notes, and can be rolled back if something goes wrong.

## What it does

- **Ghost Connections** — The sidebar shows semantically related memories for the note you're editing, even when there's no shared keyword or explicit wiki-link. Click any result to jump to that note or insert a `[[wiki-link]]` inline.
- **Remember current note** — A command that stores the active note in Novyx's persistent memory layer with a vault-scoped tag. Run it from the command palette or bind a shortcut.
- **Works with your existing vault** — No migration, no lock-in. Your notes stay as plain markdown. Novyx runs alongside.

## Install

### From the Community Plugins marketplace (recommended, coming soon)

1. Open Obsidian Settings → Community plugins → Browse
2. Search for **Novyx**
3. Install, enable, and configure your API key in settings

### From BRAT (beta / manual install)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add `novyxlabs/novyx-obsidian` as a beta plugin
3. Enable Novyx in Obsidian settings

### Manual

```bash
git clone https://github.com/novyxlabs/novyx-obsidian.git
cd novyx-obsidian
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into `<your-vault>/.obsidian/plugins/novyx-obsidian/` and enable the plugin in Obsidian.

## Setup

1. Get a free Novyx API key at [novyxlabs.com](https://novyxlabs.com) (no credit card, 5,000 memories included).
2. Open the plugin settings in Obsidian and paste your key.
3. (Optional) Customize the vault tag, ghost connection threshold, and result limit.

## Usage

- **Open the Ghost Connections sidebar**: click the brain icon in the ribbon, or run "Novyx: Show Ghost Connections sidebar" from the command palette.
- **Remember a note**: open any markdown note and run "Novyx: Remember current note" from the command palette. The note is stored in your Novyx memory layer with tags for this vault and note basename.
- **Find connections**: as you switch between notes, the Ghost Connections sidebar updates automatically with semantically related memories. Click a result to open the source note, or click "Insert wiki-link" to add `[[Note Name]]` at your cursor position.

## Why this is different

Every other Obsidian AI plugin does **retrieval** — vector search over your existing notes. Close the session, ask again, it all starts from scratch.

Novyx is different:

1. **Cross-session memory** — The AI remembers what you told it, what you wrote, and how you think — across every session.
2. **Ghost Connections** — Find semantic relationships between notes that you never explicitly linked. No shared keywords required.
3. **Memory rollback** (via Vault app) — Undo what the AI learned at any point in time. Cryptographic audit trail for every operation.
4. **Unified memory** — The same memory layer works across Obsidian, Claude Code, and Cursor via MCP. Your coding context shows up in your notes. Your notes show up in your coding agent.

## Known limitations (v0.1)

- **Rename orphans memories.** Memories are keyed to the note's file path. If you rename or move a note, the old memory stays in Novyx but is no longer linked to the new location. A new "Remember" will create a fresh memory at the new path. Ghost Connections will show the old memory as `(source note missing: ...)` until manually cleaned up. A future version will track renames automatically.
- **Desktop only.** The plugin is flagged `isDesktopOnly: true` for v0.1 while we verify the Novyx SDK bundle runs cleanly on iOS/Android. Mobile support is on the v0.2 roadmap.
- **No memory dedupe on re-Remember.** Running "Remember current note" twice on the same note stores two memories. This is intentional for v0.1 — memory history matters. A future version will let you choose between dedupe and versioning.

## Related

- **[Novyx Vault](https://vault.novyxlabs.com)** — The full Novyx second-brain app (markdown editor, voice capture, knowledge graph, memory rollback UI, governance dashboard). Self-hostable, MIT licensed.
- **[Novyx Core](https://novyxlabs.com)** — The open-source memory infrastructure that powers this plugin, Vault, and our MCP server.
- **[novyx-mcp](https://github.com/novyxlabs/novyx-mcp)** — The MCP server that brings Novyx memory to Claude Code and Cursor.

## License

MIT © Novyx Labs

## Contributing

Bug reports and pull requests welcome. This is an MVP — we expect the scope to grow. If you have a feature request, open an issue before submitting a PR so we can align on direction.
