import type { Linter } from "eslint";

import { baseConfig } from "./base";

export const nextConfig: Linter.Config[] = [
  ...baseConfig,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];

export default nextConfig;
