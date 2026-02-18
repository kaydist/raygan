"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as babelParser from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import { v4 as uuid } from "uuid";

import { useASTStore, useProjectStore } from "@/stores";
import type { ASTNode, ASTStyle, ASTNodeType, ASTNodeMeta } from "@staq/shared";

const traverse =
  typeof _traverse === "function"
    ? _traverse
    : (_traverse as unknown as { default: typeof _traverse }).default;

type SyncSource = "code" | "ast" | "none";

interface UseASTSyncOptions {
  debounceMs?: number;
  enabled?: boolean;
}

interface UseASTSyncReturn {
  isSyncing: boolean;
  lastSyncSource: SyncSource;
  parseErrors: ParseError[];
  isReadOnly: boolean;
  forceSync: () => void;
}

interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

const SCREEN_FILES = ["App.tsx", "App.ts", "index.tsx", "index.ts"];
const DEBOUNCE_DEFAULT = 300;

export function useASTSync(options: UseASTSyncOptions = {}): UseASTSyncReturn {
  const { debounceMs = DEBOUNCE_DEFAULT, enabled = true } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const lastSyncSourceRef = useRef<SyncSource>("none");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const ast = useASTStore((s) => s.ast);
  const astVersion = useASTStore((s) => s.version);
  const setAST = useASTStore((s) => s.setAST);
  const files = useProjectStore((s) => s.files);
  const updateFile = useProjectStore((s) => s.updateFile);

  const isReadOnly = false;

  const parseCodeToAST = useCallback((code: string, fileName: string): ASTNode | null => {
    try {
      const babelAst = babelParser.parse(code, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      const styleMap = extractStyles(babelAst);
      const exportedComponents = findExportedComponents(babelAst);

      const screens: ASTNode[] = [];
      const components: ASTNode[] = [];

      for (const exported of exportedComponents) {
        const isScreen = detectIsScreen(exported.name, code, fileName);
        const nodeType: ASTNodeType = isScreen ? "screen" : "custom_component";

        const jsxRoot = findComponentJSXRoot(babelAst, exported.name);
        if (!jsxRoot) continue;

        const astNode = jsxToASTNode(jsxRoot, styleMap, nodeType, exported.name);
        if (astNode) {
          if (isScreen) {
            screens.push(astNode);
          } else {
            components.push(astNode);
          }
        }
      }

      if (screens.length === 0 && components.length === 0) {
        return null;
      }

      return createRootAST([...screens, ...components]);
    } catch (err) {
      const error = err as SyntaxError & { loc?: { line: number; column: number } };
      setParseErrors([
        {
          message: error.message,
          line: error.loc?.line,
          column: error.loc?.column,
        },
      ]);
      return null;
    }
  }, []);

  const serializeASTToCode = useCallback((astNode: ASTNode): string => {
    const imports = generateImports(astNode);
    const components = generateComponents(astNode);
    const styles = generateStyles(astNode);

    return [imports, "", components, "", styles].filter(Boolean).join("\n");
  }, []);

  const syncCodeToAST = useCallback(() => {
    if (!enabled || isProcessingRef.current || isReadOnly) return;

    isProcessingRef.current = true;
    setIsSyncing(true);
    setParseErrors([]);

    try {
      const mainFile = findMainFile(files);
      if (!mainFile) {
        isProcessingRef.current = false;
        setIsSyncing(false);
        return;
      }

      const content = files.get(mainFile)?.content;
      if (!content) {
        isProcessingRef.current = false;
        setIsSyncing(false);
        return;
      }

      const newAST = parseCodeToAST(content, mainFile);
      if (newAST && !areASTsEqual(newAST, ast)) {
        lastSyncSourceRef.current = "code";
        setAST(newAST);
      }
    } finally {
      isProcessingRef.current = false;
      setIsSyncing(false);
    }
  }, [enabled, files, ast, parseCodeToAST, setAST, isReadOnly]);

  const syncASTToCode = useCallback(() => {
    if (!enabled || isProcessingRef.current || !ast) return;

    isProcessingRef.current = true;
    setIsSyncing(true);

    try {
      const code = serializeASTToCode(ast);
      const mainFile = findMainFile(files) || "App.tsx";

      const currentContent = files.get(mainFile)?.content;
      if (code !== currentContent) {
        lastSyncSourceRef.current = "ast";
        updateFile(mainFile, code);
      }
    } finally {
      isProcessingRef.current = false;
      setIsSyncing(false);
    }
  }, [enabled, ast, files, serializeASTToCode, updateFile]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = useProjectStore.subscribe((state, prevState) => {
      if (state.files === prevState.files) return;
      if (lastSyncSourceRef.current === "ast") {
        lastSyncSourceRef.current = "none";
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        syncCodeToAST();
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, debounceMs, syncCodeToAST]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSyncSourceRef.current === "code") {
      lastSyncSourceRef.current = "none";
      return;
    }

    syncASTToCode();
  }, [enabled, astVersion, syncASTToCode]);

  const forceSync = useCallback(() => {
    lastSyncSourceRef.current = "none";
    syncCodeToAST();
  }, [syncCodeToAST]);

  return {
    isSyncing,
    lastSyncSource: lastSyncSourceRef.current,
    parseErrors,
    isReadOnly,
    forceSync,
  };
}

function findMainFile(files: Map<string, { content?: string }>): string | null {
  for (const screenFile of SCREEN_FILES) {
    if (files.has(screenFile)) return screenFile;
    if (files.has(`screens/${screenFile}`)) return `screens/${screenFile}`;
    if (files.has(`app/${screenFile}`)) return `app/${screenFile}`;
  }

  for (const [path] of files) {
    if (path.endsWith(".tsx") || path.endsWith(".ts")) {
      return path;
    }
  }

  return null;
}

function areASTsEqual(a: ASTNode | null, b: ASTNode | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return JSON.stringify(normalizeAST(a)) === JSON.stringify(normalizeAST(b));
}

interface NormalizedNode {
  type: ASTNode["type"];
  name: string;
  component_type?: ASTNode["component_type"];
  navigator_type?: ASTNode["navigator_type"];
  props: Record<string, unknown>;
  style: ASTStyle;
  children: NormalizedNode[];
}

function normalizeAST(node: ASTNode): NormalizedNode {
  return {
    type: node.type,
    name: node.name,
    component_type: node.component_type,
    navigator_type: node.navigator_type,
    props: node.props,
    style: node.style,
    children: node.children.map(normalizeAST),
  };
}

function extractStyles(ast: t.File): Map<string, ASTStyle> {
  const styleMap = new Map<string, ASTStyle>();

  traverse(ast, {
    CallExpression(path) {
      if (
        t.isMemberExpression(path.node.callee) &&
        t.isIdentifier(path.node.callee.object, { name: "StyleSheet" }) &&
        t.isIdentifier(path.node.callee.property, { name: "create" })
      ) {
        const arg = path.node.arguments[0];
        if (t.isObjectExpression(arg)) {
          for (const prop of arg.properties) {
            if (
              t.isObjectProperty(prop) &&
              t.isIdentifier(prop.key) &&
              t.isObjectExpression(prop.value)
            ) {
              const styleName = prop.key.name;
              const astStyle = objectExpressionToASTStyle(prop.value);
              styleMap.set(styleName, astStyle);
            }
          }
        }
      }
    },
  });

  return styleMap;
}

function objectExpressionToASTStyle(obj: t.ObjectExpression): ASTStyle {
  const flat: Record<string, unknown> = {};

  for (const prop of obj.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const key = prop.key.name;
      const value = extractLiteralValue(prop.value);
      if (value !== undefined) {
        flat[key] = value;
      }
    }
  }

  return {
    layout: extractLayoutProps(flat),
    spacing: extractSpacingProps(flat),
    sizing: extractSizingProps(flat),
    typography: extractTypographyProps(flat),
    colors: extractColorProps(flat),
    borders: extractBorderProps(flat),
    effects: extractEffectProps(flat),
  };
}

function extractLiteralValue(node: t.Node): unknown {
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isStringLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  if (t.isUnaryExpression(node) && node.operator === "-" && t.isNumericLiteral(node.argument)) {
    return -node.argument.value;
  }
  return undefined;
}

function extractLayoutProps(flat: Record<string, unknown>) {
  const props = ["flex", "flexDirection", "justifyContent", "alignItems", "alignSelf", "flexWrap", "position"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractSpacingProps(flat: Record<string, unknown>) {
  const props = ["margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractSizingProps(flat: Record<string, unknown>) {
  const props = ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractTypographyProps(flat: Record<string, unknown>) {
  const props = ["fontSize", "fontWeight", "fontFamily", "lineHeight", "textAlign"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractColorProps(flat: Record<string, unknown>) {
  const props = ["color", "backgroundColor", "borderColor"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractBorderProps(flat: Record<string, unknown>) {
  const props = ["borderWidth", "borderRadius", "borderStyle"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractEffectProps(flat: Record<string, unknown>) {
  const props = ["opacity", "shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "elevation"];
  const result: Record<string, unknown> = {};
  for (const p of props) if (p in flat) result[p] = flat[p];
  return Object.keys(result).length > 0 ? result : undefined;
}

interface ExportedComponent {
  name: string;
  isDefault: boolean;
}

function findExportedComponents(ast: t.File): ExportedComponent[] {
  const components: ExportedComponent[] = [];

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      if (t.isFunctionDeclaration(decl) && decl.id) {
        components.push({ name: decl.id.name, isDefault: true });
      } else if (t.isIdentifier(decl)) {
        components.push({ name: decl.name, isDefault: true });
      }
    },
    ExportNamedDeclaration(path) {
      const decl = path.node.declaration;
      if (t.isFunctionDeclaration(decl) && decl.id) {
        components.push({ name: decl.id.name, isDefault: false });
      }
    },
  });

  return components;
}

function detectIsScreen(name: string, source: string, fileName: string): boolean {
  if (name.endsWith("Screen") || name.endsWith("Page")) return true;
  if (fileName.includes("screen") || fileName.includes("Screen")) return true;
  if (/from\s+['"]expo-router['"]/.test(source)) return true;
  return false;
}

function findComponentJSXRoot(ast: t.File, componentName: string): t.JSXElement | null {
  let jsxRoot: t.JSXElement | null = null;

  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id?.name === componentName) {
        jsxRoot = findReturnedJSX(path);
        path.stop();
      }
    },
    VariableDeclarator(path) {
      if (t.isIdentifier(path.node.id, { name: componentName })) {
        if (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init)) {
          jsxRoot = findReturnedJSXFromExpr(path.node.init);
          path.stop();
        }
      }
    },
  });

  return jsxRoot;
}

function findReturnedJSX(path: { traverse: Function }): t.JSXElement | null {
  let jsx: t.JSXElement | null = null;

  path.traverse({
    ReturnStatement(returnPath: { node: t.ReturnStatement; stop: () => void }) {
      const arg = returnPath.node.argument;
      if (t.isJSXElement(arg)) {
        jsx = arg;
        returnPath.stop();
      } else if (t.isParenthesizedExpression(arg) && t.isJSXElement(arg.expression)) {
        jsx = arg.expression;
        returnPath.stop();
      }
    },
  });

  return jsx;
}

function findReturnedJSXFromExpr(func: t.ArrowFunctionExpression | t.FunctionExpression): t.JSXElement | null {
  if (t.isJSXElement(func.body)) {
    return func.body;
  }
  return null;
}

function jsxToASTNode(
  jsx: t.JSXElement,
  styleMap: Map<string, ASTStyle>,
  nodeType: ASTNodeType,
  nodeName: string
): ASTNode {
  const componentType = getJSXComponentType(jsx);
  const props = extractJSXProps(jsx);
  const style = extractStyleFromProps(props, styleMap);

  const jsxChildren = jsx.children
    .filter((child): child is t.JSXElement => t.isJSXElement(child))
    .map((child) => jsxToASTNode(child, styleMap, "component", getJSXNodeName(child)));

  const meta: ASTNodeMeta = {
    source: "code",
    created_at: new Date().toISOString(),
    version: 1,
  };

  if (nodeType === "screen" || nodeType === "custom_component") {
    const rootComponent: ASTNode = {
      id: uuid(),
      type: "component",
      component_type: componentType as ASTNode["component_type"],
      name: getJSXNodeName(jsx),
      props: sanitizeProps(props),
      style,
      children: jsxChildren,
      meta,
    };

    return {
      id: uuid(),
      type: nodeType,
      name: nodeName,
      props: {},
      style: {},
      children: [rootComponent],
      meta,
    };
  }

  return {
    id: uuid(),
    type: nodeType,
    component_type: componentType as ASTNode["component_type"],
    name: nodeName,
    props: sanitizeProps(props),
    style,
    children: jsxChildren,
    meta,
  };
}

function getJSXComponentType(jsx: t.JSXElement): string {
  const opening = jsx.openingElement;
  if (t.isJSXIdentifier(opening.name)) {
    return opening.name.name;
  }
  return "View";
}

function getJSXNodeName(jsx: t.JSXElement): string {
  return getJSXComponentType(jsx);
}

function extractJSXProps(jsx: t.JSXElement): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const attr of jsx.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const name = attr.name.name;
      const value = attr.value;

      if (value === null) {
        props[name] = true;
      } else if (t.isStringLiteral(value)) {
        props[name] = value.value;
      } else if (t.isJSXExpressionContainer(value) && !t.isJSXEmptyExpression(value.expression)) {
        props[name] = extractLiteralValue(value.expression);
      }
    }
  }

  const textContent = extractTextContent(jsx);
  if (textContent) {
    props.children = textContent;
  }

  return props;
}

function extractTextContent(jsx: t.JSXElement): string | undefined {
  const texts: string[] = [];

  for (const child of jsx.children) {
    if (t.isJSXText(child)) {
      const trimmed = child.value.trim();
      if (trimmed) texts.push(trimmed);
    }
  }

  return texts.length > 0 ? texts.join(" ") : undefined;
}

function extractStyleFromProps(props: Record<string, unknown>, styleMap: Map<string, ASTStyle>): ASTStyle {
  const styleValue = props.style;

  if (typeof styleValue === "string" && styleValue.startsWith("{styles.")) {
    const styleName = styleValue.slice(8, -1);
    return styleMap.get(styleName) || {};
  }

  return {};
}

function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key !== "style" && value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function createRootAST(children: ASTNode[]): ASTNode {
  return {
    id: uuid(),
    type: "root",
    name: "root",
    props: {},
    style: {},
    children,
    meta: {
      source: "code",
      created_at: new Date().toISOString(),
      version: 1,
    },
  };
}

function generateImports(ast: ASTNode): string {
  const components = new Set<string>();
  collectComponents(ast, components);

  const rnComponents = ["View", "Text", "TouchableOpacity", "ScrollView", "TextInput", "Image", "FlatList", "Pressable"];
  const usedRN = [...components].filter((c) => rnComponents.includes(c));

  const lines: string[] = [];
  lines.push('import React from "react";');
  if (usedRN.length > 0) {
    lines.push(`import { ${usedRN.join(", ")}, StyleSheet } from "react-native";`);
  } else {
    lines.push('import { View, StyleSheet } from "react-native";');
  }

  return lines.join("\n");
}

function collectComponents(node: ASTNode, components: Set<string>) {
  if (node.component_type) {
    components.add(node.component_type);
  }
  for (const child of node.children) {
    collectComponents(child, components);
  }
}

function generateComponents(ast: ASTNode): string {
  const lines: string[] = [];

  for (const child of ast.children) {
    if (child.type === "screen" || child.type === "custom_component") {
      lines.push(generateComponent(child));
    }
  }

  return lines.join("\n\n");
}

function generateComponent(node: ASTNode): string {
  const name = node.name || "Component";
  const isDefault = node.type === "screen";
  const jsxContent = node.children.length > 0 ? generateJSX(node.children[0]!, 2) : "    <View />";

  const exportKeyword = isDefault ? "export default" : "export";

  return `${exportKeyword} function ${name}() {
  return (
${jsxContent}
  );
}`;
}

function generateJSX(node: ASTNode, indent: number): string {
  const spaces = " ".repeat(indent);
  const componentType = node.component_type || "View";
  const propsStr = generatePropsString(node.props, node.style, node.name);

  if (node.children.length === 0) {
    const textContent = node.props.children;
    if (typeof textContent === "string") {
      return `${spaces}<${componentType}${propsStr}>${textContent}</${componentType}>`;
    }
    return `${spaces}<${componentType}${propsStr} />`;
  }

  const childrenJSX = node.children.map((child) => generateJSX(child, indent + 2)).join("\n");

  return `${spaces}<${componentType}${propsStr}>
${childrenJSX}
${spaces}</${componentType}>`;
}

function generatePropsString(props: Record<string, unknown>, style: ASTStyle, name: string): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;
    if (typeof value === "string") {
      parts.push(`${key}="${value}"`);
    } else if (typeof value === "boolean" && value) {
      parts.push(key);
    } else if (typeof value === "number") {
      parts.push(`${key}={${value}}`);
    }
  }

  if (Object.keys(style).length > 0) {
    const styleName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    parts.push(`style={styles.${styleName}}`);
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

function generateStyles(ast: ASTNode): string {
  const styleEntries: string[] = [];
  collectStyleEntries(ast, styleEntries);

  if (styleEntries.length === 0) {
    return `const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});`;
  }

  return `const styles = StyleSheet.create({
${styleEntries.join(",\n")}
});`;
}

function collectStyleEntries(node: ASTNode, entries: string[]) {
  if (Object.keys(node.style).length > 0) {
    const styleName = node.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const styleObj = flattenStyle(node.style);
    const styleStr = Object.entries(styleObj)
      .map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`)
      .join(",\n");
    entries.push(`  ${styleName}: {\n${styleStr}\n  }`);
  }

  for (const child of node.children) {
    collectStyleEntries(child, entries);
  }
}

function flattenStyle(style: ASTStyle): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (style.layout) Object.assign(flat, style.layout);
  if (style.spacing) Object.assign(flat, style.spacing);
  if (style.sizing) Object.assign(flat, style.sizing);
  if (style.typography) Object.assign(flat, style.typography);
  if (style.colors) Object.assign(flat, style.colors);
  if (style.borders) Object.assign(flat, style.borders);
  if (style.effects) Object.assign(flat, style.effects);
  return flat;
}
