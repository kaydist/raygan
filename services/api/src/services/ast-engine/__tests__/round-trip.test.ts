import { describe, it, expect } from "vitest";
import { serialize } from "../serializer";
import { parseSourceCode, parseMultipleFiles } from "../parser";
import { createNode } from "../ast";
import type { ASTNode } from "@staq/shared";

function createTestRootNode(children: ASTNode[]): ASTNode {
  return createNode({
    type: "root",
    name: "App",
    children,
  });
}

describe("Round-trip: AST → Code → AST", () => {
  describe("basic round-trip", () => {
    it("should serialize and parse back a simple screen", () => {
      const originalAST = createTestRootNode([
        createNode({
          type: "screen",
          name: "HomeScreen",
          children: [
            createNode({
              type: "component",
              component_type: "View",
              name: "container",
              style: {
                layout: { flex: 1 },
                colors: { backgroundColor: "#ffffff" },
              },
              children: [
                createNode({
                  type: "component",
                  component_type: "Text",
                  name: "title",
                  props: { children: "Welcome" },
                  style: {
                    typography: { fontSize: 24, fontWeight: "bold" },
                    colors: { color: "#333333" },
                  },
                }),
              ],
            }),
          ],
        }),
      ]);

      const output = serialize(originalAST, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const screenCode = output.get("src/app/home-screen.tsx");
      expect(screenCode).toBeDefined();

      const parseResult = parseSourceCode(screenCode!);

      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.screens).toHaveLength(1);

      const parsedScreen = parseResult.screens[0]!;
      expect(parsedScreen.type).toBe("screen");
      expect(parsedScreen.name).toBe("HomeScreen");

      const parsedView = parsedScreen.children[0];
      expect(parsedView).toBeDefined();
      expect(parsedView?.component_type).toBe("View");
      expect(parsedView?.style.layout?.flex).toBe(1);
      expect(parsedView?.style.colors?.backgroundColor).toBe("#ffffff");

      const parsedText = parsedView?.children[0];
      expect(parsedText).toBeDefined();
      expect(parsedText?.component_type).toBe("Text");
      expect(parsedText?.style.typography?.fontSize).toBe(24);
      expect(parsedText?.style.typography?.fontWeight).toBe("bold");
      expect(parsedText?.style.colors?.color).toBe("#333333");
    });

    it("should preserve component hierarchy through round-trip", () => {
      const originalAST = createTestRootNode([
        createNode({
          type: "screen",
          name: "NestedScreen",
          children: [
            createNode({
              type: "component",
              component_type: "View",
              name: "outer",
              children: [
                createNode({
                  type: "component",
                  component_type: "View",
                  name: "middle",
                  children: [
                    createNode({
                      type: "component",
                      component_type: "View",
                      name: "inner",
                      children: [
                        createNode({
                          type: "component",
                          component_type: "Text",
                          name: "deep",
                          props: { children: "Deep nested" },
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ]);

      const output = serialize(originalAST, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const screenCode = output.get("src/app/nested-screen.tsx");
      const parseResult = parseSourceCode(screenCode!);

      expect(parseResult.errors).toHaveLength(0);

      const screen = parseResult.screens[0]!;
      const outer = screen.children[0]!;
      const middle = outer.children[0]!;
      const inner = middle.children[0]!;
      const deep = inner.children[0]!;

      expect(outer.component_type).toBe("View");
      expect(middle.component_type).toBe("View");
      expect(inner.component_type).toBe("View");
      expect(deep.component_type).toBe("Text");
    });

    it("should preserve styles through round-trip", () => {
      const originalAST = createTestRootNode([
        createNode({
          type: "screen",
          name: "StyledScreen",
          children: [
            createNode({
              type: "component",
              component_type: "View",
              name: "styled",
              style: {
                layout: {
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                },
                spacing: {
                  padding: 16,
                  margin: 8,
                },
                sizing: {
                  width: 200,
                  height: 100,
                },
                colors: {
                  backgroundColor: "#f0f0f0",
                },
                borders: {
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#cccccc",
                },
                effects: {
                  opacity: 0.9,
                },
              },
            }),
          ],
        }),
      ]);

      const output = serialize(originalAST, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const screenCode = output.get("src/app/styled-screen.tsx");
      const parseResult = parseSourceCode(screenCode!);

      expect(parseResult.errors).toHaveLength(0);

      const view = parseResult.screens[0]!.children[0]!;

      expect(view.style.layout?.flex).toBe(1);
      expect(view.style.layout?.flexDirection).toBe("row");
      expect(view.style.layout?.justifyContent).toBe("center");
      expect(view.style.layout?.alignItems).toBe("center");
      expect(view.style.spacing?.padding).toBe(16);
      expect(view.style.spacing?.margin).toBe(8);
      expect(view.style.sizing?.width).toBe(200);
      expect(view.style.sizing?.height).toBe(100);
      expect(view.style.colors?.backgroundColor).toBe("#f0f0f0");
      expect(view.style.borders?.borderRadius).toBe(8);
      expect(view.style.borders?.borderWidth).toBe(1);
      expect(view.style.colors?.borderColor).toBe("#cccccc");
      expect(view.style.effects?.opacity).toBe(0.9);
    });
  });

  describe("multiple files round-trip", () => {
    it("should serialize and parse multiple screens", () => {
      const originalAST = createTestRootNode([
        createNode({
          type: "screen",
          name: "HomeScreen",
          children: [
            createNode({
              type: "component",
              component_type: "View",
              name: "homeContainer",
              children: [
                createNode({
                  type: "component",
                  component_type: "Text",
                  name: "homeTitle",
                  props: { children: "Home" },
                }),
              ],
            }),
          ],
        }),
        createNode({
          type: "screen",
          name: "ProfileScreen",
          children: [
            createNode({
              type: "component",
              component_type: "View",
              name: "profileContainer",
              children: [
                createNode({
                  type: "component",
                  component_type: "Text",
                  name: "profileTitle",
                  props: { children: "Profile" },
                }),
              ],
            }),
          ],
        }),
      ]);

      const output = serialize(originalAST, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const files = new Map<string, string>();
      for (const [path, code] of output) {
        if (path.endsWith(".tsx") && path.includes("app/")) {
          files.set(path, code);
        }
      }

      const parseResult = parseMultipleFiles(files);

      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.screens).toHaveLength(2);

      const screenNames = parseResult.screens.map((s) => s.name);
      expect(screenNames).toContain("HomeScreen");
      expect(screenNames).toContain("ProfileScreen");
    });
  });

  describe("component types preservation", () => {
    it("should preserve various React Native component types", () => {
      const componentTypes = ["View", "Text", "ScrollView", "TouchableOpacity", "SafeAreaView"];

      for (const componentType of componentTypes) {
        const ast = createTestRootNode([
          createNode({
            type: "screen",
            name: "TestScreen",
            children: [
              createNode({
                type: "component",
                component_type: componentType,
                name: "test",
              }),
            ],
          }),
        ]);

        const output = serialize(ast, {
          framework: "expo",
          includeScaffolding: false,
          expoRouter: true,
        });

        const code = output.get("src/app/test-screen.tsx")!;
        const result = parseSourceCode(code);

        expect(result.errors).toHaveLength(0);
        expect(result.screens[0]?.children[0]?.component_type).toBe(componentType);
      }
    });
  });

  describe("props preservation", () => {
    it("should preserve string props", () => {
      const ast = createTestRootNode([
        createNode({
          type: "screen",
          name: "PropsScreen",
          children: [
            createNode({
              type: "component",
              component_type: "TextInput",
              name: "input",
              props: {
                placeholder: "Enter text",
                testID: "my-input",
              },
            }),
          ],
        }),
      ]);

      const output = serialize(ast, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const code = output.get("src/app/props-screen.tsx")!;
      const result = parseSourceCode(code);

      const input = result.screens[0]?.children[0]!;
      expect(input.props.placeholder).toBe("Enter text");
      expect(input.props.testID).toBe("my-input");
    });

    it("should preserve numeric props", () => {
      const ast = createTestRootNode([
        createNode({
          type: "screen",
          name: "NumericScreen",
          children: [
            createNode({
              type: "component",
              component_type: "TextInput",
              name: "input",
              props: {
                maxLength: 100,
                numberOfLines: 5,
              },
            }),
          ],
        }),
      ]);

      const output = serialize(ast, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const code = output.get("src/app/numeric-screen.tsx")!;
      const result = parseSourceCode(code);

      const input = result.screens[0]?.children[0]!;
      expect(input.props.maxLength).toBe(100);
      expect(input.props.numberOfLines).toBe(5);
    });

    it("should preserve boolean props", () => {
      const ast = createTestRootNode([
        createNode({
          type: "screen",
          name: "BoolScreen",
          children: [
            createNode({
              type: "component",
              component_type: "TextInput",
              name: "input",
              props: {
                secureTextEntry: true,
                editable: false,
              },
            }),
          ],
        }),
      ]);

      const output = serialize(ast, {
        framework: "expo",
        includeScaffolding: false,
        expoRouter: true,
      });

      const code = output.get("src/app/bool-screen.tsx")!;
      const result = parseSourceCode(code);

      const input = result.screens[0]?.children[0]!;
      expect(input.props.secureTextEntry).toBe(true);
      expect(input.props.editable).toBe(false);
    });
  });
});
