import { Novyx } from "novyx";
import type { GhostMemory } from "./types";

/**
 * Thin wrapper around the Novyx SDK.
 *
 * Keeps the plugin decoupled from direct SDK calls so we can:
 * - Swap implementations if the SDK shape changes
 * - Centralize error handling and defaults
 * - Mock in tests
 */
export class NovyxClient {
  private client: Novyx;

  constructor(apiKey: string, apiUrl: string) {
    this.client = new Novyx({
      apiKey,
      apiUrl,
      timeout: 10000,
    });
  }

  /**
   * Store a note in persistent memory.
   * Tags are used to scope ghost-connection queries to this vault.
   */
  async remember(observation: string, tags: string[]): Promise<void> {
    await this.client.remember(observation, {
      tags,
      importance: 6,
    });
  }

  /**
   * Find semantically similar memories — the primitive behind "Ghost Connections".
   *
   * We call recall() with min_score >= 0.6 to surface only meaningful matches,
   * and filter by the current vault's tag so cross-vault noise doesn't bleed in.
   */
  async ghostConnections(
    query: string,
    opts: { limit: number; minScore: number; vaultTag: string }
  ): Promise<GhostMemory[]> {
    const result = await this.client.recall(query, {
      limit: opts.limit,
      min_score: opts.minScore,
      tags: [opts.vaultTag],
    });

    const memories = (result as unknown as { memories?: unknown[] })?.memories ?? [];
    return memories
      .map((m): GhostMemory | null => {
        const mem = m as Record<string, unknown>;
        if (typeof mem.observation !== "string") return null;
        return {
          id: String(mem.id ?? mem.uuid ?? ""),
          observation: mem.observation,
          score: typeof mem.score === "number" ? mem.score : 0,
          tags: Array.isArray(mem.tags) ? (mem.tags as string[]) : [],
          created_at: typeof mem.created_at === "string" ? mem.created_at : undefined,
        };
      })
      .filter((m): m is GhostMemory => m !== null);
  }
}
