import { App, PluginSettingTab, Setting } from "obsidian";
import type NovyxPlugin from "./main";

const SAVE_DEBOUNCE_MS = 400;

export class NovyxSettingTab extends PluginSettingTab {
  plugin: NovyxPlugin;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: App, plugin: NovyxPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Debounced save. Avoids re-creating the SDK client on every keystroke
   * (typing an API key) or every slider tick (dragging a threshold).
   * Settings are still flushed within 400 ms of the last change.
   */
  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.plugin.saveSettings();
    }, SAVE_DEBOUNCE_MS);
  }

  hide(): void {
    // Flush any pending save when the user closes the settings tab
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      void this.plugin.saveSettings();
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Novyx" });

    const intro = containerEl.createEl("p");
    intro.addClass("setting-item-description");
    intro.appendText("Persistent AI memory for your vault. ");
    const link = intro.createEl("a", {
      text: "Get a free API key at novyxlabs.com",
      attr: { href: "https://novyxlabs.com", target: "_blank", rel: "noopener" },
    });
    link.setAttr("style", "text-decoration: underline");
    intro.appendText(".");

    // Privacy disclosure — required so users understand the data boundary
    // before they paste an API key.
    const privacy = containerEl.createEl("div", { cls: "setting-item-description" });
    privacy.style.padding = "10px 12px";
    privacy.style.marginBottom = "12px";
    privacy.style.borderLeft = "3px solid var(--text-accent)";
    privacy.style.background = "var(--background-secondary)";
    privacy.style.borderRadius = "4px";
    privacy.createEl("strong", { text: "What gets sent to Novyx" });
    const list = privacy.createEl("ul");
    list.style.margin = "6px 0 0 0";
    list.style.paddingLeft = "20px";
    list.createEl("li", {
      text: "\"Remember current note\" sends the full note body (frontmatter stripped) to your Novyx API endpoint.",
    });
    list.createEl("li", {
      text: "Ghost Connections sends the note title + first 1000 characters as a similarity query whenever you open or switch notes.",
    });
    list.createEl("li", {
      text: "Your API key is stored locally in Obsidian's plugin data — never sent anywhere except as the Authorization header.",
    });

    new Setting(containerEl)
      .setName("Novyx API key")
      .setDesc("Your Novyx API key. Stored locally in this vault's plugin settings.")
      .addText((text) => {
        text
          .setPlaceholder("nram_...")
          .setValue(this.plugin.settings.apiKey)
          .onChange((value) => {
            this.plugin.settings.apiKey = value.trim();
            this.scheduleSave();
          });
        // Mask the input so the key doesn't leak on screen-share / shoulder-surf
        text.inputEl.type = "password";
        text.inputEl.autocomplete = "off";
        text.inputEl.spellcheck = false;
      });

    new Setting(containerEl)
      .setName("API URL")
      .setDesc("Novyx Core API base URL. Change only if you're self-hosting.")
      .addText((text) =>
        text
          .setPlaceholder("https://novyx-ram-api.fly.dev")
          .setValue(this.plugin.settings.apiUrl)
          .onChange((value) => {
            this.plugin.settings.apiUrl = value.trim() || "https://novyx-ram-api.fly.dev";
            this.scheduleSave();
          })
      );

    new Setting(containerEl)
      .setName("Vault tag")
      .setDesc(
        "Tag applied to memories from this vault. Defaults to the vault name. Used to scope Ghost Connections so cross-vault noise doesn't leak in."
      )
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.app.vault.getName())
          .setValue(this.plugin.settings.vaultTag)
          .onChange((value) => {
            this.plugin.settings.vaultTag = value.trim();
            this.scheduleSave();
          })
      );

    containerEl.createEl("h3", { text: "Ghost Connections" });

    new Setting(containerEl)
      .setName("Minimum similarity score")
      .setDesc(
        "Only show connections above this similarity threshold (0–1). Higher values mean fewer but more relevant matches."
      )
      .addSlider((slider) =>
        slider
          .setLimits(0.3, 0.9, 0.05)
          .setValue(this.plugin.settings.ghostMinScore)
          .setDynamicTooltip()
          .onChange((value) => {
            this.plugin.settings.ghostMinScore = value;
            this.scheduleSave();
          })
      );

    new Setting(containerEl)
      .setName("Maximum connections")
      .setDesc("How many ghost connections to show per note.")
      .addSlider((slider) =>
        slider
          .setLimits(5, 30, 1)
          .setValue(this.plugin.settings.ghostLimit)
          .setDynamicTooltip()
          .onChange((value) => {
            this.plugin.settings.ghostLimit = value;
            this.scheduleSave();
          })
      );
  }
}
