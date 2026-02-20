import * as babelParser from "@babel/parser";
import _traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

const traverse = typeof _traverse === "function"
  ? _traverse
  : (_traverse as unknown as { default: typeof _traverse }).default;
import type {
  ASTNode,
  ASTNodeType,
  ASTStyle,
  ComponentType,
  ASTNodeMeta,
} from "@staq/shared";
import { v4 as uuid } from "uuid";

export interface ParseResult {
  ast: ASTNode | null;
  screens: ASTNode[];
  components: ASTNode[];
  errors: ParseError[];
  warnings: string[];
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  code: string;
}

export interface ParserConfig {
  sourceType?: "screen" | "component" | "auto";
  screenName?: string;
  componentName?: string;
}

export function parseSourceCode(
  source: string,
  _config: Partial<ParserConfig> = {}
): ParseResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const screens: ASTNode[] = [];
  const components: ASTNode[] = [];

  if (!source || source.trim().length === 0) {
    errors.push({
      message: "Empty source code",
      code: "EMPTY_SOURCE",
    });
    return { ast: null, screens, components, errors, warnings };
  }

  let babelAst: t.File;
  try {
    babelAst = babelParser.parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (err) {
    const error = err as SyntaxError & { loc?: { line: number; column: number } };
    errors.push({
      message: error.message,
      line: error.loc?.line,
      column: error.loc?.column,
      code: "PARSE_ERROR",
    });
    return { ast: null, screens, components, errors, warnings };
  }

  const styleMap = extractStyles(babelAst);
  const exportedComponents = findExportedComponents(babelAst);

  for (const exported of exportedComponents) {
    const isScreen = detectIsScreen(exported.name, source);
    const nodeType: ASTNodeType = isScreen ? "screen" : "custom_component";

    const jsxRoot = findComponentJSXRoot(babelAst, exported.name);
    if (!jsxRoot) {
      warnings.push(`No JSX found in component: ${exported.name}`);
      continue;
    }

    const astNode = jsxToASTNode(jsxRoot, styleMap, nodeType, exported.name);
    if (astNode) {
      if (isScreen) {
        screens.push(astNode);
      } else {
        components.push(astNode);
      }
    }
  }

  let ast: ASTNode | null = null;
  if (screens.length > 0 || components.length > 0) {
    ast = createRootAST([...screens, ...components]);
  }

  return { ast, screens, components, errors, warnings };
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
  const style: ASTStyle = {};
  const flatStyle: Record<string, unknown> = {};

  for (const prop of obj.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const key = prop.key.name;
      const value = extractLiteralValue(prop.value);
      if (value !== undefined) {
        flatStyle[key] = value;
      }
    }
  }

  style.layout = extractLayoutProps(flatStyle);
  style.spacing = extractSpacingProps(flatStyle);
  style.sizing = extractSizingProps(flatStyle);
  style.typography = extractTypographyProps(flatStyle);
  style.colors = extractColorProps(flatStyle);
  style.borders = extractBorderProps(flatStyle);
  style.effects = extractEffectProps(flatStyle);

  return style;
}

function extractLiteralValue(node: t.Node): unknown {
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isStringLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  if (t.isObjectExpression(node)) {
    const obj: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        obj[prop.key.name] = extractLiteralValue(prop.value);
      }
    }
    return obj;
  }
  if (t.isArrayExpression(node)) {
    return node.elements.map((el) => (el ? extractLiteralValue(el) : null));
  }
  if (t.isUnaryExpression(node) && node.operator === "-" && t.isNumericLiteral(node.argument)) {
    return -node.argument.value;
  }
  return undefined;
}

function extractLayoutProps(flat: Record<string, unknown>): ASTStyle["layout"] | undefined {
  const props = [
    "flex", "flexDirection", "justifyContent", "alignItems", "alignSelf",
    "flexWrap", "flexGrow", "flexShrink", "flexBasis", "position",
    "top", "right", "bottom", "left", "zIndex",
  ];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["layout"] : undefined;
}

function extractSpacingProps(flat: Record<string, unknown>): ASTStyle["spacing"] | undefined {
  const props = [
    "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
    "marginHorizontal", "marginVertical",
    "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "paddingHorizontal", "paddingVertical", "gap", "rowGap", "columnGap",
  ];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["spacing"] : undefined;
}

function extractSizingProps(flat: Record<string, unknown>): ASTStyle["sizing"] | undefined {
  const props = [
    "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio",
  ];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["sizing"] : undefined;
}

function extractTypographyProps(flat: Record<string, unknown>): ASTStyle["typography"] | undefined {
  const props = [
    "fontSize", "fontWeight", "fontStyle", "fontFamily", "lineHeight",
    "letterSpacing", "textAlign", "textDecorationLine", "textTransform",
  ];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["typography"] : undefined;
}

function extractColorProps(flat: Record<string, unknown>): ASTStyle["colors"] | undefined {
  const props = ["color", "backgroundColor", "borderColor", "tintColor"];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["colors"] : undefined;
}

function extractBorderProps(flat: Record<string, unknown>): ASTStyle["borders"] | undefined {
  const props = [
    "borderWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
    "borderLeftWidth", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius",
    "borderBottomLeftRadius", "borderBottomRightRadius", "borderStyle",
  ];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["borders"] : undefined;
}

function extractEffectProps(flat: Record<string, unknown>): ASTStyle["effects"] | undefined {
  const props = [
    "opacity", "overflow", "shadowColor", "shadowOffset",
    "shadowOpacity", "shadowRadius", "elevation",
  ];
  const result: Record<string, unknown> = {};
  for (const p of props) {
    if (p in flat) result[p] = flat[p];
  }
  return Object.keys(result).length > 0 ? result as ASTStyle["effects"] : undefined;
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
      } else if (t.isVariableDeclaration(decl)) {
        for (const d of decl.declarations) {
          if (t.isIdentifier(d.id)) {
            components.push({ name: d.id.name, isDefault: false });
          }
        }
      }
    },
  });

  return components;
}

function detectIsScreen(name: string, source: string): boolean {
  if (name.endsWith("Screen")) return true;
  if (name.endsWith("Page")) return true;

  const hasExpoRouterImport = /from\s+['"]expo-router['"]/.test(source);
  if (hasExpoRouterImport) return true;

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
          const funcPath = path.get("init") as NodePath<t.ArrowFunctionExpression | t.FunctionExpression>;
          jsxRoot = findReturnedJSXFromFunc(funcPath);
          path.stop();
        }
      }
    },
  });

  return jsxRoot;
}

function findReturnedJSX(path: NodePath<t.FunctionDeclaration>): t.JSXElement | null {
  let jsx: t.JSXElement | null = null;

  path.traverse({
    ReturnStatement(returnPath) {
      const arg = returnPath.node.argument;
      if (t.isJSXElement(arg)) {
        jsx = arg;
        returnPath.stop();
      } else if (t.isJSXFragment(arg) && arg.children.length > 0) {
        const firstJSX = arg.children.find((c) => t.isJSXElement(c));
        if (firstJSX && t.isJSXElement(firstJSX)) {
          jsx = firstJSX;
          returnPath.stop();
        }
      } else if (t.isParenthesizedExpression(arg) && t.isJSXElement(arg.expression)) {
        jsx = arg.expression;
        returnPath.stop();
      }
    },
  });

  return jsx;
}

function findReturnedJSXFromFunc(
  path: NodePath<t.ArrowFunctionExpression | t.FunctionExpression>
): t.JSXElement | null {
  const body = path.node.body;

  if (t.isJSXElement(body)) {
    return body;
  }

  if (t.isBlockStatement(body)) {
    let jsx: t.JSXElement | null = null;
    path.traverse({
      ReturnStatement(returnPath) {
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
      component_type: componentType as ComponentType,
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
    component_type: componentType as ComponentType,
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
  if (t.isJSXMemberExpression(opening.name)) {
    const parts: string[] = [];
    let current: t.JSXMemberExpression | t.JSXIdentifier = opening.name;
    while (t.isJSXMemberExpression(current)) {
      parts.unshift(current.property.name);
      current = current.object as t.JSXMemberExpression | t.JSXIdentifier;
    }
    if (t.isJSXIdentifier(current)) {
      parts.unshift(current.name);
    }
    return parts.join(".");
  }
  return "View";
}

function getJSXNodeName(jsx: t.JSXElement): string {
  const componentType = getJSXComponentType(jsx);
  return componentType.replace(/\./g, "_");
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
      } else if (t.isJSXExpressionContainer(value)) {
        props[name] = extractExpressionValue(value.expression);
      }
    }
  }

  const textContent = extractTextContent(jsx);
  if (textContent) {
    props.children = textContent;
  }

  return props;
}

function extractExpressionValue(expr: t.Expression | t.JSXEmptyExpression): unknown {
  if (t.isJSXEmptyExpression(expr)) return undefined;
  if (t.isNumericLiteral(expr)) return expr.value;
  if (t.isStringLiteral(expr)) return expr.value;
  if (t.isBooleanLiteral(expr)) return expr.value;
  if (t.isNullLiteral(expr)) return null;
  if (t.isObjectExpression(expr)) {
    const obj: Record<string, unknown> = {};
    for (const prop of expr.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        obj[prop.key.name] = extractLiteralValue(prop.value);
      }
    }
    return obj;
  }
  if (t.isArrayExpression(expr)) {
    return expr.elements.map((el) => (el ? extractLiteralValue(el) : null));
  }
  if (t.isMemberExpression(expr)) {
    if (
      t.isIdentifier(expr.object, { name: "styles" }) &&
      t.isIdentifier(expr.property)
    ) {
      return `{styles.${expr.property.name}}`;
    }
  }
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
    return "{function}";
  }
  return undefined;
}

function extractTextContent(jsx: t.JSXElement): string | undefined {
  const texts: string[] = [];

  for (const child of jsx.children) {
    if (t.isJSXText(child)) {
      const trimmed = child.value.trim();
      if (trimmed) texts.push(trimmed);
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isStringLiteral(child.expression)) {
        texts.push(child.expression.value);
      }
    }
  }

  return texts.length > 0 ? texts.join(" ") : undefined;
}

function extractStyleFromProps(
  props: Record<string, unknown>,
  styleMap: Map<string, ASTStyle>
): ASTStyle {
  const styleValue = props.style;

  if (typeof styleValue === "string" && styleValue.startsWith("{styles.")) {
    const styleName = styleValue.slice(8, -1);
    return styleMap.get(styleName) || {};
  }

  if (typeof styleValue === "object" && styleValue !== null) {
    return objectToASTStyle(styleValue as Record<string, unknown>);
  }

  return {};
}

function objectToASTStyle(obj: Record<string, unknown>): ASTStyle {
  const style: ASTStyle = {};

  style.layout = extractLayoutProps(obj);
  style.spacing = extractSpacingProps(obj);
  style.sizing = extractSizingProps(obj);
  style.typography = extractTypographyProps(obj);
  style.colors = extractColorProps(obj);
  style.borders = extractBorderProps(obj);
  style.effects = extractEffectProps(obj);

  return style;
}

function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key === "style") continue;
    if (value !== undefined) {
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

export function parseMultipleFiles(
  files: Map<string, string>
): ParseResult {
  const allScreens: ASTNode[] = [];
  const allComponents: ASTNode[] = [];
  const allErrors: ParseError[] = [];
  const allWarnings: string[] = [];

  for (const [filename, source] of files) {
    const isScreen = filename.includes("screen") || filename.includes("Screen") || filename.startsWith("app/");
    const result = parseSourceCode(source, {
      sourceType: isScreen ? "screen" : "auto",
    });

    allScreens.push(...result.screens);
    allComponents.push(...result.components);
    allErrors.push(...result.errors.map((e) => ({ ...e, message: `[${filename}] ${e.message}` })));
    allWarnings.push(...result.warnings.map((w) => `[${filename}] ${w}`));
  }

  const ast = allScreens.length > 0 || allComponents.length > 0
    ? createRootAST([...allScreens, ...allComponents])
    : null;

  return {
    ast,
    screens: allScreens,
    components: allComponents,
    errors: allErrors,
    warnings: allWarnings,
  };
}
