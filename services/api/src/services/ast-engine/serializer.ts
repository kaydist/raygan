import type { ASTNode } from "@staq/shared";
import { createAdapter } from "./adapters";
import {
  DependencyTracker,
  ImportManager,
  StyleManager,
  type SerializerConfig,
  type SerializerOutput,
  type SerializerContext,
} from "./types";

export type { SerializerConfig, SerializerOutput, Framework } from "./types";
export { DependencyTracker, ImportManager, StyleManager } from "./types";

const DEFAULT_CONFIG: SerializerConfig = {
  indent: "  ",
  useTypeScript: true,
  expoRouter: true,
  includeScaffolding: true,
  projectName: "MyApp",
  projectSlug: "my-app",
  projectVersion: "1.0.0",
  framework: "expo",
};

export function serialize(
  ast: ASTNode,
  config: Partial<SerializerConfig> = {}
): SerializerOutput {
  const fullConfig: SerializerConfig = { ...DEFAULT_CONFIG, ...config };
  const output: SerializerOutput = new Map();
  const dependencies = new DependencyTracker();
  const adapter = createAdapter(fullConfig.framework);

  if (ast.type !== "root") {
    throw new Error("AST root node must have type 'root'");
  }

  for (const child of ast.children) {
    const imports = new ImportManager(dependencies);
    const styles = new StyleManager();
    const context: SerializerContext = {
      config: fullConfig,
      imports,
      styles,
      dependencies,
    };

    serializeNode(child, output, context, adapter);
  }

  if (fullConfig.includeScaffolding) {
    adapter.generateScaffolding(output, fullConfig, dependencies);
  }

  return output;
}

function serializeNode(
  node: ASTNode,
  output: SerializerOutput,
  context: SerializerContext,
  adapter: ReturnType<typeof createAdapter>
): void {
  const imports = new ImportManager(context.dependencies);
  const styles = new StyleManager();
  const nodeContext: SerializerContext = {
    ...context,
    imports,
    styles,
  };

  switch (node.type) {
    case "screen":
      adapter.serializeScreen(node, output, nodeContext);
      break;
    case "navigator":
      adapter.serializeNavigator(node, output, nodeContext);
      break;
    case "custom_component":
      adapter.serializeCustomComponent(node, output, nodeContext);
      break;
    default:
      break;
  }
}
