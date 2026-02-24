import type { ASTNode, ComponentType } from "@raygan/shared";
import type {
  Framework,
  FrameworkAdapter,
  SerializerConfig,
  SerializerOutput,
  SerializerContext,
  ComponentImport,
  DependencyTracker,
} from "../types";

export abstract class BaseFrameworkAdapter implements FrameworkAdapter {
  abstract readonly framework: Framework;

  abstract isBuiltInComponent(componentType: ComponentType): boolean;
  abstract getComponentImport(componentType: ComponentType): ComponentImport | null;
  abstract getScreenPath(name: string, config: SerializerConfig): string;
  abstract getComponentPath(name: string, config: SerializerConfig): string;

  abstract serializeScreen(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void;

  abstract serializeNavigator(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void;

  abstract serializeCustomComponent(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void;

  abstract generateScaffolding(
    output: SerializerOutput,
    config: SerializerConfig,
    dependencies: DependencyTracker
  ): void;

  protected generateJsxElement(
    tagName: string,
    props: Record<string, unknown>,
    children: string[],
    indent: string,
    depth: number
  ): string {
    const indentation = indent.repeat(depth);
    const propsString = this.generatePropsString(props);
    const hasChildren = children.length > 0 && children.some((c) => c.trim());

    if (!hasChildren) {
      return `${indentation}<${tagName}${propsString} />`;
    }

    const childrenString = children.join("\n");
    return `${indentation}<${tagName}${propsString}>\n${childrenString}\n${indentation}</${tagName}>`;
  }

  protected generatePropsString(props: Record<string, unknown>): string {
    const entries = Object.entries(props).filter(([key]) => key !== "children");

    if (entries.length === 0) return "";

    const propsArray = entries.map(([key, value]) => {
      if (typeof value === "string") {
        if (value.startsWith("{") && value.endsWith("}")) {
          return `${key}=${value}`;
        }
        return `${key}="${value}"`;
      }
      if (typeof value === "boolean") {
        return value ? key : `${key}={false}`;
      }
      if (typeof value === "number") {
        return `${key}={${value}}`;
      }
      if (typeof value === "object" && value !== null) {
        return `${key}={${JSON.stringify(value)}}`;
      }
      return `${key}={${String(value)}}`;
    });

    return propsArray.length > 0 ? " " + propsArray.join(" ") : "";
  }

  protected generateScreenFile(
    name: string,
    jsx: string,
    importsCode: string,
    stylesCode: string,
    config: SerializerConfig
  ): string {
    const componentBody = jsx || `${config.indent}<View style={styles.container} />`;

    return `${importsCode}

export default function ${name}() {
  return (
${componentBody}
  );
}

${stylesCode}
`;
  }

  protected generateComponentFile(
    name: string,
    jsx: string,
    importsCode: string,
    stylesCode: string,
    config: SerializerConfig
  ): string {
    const componentBody = jsx || `${config.indent}<View style={styles.container} />`;

    return `${importsCode}

export function ${name}() {
  return (
${componentBody}
  );
}

${stylesCode}
`;
  }
}
