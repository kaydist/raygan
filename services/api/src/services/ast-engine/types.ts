import type { ASTNode, ASTStyle, ComponentType } from "@raygan/shared";

export type Framework = "expo" | "bare-rn" | "flutter";

export interface SerializerConfig {
  indent: string;
  useTypeScript: boolean;
  expoRouter: boolean;
  includeScaffolding: boolean;
  projectName: string;
  projectSlug: string;
  projectVersion: string;
  framework: Framework;
}

export interface SerializedFile {
  path: string;
  content: string;
}

export type SerializerOutput = Map<string, string>;

export interface ComponentImport {
  source: string;
  named: boolean;
  alias?: string;
}

export interface SerializerContext {
  config: SerializerConfig;
  imports: ImportManager;
  styles: StyleManager;
  dependencies: DependencyTracker;
}

export interface FrameworkAdapter {
  readonly framework: Framework;

  isBuiltInComponent(componentType: ComponentType): boolean;
  getComponentImport(componentType: ComponentType): ComponentImport | null;

  serializeScreen(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void;

  serializeNavigator(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void;

  serializeCustomComponent(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void;

  generateScaffolding(
    output: SerializerOutput,
    config: SerializerConfig,
    dependencies: DependencyTracker
  ): void;

  getScreenPath(name: string, config: SerializerConfig): string;
  getComponentPath(name: string, config: SerializerConfig): string;
}

export class DependencyTracker {
  private packages: Set<string> = new Set();
  private expoRouterUsed = false;
  private reactNavigationPackages: Set<string> = new Set();

  addPackage(packageName: string): void {
    if (!packageName.startsWith("../") && !packageName.startsWith("./")) {
      this.packages.add(packageName);
    }
  }

  useExpoRouter(): void {
    this.expoRouterUsed = true;
  }

  addReactNavigationPackage(packageName: string): void {
    this.reactNavigationPackages.add(packageName);
  }

  getPackages(): Set<string> {
    return this.packages;
  }

  isExpoRouterUsed(): boolean {
    return this.expoRouterUsed;
  }

  getReactNavigationPackages(): Set<string> {
    return this.reactNavigationPackages;
  }
}

export class ImportManager {
  private imports: Map<string, Set<string>> = new Map();
  private defaultImports: Map<string, string> = new Map();
  private hasReact = false;
  private dependencies: DependencyTracker;

  constructor(dependencies?: DependencyTracker) {
    this.dependencies = dependencies ?? new DependencyTracker();
  }

  addReact(): void {
    this.hasReact = true;
  }

  add(source: string, names: string[]): void {
    if (!this.imports.has(source)) {
      this.imports.set(source, new Set());
    }
    const set = this.imports.get(source)!;
    for (const name of names) {
      set.add(name);
    }
    this.dependencies.addPackage(source);
  }

  addDefault(source: string, name: string): void {
    this.defaultImports.set(source, name);
    this.dependencies.addPackage(source);
  }

  addReactNative(component: string): void {
    this.add("react-native", [component]);
  }

  addCustomComponent(name: string): void {
    this.addDefault(`../components/${name}`, name);
  }

  generate(): string {
    const lines: string[] = [];

    if (this.hasReact) {
      lines.push('import React from "react";');
    }

    for (const [source, names] of this.imports) {
      const sortedNames = Array.from(names).sort();
      lines.push(`import { ${sortedNames.join(", ")} } from "${source}";`);
    }

    for (const [source, name] of this.defaultImports) {
      lines.push(`import ${name} from "${source}";`);
    }

    return lines.join("\n");
  }
}

export class StyleManager {
  private styles: Map<string, Record<string, unknown>> = new Map();
  private counter = 0;

  addStyle(baseName: string, style: ASTStyle): string | null {
    const flatStyle = flattenStyle(style);
    if (Object.keys(flatStyle).length === 0) return null;

    const styleName = this.generateStyleName(baseName);
    this.styles.set(styleName, flatStyle);
    return styleName;
  }

  private generateStyleName(baseName: string): string {
    const sanitized = baseName
      .replace(/[^a-zA-Z0-9]/g, "")
      .replace(/^([A-Z])/, (match) => match.toLowerCase());

    if (this.styles.has(sanitized)) {
      this.counter++;
      return `${sanitized}${this.counter}`;
    }

    return sanitized;
  }

  generate(indent: string): string {
    if (this.styles.size === 0) {
      return `const styles = StyleSheet.create({
${indent}container: {
${indent}${indent}flex: 1,
${indent}},
});`;
    }

    const styleEntries = Array.from(this.styles.entries())
      .map(([name, style]) => {
        const styleProps = Object.entries(style)
          .map(([key, value]) => {
            const formattedValue = typeof value === "string" ? `"${value}"` : JSON.stringify(value);
            return `${indent}${indent}${key}: ${formattedValue},`;
          })
          .join("\n");
        return `${indent}${name}: {\n${styleProps}\n${indent}},`;
      })
      .join("\n");

    return `const styles = StyleSheet.create({\n${styleEntries}\n});`;
  }
}

export function flattenStyle(style: ASTStyle): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (style.layout) {
    Object.assign(result, style.layout);
  }
  if (style.spacing) {
    Object.assign(result, style.spacing);
  }
  if (style.sizing) {
    Object.assign(result, style.sizing);
  }
  if (style.typography) {
    Object.assign(result, style.typography);
  }
  if (style.colors) {
    Object.assign(result, style.colors);
  }
  if (style.borders) {
    Object.assign(result, style.borders);
  }
  if (style.effects) {
    Object.assign(result, style.effects);
  }

  return result;
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
