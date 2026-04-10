import { Plugin, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { NovyxSettings, DEFAULT_SETTINGS, VIEW_TYPE_GHOST } from "./src/types";
import { NovyxClient } from "./src/novyx-client";
import { GhostConnectionsView } from "./src/ghost-connections-view";
import { NovyxSettingTab } from "./settings";

export default class NovyxPlugin extends Plugin {
  settings: NovyxSettings = DEFAULT_SETTINGS;
  client: NovyxClient | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.initClient();

    this.registerView(
      VIEW_TYPE_GHOST,
      (leaf: WorkspaceLeaf) => new GhostConnectionsView(leaf, this)
    );

    this.addRibbonIcon("brain", "Novyx Ghost Connections", () => {
      void this.activateGhostView();
    });

    this.addCommand({
      id: "remember-current-note",
      name: "Remember current note",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) void this.rememberFile(file);
        return true;
      },
    });

    this.addCommand({
      id: "open-ghost-connections",
      name: "Show Ghost Connections sidebar",
      callback: () => {
        void this.activateGhostView();
      },
    });

    this.addSettingTab(new NovyxSettingTab(this.app, this));
  }

  onunload(): void {
    // Obsidian will automatically unregister views and commands
  }

  /**
   * (Re)create the Novyx SDK client. Called on plugin load and whenever
   * the API key or URL changes in settings.
   */
  initClient(): void {
    if (!this.settings.apiKey) {
      this.client = null;
      return;
    }
    try {
      this.client = new NovyxClient(this.settings.apiKey, this.settings.apiUrl);
    } catch (err) {
      console.error("[Novyx] Failed to initialize client:", err);
      this.client = null;
      new Notice("Novyx: Could not initialize client. Check your API key.");
    }
  }

  /**
   * The tag applied to every memory from this vault. Used to scope
   * Ghost Connections queries so cross-vault noise doesn't leak in.
   */
  vaultTagValue(): string {
    const custom = this.settings.vaultTag.trim();
    const name = custom || this.app.vault.getName();
    return `obsidian:${name.toLowerCase().replace(/\s+/g, "-")}`;
  }

  async rememberFile(file: TFile): Promise<void> {
    if (!this.client) {
      new Notice("Novyx: Set your API key in plugin settings first.");
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      // Strip YAML frontmatter so it doesn't pollute the embedding
      const body = raw.replace(/^---[\s\S]*?---/, "").trim();
      const observation = `${file.basename}\n\n${body}`;

      // Identity tag uses file.path because file.basename is neither unique
      // (two notes can share a name in different folders) nor the right key
      // for self-filtering or "open source note" actions. path:... gives us
      // a stable-within-this-session identifier. Note: renaming a file will
      // orphan the memory — we document this trade-off in the README.
      await this.client.remember(observation, [
        "obsidian",
        this.vaultTagValue(),
        `path:${file.path}`,
      ]);

      new Notice(`Novyx: Remembered "${file.basename}"`);
    } catch (err) {
      console.error("[Novyx] Remember failed:", err);
      new Notice("Novyx: Failed to save memory. Check the console for details.");
    }
  }

  async activateGhostView(): Promise<void> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_GHOST)[0];
    if (existing) {
      workspace.revealLeaf(existing);
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_GHOST, active: true });
    workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<NovyxSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.initClient();
  }
}
