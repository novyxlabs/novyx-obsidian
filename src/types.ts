export interface NovyxSettings {
  apiKey: string;
  apiUrl: string;
  vaultTag: string;
  ghostMinScore: number;
  ghostLimit: number;
}

export const DEFAULT_SETTINGS: NovyxSettings = {
  apiKey: "",
  apiUrl: "https://novyx-ram-api.fly.dev",
  vaultTag: "",
  ghostMinScore: 0.6,
  ghostLimit: 10,
};

export interface GhostMemory {
  id: string;
  observation: string;
  score: number;
  tags: string[];
  created_at?: string;
}

export const VIEW_TYPE_GHOST = "novyx-ghost-connections";
