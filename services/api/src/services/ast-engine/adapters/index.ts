import type { Framework, FrameworkAdapter } from "../types";
import { ExpoAdapter } from "./expo.adapter";

export { BaseFrameworkAdapter } from "./base-adapter";
export { ExpoAdapter } from "./expo.adapter";

export function createAdapter(framework: Framework): FrameworkAdapter {
  switch (framework) {
    case "expo":
      return new ExpoAdapter();
    case "bare-rn":
      throw new Error("Bare React Native adapter not yet implemented");
    case "flutter":
      throw new Error("Flutter adapter not yet implemented");
    default: {
      const _exhaustive: never = framework;
      throw new Error(`Unknown framework: ${_exhaustive}`);
    }
  }
}
