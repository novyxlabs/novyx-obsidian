import { ItemView, TFile, WorkspaceLeaf, Notice, MarkdownView } from "obsidian";
import { VIEW_TYPE_GHOST, type GhostMemory } from "./types";
import type NovyxPlugin from "../main";

export class GhostConnectionsView extends ItemView {
  private plugin: NovyxPlugin;
  private currentFile: TFile | null = null;
  private loading = false;
  private results: GhostMemory[] = [];
  private lastError: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: NovyxPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_GHOST;
  }

  getDisplayText(): string {
    return "Ghost Connections";
  }

  getIcon(): string {
    return "brain";
  }

  async onOpen(): Promise<void> {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        void this.refreshForActiveFile();
      })
    );
    await this.refreshForActiveFile();
  }

  async onClose(): Promise<void> {
    // nothing to clean up
  }

  private async refreshForActiveFile(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = view?.file ?? null;

    if (!file || file.extension !== "md") {
      this.currentFile = null;
      this.results = [];
      this.render();
      return;
    }

    if (this.currentFile?.path === file.path) return;

    this.currentFile = file;
    await this.fetchConnections();
  }

  async fetchConnections(): Promise<void> {
    const client = this.plugin.client;
    if (!client || !this.currentFile) {
      this.render();
      return;
    }

    // Snapshot the target file at the start of the request. If the user
    // switches notes before this completes, a later fetchConnections()
    // will run for the new file — we must not overwrite it with the
    // stale results from this one.
    const targetFile = this.currentFile;
    const targetPath = targetFile.path;

    this.loading = true;
    this.lastError = null;
    this.render();

    try {
      const content = await this.app.vault.read(targetFile);
      const query = this.buildQuery(targetFile.basename, content);

      const memories = await client.ghostConnections(query, {
        limit: this.plugin.settings.ghostLimit,
        minScore: this.plugin.settings.ghostMinScore,
        vaultTag: this.plugin.vaultTagValue(),
      });

      // Drop this result set if the user switched notes mid-flight.
      if (this.currentFile?.path !== targetPath) return;

      // Filter out the current note's own memory so we don't recommend self-links.
      // Identity is keyed off file.path — basenames collide across folders.
      const selfTag = `path:${targetPath}`;
      this.results = memories.filter((m) => !m.tags.includes(selfTag));
    } catch (err) {
      if (this.currentFile?.path !== targetPath) return;
      console.error("[Novyx] Ghost Connections fetch failed:", err);
      this.lastError = err instanceof Error ? err.message : "Unknown error";
      this.results = [];
    } finally {
      if (this.currentFile?.path === targetPath) {
        this.loading = false;
        this.render();
      }
    }
  }

  /**
   * Build a query string from the note. We use the title + first 1000 chars of body
   * — more than that and the embedding model just gets noisier.
   */
  private buildQuery(title: string, body: string): string {
    const trimmedBody = body
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "") // strip YAML frontmatter (line-anchored fences)
      .trim()
      .slice(0, 1000);
    return `${title}\n\n${trimmedBody}`;
  }

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("novyx-ghost-view");

    // Header
    const header = container.createEl("div", { cls: "novyx-header" });
    header.createEl("h4", { text: "Ghost Connections" });
    const refreshBtn = header.createEl("button", {
      cls: "novyx-refresh-btn",
      attr: { "aria-label": "Refresh" },
    });
    refreshBtn.setText("Refresh");
    refreshBtn.addEventListener("click", () => void this.fetchConnections());

    // Not configured state
    if (!this.plugin.client) {
      const notConfigured = container.createEl("div", { cls: "novyx-empty" });
      notConfigured.createEl("p", {
        text: "Add your Novyx API key in plugin settings to see Ghost Connections.",
      });
      const link = notConfigured.createEl("a", {
        text: "Get a free API key →",
        attr: { href: "https://novyxlabs.com", target: "_blank", rel: "noopener" },
      });
      link.addClass("novyx-link");
      return;
    }

    // No file open
    if (!this.currentFile) {
      container.createEl("p", {
        cls: "novyx-empty",
        text: "Open a markdown note to see its Ghost Connections.",
      });
      return;
    }

    // Current file indicator
    container.createEl("p", {
      cls: "novyx-subtitle",
      text: `For: ${this.currentFile.basename}`,
    });

    // Loading state
    if (this.loading) {
      container.createEl("p", { cls: "novyx-empty", text: "Searching memory…" });
      return;
    }

    // Error state
    if (this.lastError) {
      container.createEl("p", {
        cls: "novyx-error",
        text: `Error: ${this.lastError}`,
      });
      return;
    }

    // Empty state
    if (this.results.length === 0) {
      const empty = container.createEl("div", { cls: "novyx-empty" });
      empty.createEl("p", { text: "No ghost connections found yet." });
      empty.createEl("p", {
        cls: "novyx-hint",
        text: "Try running \"Novyx: Remember current note\" on a few notes first, then reopen this one.",
      });
      return;
    }

    // Results list
    const list = container.createEl("div", { cls: "novyx-results" });
    for (const memory of this.results) {
      this.renderResultItem(list, memory);
    }
  }

  private renderResultItem(list: HTMLElement, memory: GhostMemory): void {
    const item = list.createEl("div", { cls: "novyx-result" });

    // Score badge
    const scorePct = Math.round(memory.score * 100);
    const scoreEl = item.createEl("div", {
      cls: "novyx-score",
      text: `${scorePct}%`,
    });
    if (scorePct >= 80) scoreEl.addClass("novyx-score-high");
    else if (scorePct >= 65) scoreEl.addClass("novyx-score-mid");

    // Body
    const body = item.createEl("div", { cls: "novyx-result-body" });

    // Resolve the note by path (stable) and use its current basename for display.
    // If the file has been deleted or renamed, the memory is orphaned and we
    // show a muted "note missing" row instead of a broken link.
    const pathTag = memory.tags.find((t) => t.startsWith("path:"));
    const notePath = pathTag ? pathTag.slice(5) : null;
    const file = notePath ? this.app.vault.getAbstractFileByPath(notePath) : null;
    const resolvedFile = file instanceof TFile ? file : null;

    if (resolvedFile) {
      const titleLink = body.createEl("a", {
        cls: "novyx-result-title",
        text: resolvedFile.basename,
      });
      titleLink.addEventListener("click", (e) => {
        e.preventDefault();
        void this.app.workspace.getLeaf().openFile(resolvedFile);
      });
    } else if (notePath) {
      // Orphaned memory — the source note was deleted or moved
      body.createEl("div", {
        cls: "novyx-result-title novyx-result-orphaned",
        text: `(source note missing: ${notePath.split("/").pop() ?? notePath})`,
      });
    }

    const preview = memory.observation.slice(0, 180);
    body.createEl("div", {
      cls: "novyx-result-preview",
      text: preview + (memory.observation.length > 180 ? "…" : ""),
    });

    // Insert-as-link button — only when we have a resolvable file
    if (resolvedFile) {
      const actionBar = body.createEl("div", { cls: "novyx-result-actions" });
      const linkBtn = actionBar.createEl("button", {
        cls: "novyx-action-btn",
        text: "Insert wiki-link",
      });
      linkBtn.addEventListener("click", () => this.insertWikiLink(resolvedFile));
    }
  }

  private insertWikiLink(file: TFile): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice("Novyx: Open a note to insert a wiki-link.");
      return;
    }
    // Use Obsidian's link generator so wiki-links respect vault settings
    // (short form vs. full path) and disambiguate duplicate basenames.
    const link = this.app.fileManager.generateMarkdownLink(file, view.file?.path ?? "");
    view.editor.replaceSelection(link);
    new Notice(`Novyx: Inserted link to ${file.basename}`);
  }
}
