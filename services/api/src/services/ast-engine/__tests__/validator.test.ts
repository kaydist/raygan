import { describe, it, expect } from "vitest";
import type { ASTNode } from "@staq/shared";
import { validateAST, isValidAST } from "../validator";
import { createNode, createRootNode, addNode } from "../ast";

describe("AST Validator", () => {
  const createValidTree = (): ASTNode => {
    const text = createNode({
      type: "component",
      component_type: "Text",
      name: "Label",
    });

    const view = createNode({
      type: "component",
      component_type: "View",
      name: "Container",
      children: [text],
    });

    const screen = createNode({
      type: "screen",
      name: "HomeScreen",
      children: [view],
    });

    let root = createRootNode();
    root = addNode(root, root.id, screen);

    return root;
  };

  describe("validateAST", () => {
    it("should validate a correct AST", () => {
      const ast = createValidTree();
      const result = validateAST(ast);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing type", () => {
      const ast = createValidTree();
      const invalidNode = ast.children[0]!;
      (invalidNode as unknown as { type: undefined }).type = undefined;

      const result = validateAST(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_TYPE")).toBe(true);
    });

    it("should detect invalid name", () => {
      const ast = createValidTree();
      const invalidNode = ast.children[0]!;
      (invalidNode as unknown as { name: null }).name = null as unknown as string;

      const result = validateAST(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_NAME")).toBe(true);
    });

    it("should detect missing component_type for component nodes", () => {
      const node = createNode({
        type: "component",
        name: "InvalidComponent",
      });
      node.component_type = undefined;

      const result = validateAST(node);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "MISSING_COMPONENT_TYPE")
      ).toBe(true);
    });

    it("should detect missing navigator_type for navigator nodes", () => {
      const node = createNode({
        type: "navigator",
        name: "InvalidNavigator",
      });

      const result = validateAST(node);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "MISSING_NAVIGATOR_TYPE")
      ).toBe(true);
    });

    it("should detect duplicate ids", () => {
      const ast = createValidTree();
      const child1 = ast.children[0]!;
      const child2 = child1.children[0]!;
      child2.id = child1.id;

      const result = validateAST(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "DUPLICATE_ID")).toBe(true);
    });

    it("should detect invalid children type", () => {
      const node = createNode({
        type: "component",
        component_type: "View",
        name: "TestNode",
      });
      (node as unknown as { children: string }).children = "not an array" as unknown as ASTNode[];

      const result = validateAST(node);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_CHILDREN")).toBe(
        true
      );
    });
  });

  describe("isValidAST", () => {
    it("should return true for valid AST", () => {
      const ast = createValidTree();
      expect(isValidAST(ast)).toBe(true);
    });

    it("should return false for invalid AST", () => {
      const ast = createValidTree();
      (ast as unknown as { type: undefined }).type = undefined;
      expect(isValidAST(ast)).toBe(false);
    });
  });
});
