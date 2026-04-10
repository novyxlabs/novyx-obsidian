import { App, PluginSettingTab, Setting } from "obsidian";
import type NovyxPlugin from "./main";

export class NovyxSettingTab extends PluginSettingTab {
  plugin: NovyxPlugin;

  constructor(app: App, plugin: NovyxPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Novyx" });

    const intro = containerEl.createEl("p");
    intro.addClass("setting-item-description");
    intro.appendText("Persistent AI memory for your Obsidian vault. ");
    const link = intro.createEl("a", {
      text: "Get a free API key at novyxlabs.com",
      attr: { href: "https://novyxlabs.com", target: "_blank", rel: "noopener" },
    });
    link.setAttr("style", "text-decoration: underline");
    intro.appendText(".");

    new Setting(containerEl)
      .setName("Novyx API key")
      .setDesc("Your Novyx API key. Stored locally in this vault's plugin settings.")
      .addText((text) => {
        text
          .setPlaceholder("nram_...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
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
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim() || "https://novyx-ram-api.fly.dev";
            await this.plugin.saveSettings();
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
          .onChange(async (value) => {
            this.plugin.settings.vaultTag = value.trim();
            await this.plugin.saveSettings();
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
          .onChange(async (value) => {
            this.plugin.settings.ghostMinScore = value;
            await this.plugin.saveSettings();
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
          .onChange(async (value) => {
            this.plugin.settings.ghostLimit = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
