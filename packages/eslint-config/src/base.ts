import type { Linter } from "eslint";

export const baseConfig: Linter.Config[] = [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default baseConfig;