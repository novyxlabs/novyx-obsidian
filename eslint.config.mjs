import tsparser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";

const recommendedRules = obsidianmd.default
  ? obsidianmd.default.configs.recommended
  : obsidianmd.configs.recommended;

const obsidianPlugin = obsidianmd.default || obsidianmd;

export default [
  {
    ignores: ["main.js", "node_modules/**", "esbuild.config.mjs"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      obsidianmd: obsidianPlugin,
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...recommendedRules,
      "@typescript-eslint/no-floating-promises": "error",
      // No brand override — local config must match the marketplace bot's
      // default config exactly so a clean local run = a clean bot run.
      // "Novyx" is not in the bot's default brand list, so we have to make
      // sure Novyx appears either as the first word of a string (where any
      // first-word capitalization is fine) or not at all in mid-string UI text.
    },
  },
];
