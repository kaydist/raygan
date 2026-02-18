import { describe, it, expect } from "vitest";
import type { ASTNode } from "@staq/shared";
import { generatePatches, applyPatches } from "../differ";
import { createNode, updateNode, addNode, removeNode } from "../ast";

describe("AST Differ", () => {
  const createTestNode = (name: string, children: ASTNode[] = []): ASTNode =>
    createNode({
      type: "component",
      component_type: "View",
      name,
      children,
    });

  describe("generatePatches", () => {
    it("should detect property changes", () => {
      const oldAst = createTestNode("Container");
      const newAst = { ...oldAst, name: "UpdatedContainer" };

      const patches = generatePatches(oldAst, newAst);

      expect(patches).toHaveLength(1);
      expect(patches[0]?.op).toBe("replace");
      expect(patches[0]?.path).toBe("/name");
      expect(patches[0]?.value).toBe("UpdatedContainer");
    });

    it("should detect prop changes", () => {
      const oldAst = createTestNode("Button");
      oldAst.props = { title: "Old Title" };

      const newAst = { ...oldAst, props: { title: "New Title" } };

      const patches = generatePatches(oldAst, newAst);

      const propPatch = patches.find((p) => p.path === "/props/title");
      expect(propPatch).toBeDefined();
      expect(propPatch?.op).toBe("replace");
      expect(propPatch?.value).toBe("New Title");
    });

    it("should detect added props", () => {
      const oldAst = createTestNode("Button");
      oldAst.props = {};

      const newAst = { ...oldAst, props: { disabled: true } };

      const patches = generatePatches(oldAst, newAst);

      const addPatch = patches.find((p) => p.path === "/props/disabled");
      expect(addPatch).toBeDefined();
      expect(addPatch?.op).toBe("add");
      expect(addPatch?.value).toBe(true);
    });

    it("should detect removed props", () => {
      const oldAst = createTestNode("Button");
      oldAst.props = { title: "Click", disabled: true };

      const newAst = { ...oldAst, props: { title: "Click" } };

      const patches = generatePatches(oldAst, newAst);

      const removePatch = patches.find((p) => p.path === "/props/disabled");
      expect(removePatch).toBeDefined();
      expect(removePatch?.op).toBe("remove");
    });

    it("should detect style changes", () => {
      const oldAst = createTestNode("Container");
      oldAst.style = { layout: { flex: 1 } };

      const newAst = {
        ...oldAst,
        style: { layout: { flex: 2, flexDirection: "row" as const } },
      };

      const patches = generatePatches(oldAst, newAst);

      expect(patches.some((p) => p.path.includes("/style/layout"))).toBe(true);
    });

    it("should detect added children", () => {
      const oldAst = createTestNode("Container");
      const child = createTestNode("Child");
      const newAst = { ...oldAst, children: [child] };

      const patches = generatePatches(oldAst, newAst);

      const addPatch = patches.find(
        (p) => p.op === "add" && p.path.includes("/children")
      );
      expect(addPatch).toBeDefined();
    });

    it("should detect removed children", () => {
      const child = createTestNode("Child");
      const oldAst = createTestNode("Container", [child]);
      const newAst = { ...oldAst, children: [] };

      const patches = generatePatches(oldAst, newAst);

      const removePatch = patches.find(
        (p) => p.op === "remove" && p.path.includes("/children")
      );
      expect(removePatch).toBeDefined();
    });

    it("should return empty array for identical trees", () => {
      const ast = createTestNode("Container");
      const patches = generatePatches(ast, ast);

      expect(patches).toHaveLength(0);
    });

    it("should detect complete replacement when IDs differ", () => {
      const oldAst = createTestNode("OldNode");
      const newAst = createTestNode("NewNode");

      const patches = generatePatches(oldAst, newAst);

      expect(patches[0]?.op).toBe("replace");
      expect(patches[0]?.path).toBe("");
    });
  });

  describe("applyPatches", () => {
    it("should apply replace patch", () => {
      const ast = createTestNode("Original");
      const patches = [{ op: "replace" as const, path: "/name", value: "Modified" }];

      const result = applyPatches(ast, patches);

      expect(result.name).toBe("Modified");
    });

    it("should apply add patch", () => {
      const ast = createTestNode("Container");
      ast.props = {};
      const patches = [
        { op: "add" as const, path: "/props/newProp", value: "newValue" },
      ];

      const result = applyPatches(ast, patches);

      expect(result.props.newProp).toBe("newValue");
    });

    it("should apply remove patch", () => {
      const ast = createTestNode("Container");
      ast.props = { toRemove: "value", toKeep: "value" };
      const patches = [{ op: "remove" as const, path: "/props/toRemove" }];

      const result = applyPatches(ast, patches);

      expect(result.props.toRemove).toBeUndefined();
      expect(result.props.toKeep).toBe("value");
    });

    it("should apply multiple patches in order", () => {
      const ast = createTestNode("Container");
      ast.props = { a: 1, b: 2 };
      const patches = [
        { op: "replace" as const, path: "/props/a", value: 10 },
        { op: "add" as const, path: "/props/c", value: 3 },
        { op: "remove" as const, path: "/props/b" },
      ];

      const result = applyPatches(ast, patches);

      expect(result.props.a).toBe(10);
      expect(result.props.b).toBeUndefined();
      expect(result.props.c).toBe(3);
    });

    it("should be reversible with generatePatches", () => {
      const oldAst = createTestNode("Container");
      oldAst.props = { title: "Hello" };
      oldAst.style = { layout: { flex: 1 } };

      const newAst = { ...oldAst, name: "NewContainer", props: { title: "World" } };

      const patches = generatePatches(oldAst, newAst);
      const applied = applyPatches(oldAst, patches);

      expect(applied.name).toBe(newAst.name);
      expect(applied.props.title).toBe(newAst.props.title);
    });
  });
});
