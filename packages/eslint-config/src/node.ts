import type { Linter } from "eslint";

import { baseConfig } from "./base";

export const nodeConfig: Linter.Config[] = [
  ...baseConfig,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
    },
  },
];

export default nodeConfig;