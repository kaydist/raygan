import { describe, it, expect, beforeEach } from "vitest";
import type { ASTNode, ASTOperation } from "@raygan/shared";
import {
  createNode,
  createRootNode,
  findNode,
  findParentNode,
  getNodePath,
  getNodeIndex,
  cloneNode,
  traverseAST,
  countNodes,
  getAllNodeIds,
  addNode,
  updateNode,
  removeNode,
  moveNode,
  duplicateNode,
  applyOperation,
  applyOperations,
} from "../ast";

describe("AST Engine", () => {
  let rootNode: ASTNode;
  let screenNode: ASTNode;
  let viewNode: ASTNode;
  let textNode: ASTNode;

  beforeEach(() => {
    textNode = createNode({
      type: "component",
      component_type: "Text",
      name: "WelcomeText",
      props: { children: "Hello World" },
    });

    viewNode = createNode({
      type: "component",
      component_type: "View",
      name: "Container",
      children: [textNode],
    });

    screenNode = createNode({
      type: "screen",
      name: "HomeScreen",
      children: [viewNode],
    });

    rootNode = createRootNode();
    rootNode = addNode(rootNode, rootNode.id, screenNode);
  });

  describe("createNode", () => {
    it("should create a node with all required properties", () => {
      const node = createNode({
        type: "component",
        component_type: "Button",
        name: "MyButton",
        props: { title: "Click me" },
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe("component");
      expect(node.component_type).toBe("Button");
      expect(node.name).toBe("MyButton");
      expect(node.props).toEqual({ title: "Click me" });
      expect(node.children).toEqual([]);
      expect(node.meta.created_at).toBeDefined();
      expect(node.meta.version).toBe(1);
    });

    it("should create a root node", () => {
      const root = createRootNode();
      expect(root.type).toBe("root");
      expect(root.name).toBe("App");
      expect(root.children).toEqual([]);
    });
  });

  describe("findNode", () => {
    it("should find a node by id", () => {
      const found = findNode(rootNode, screenNode.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(screenNode.id);
    });

    it("should find a deeply nested node", () => {
      const found = findNode(rootNode, textNode.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("WelcomeText");
    });

    it("should return undefined for non-existent id", () => {
      const found = findNode(rootNode, "non-existent-id");
      expect(found).toBeUndefined();
    });
  });

  describe("findParentNode", () => {
    it("should find the parent of a node", () => {
      const parent = findParentNode(rootNode, screenNode.id);
      expect(parent?.id).toBe(rootNode.id);
    });

    it("should find the parent of a nested node", () => {
      const parent = findParentNode(rootNode, textNode.id);
      expect(parent?.id).toBe(viewNode.id);
    });

    it("should return undefined for root node", () => {
      const parent = findParentNode(rootNode, rootNode.id);
      expect(parent).toBeUndefined();
    });
  });

  describe("getNodePath", () => {
    it("should return the path to a node", () => {
      const path = getNodePath(rootNode, textNode.id);
      expect(path).toHaveLength(4);
      expect(path[0]).toBe(rootNode.id);
      expect(path[3]).toBe(textNode.id);
    });

    it("should return empty array for non-existent node", () => {
      const path = getNodePath(rootNode, "non-existent");
      expect(path).toEqual([]);
    });
  });

  describe("getNodeIndex", () => {
    it("should return the index of a child node", () => {
      const index = getNodeIndex(rootNode, screenNode.id);
      expect(index).toBe(0);
    });

    it("should return -1 for non-child node", () => {
      const index = getNodeIndex(rootNode, textNode.id);
      expect(index).toBe(-1);
    });
  });

  describe("cloneNode", () => {
    it("should create a deep clone with new ids", () => {
      const cloned = cloneNode(viewNode);

      expect(cloned.id).not.toBe(viewNode.id);
      expect(cloned.name).toBe(viewNode.name);
      expect(cloned.children).toHaveLength(1);
      expect(cloned.children[0]?.id).not.toBe(textNode.id);
    });

    it("should not share object references", () => {
      const cloned = cloneNode(viewNode);
      cloned.props.test = "modified";

      expect(viewNode.props.test).toBeUndefined();
    });
  });

  describe("traverseAST", () => {
    it("should visit all nodes", () => {
      const visited: string[] = [];
      traverseAST(rootNode, (node) => visited.push(node.id));

      expect(visited).toContain(rootNode.id);
      expect(visited).toContain(screenNode.id);
      expect(visited).toContain(viewNode.id);
      expect(visited).toContain(textNode.id);
    });

    it("should provide correct depth", () => {
      const depths: Record<string, number> = {};
      traverseAST(rootNode, (node, depth) => {
        depths[node.name] = depth;
      });

      expect(depths["App"]).toBe(0);
      expect(depths["HomeScreen"]).toBe(1);
      expect(depths["Container"]).toBe(2);
      expect(depths["WelcomeText"]).toBe(3);
    });
  });

  describe("countNodes", () => {
    it("should count all nodes", () => {
      const count = countNodes(rootNode);
      expect(count).toBe(4);
    });
  });

  describe("getAllNodeIds", () => {
    it("should return all node ids", () => {
      const ids = getAllNodeIds(rootNode);
      expect(ids).toHaveLength(4);
      expect(ids).toContain(rootNode.id);
      expect(ids).toContain(textNode.id);
    });
  });

  describe("addNode", () => {
    it("should add a child node", () => {
      const newNode = createNode({
        type: "component",
        component_type: "Button",
        name: "NewButton",
      });

      const updated = addNode(rootNode, viewNode.id, newNode);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children).toHaveLength(2);
    });

    it("should add at specific index", () => {
      const newNode = createNode({
        type: "component",
        component_type: "Button",
        name: "FirstButton",
      });

      const updated = addNode(rootNode, viewNode.id, newNode, 0);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children[0]?.name).toBe("FirstButton");
    });

    it("should throw for non-existent parent", () => {
      const newNode = createNode({
        type: "component",
        component_type: "Button",
        name: "Button",
      });

      expect(() => addNode(rootNode, "non-existent", newNode)).toThrow(
        "Parent node not found"
      );
    });
  });

  describe("updateNode", () => {
    it("should update node properties", () => {
      const updated = updateNode(rootNode, textNode.id, {
        name: "UpdatedText",
        props: { children: "Updated content" },
      });

      const node = findNode(updated, textNode.id);
      expect(node?.name).toBe("UpdatedText");
      expect(node?.props.children).toBe("Updated content");
    });

    it("should increment version", () => {
      const updated = updateNode(rootNode, textNode.id, { name: "New Name" });
      const node = findNode(updated, textNode.id);

      expect(node?.meta.version).toBeGreaterThan(textNode.meta.version ?? 0);
    });

    it("should throw for non-existent node", () => {
      expect(() =>
        updateNode(rootNode, "non-existent", { name: "Test" })
      ).toThrow("Node not found");
    });
  });

  describe("removeNode", () => {
    it("should remove a node", () => {
      const updated = removeNode(rootNode, textNode.id);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children).toHaveLength(0);
      expect(findNode(updated, textNode.id)).toBeUndefined();
    });

    it("should throw when removing root", () => {
      expect(() => removeNode(rootNode, rootNode.id)).toThrow(
        "Cannot remove root node"
      );
    });
  });

  describe("moveNode", () => {
    it("should move a node to a new parent", () => {
      const updated = moveNode(rootNode, textNode.id, screenNode.id);

      const oldParent = findNode(updated, viewNode.id);
      const newParent = findNode(updated, screenNode.id);

      expect(oldParent?.children).toHaveLength(0);
      expect(newParent?.children).toHaveLength(2);
    });

    it("should throw when moving into descendant", () => {
      expect(() => moveNode(rootNode, screenNode.id, textNode.id)).toThrow(
        "Cannot move a node into its own descendant"
      );
    });

    it("should throw when moving root", () => {
      expect(() => moveNode(rootNode, rootNode.id, screenNode.id)).toThrow(
        "Cannot move root node"
      );
    });
  });

  describe("duplicateNode", () => {
    it("should duplicate a node with new id", () => {
      const updated = duplicateNode(rootNode, textNode.id);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children).toHaveLength(2);
      expect(parent?.children[1]?.name).toBe("WelcomeText (copy)");
      expect(parent?.children[1]?.id).not.toBe(textNode.id);
    });

    it("should duplicate to different parent", () => {
      const updated = duplicateNode(rootNode, textNode.id, screenNode.id);
      const newParent = findNode(updated, screenNode.id);

      expect(newParent?.children).toHaveLength(2);
    });
  });

  describe("applyOperation", () => {
    it("should apply create operation", () => {
      const op: ASTOperation = {
        type: "create",
        parent_id: viewNode.id,
        node: {
          type: "component",
          component_type: "Image",
          name: "ProfileImage",
          props: { source: { uri: "https://example.com/image.png" } },
          style: {},
          meta: {},
        },
      };

      const updated = applyOperation(rootNode, op);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children).toHaveLength(2);
      expect(parent?.children[1]?.name).toBe("ProfileImage");
    });

    it("should apply update operation", () => {
      const op: ASTOperation = {
        type: "update",
        node_id: textNode.id,
        updates: {
          props: { children: "New Text" },
        },
      };

      const updated = applyOperation(rootNode, op);
      const node = findNode(updated, textNode.id);

      expect(node?.props.children).toBe("New Text");
    });

    it("should apply delete operation", () => {
      const op: ASTOperation = {
        type: "delete",
        node_id: textNode.id,
      };

      const updated = applyOperation(rootNode, op);
      expect(findNode(updated, textNode.id)).toBeUndefined();
    });

    it("should apply move operation", () => {
      const op: ASTOperation = {
        type: "move",
        node_id: textNode.id,
        new_parent_id: screenNode.id,
        index: 0,
      };

      const updated = applyOperation(rootNode, op);
      const newParent = findNode(updated, screenNode.id);

      expect(newParent?.children[0]?.id).toBe(textNode.id);
    });

    it("should apply duplicate operation", () => {
      const op: ASTOperation = {
        type: "duplicate",
        node_id: textNode.id,
      };

      const updated = applyOperation(rootNode, op);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children).toHaveLength(2);
    });
  });

  describe("applyOperations", () => {
    it("should apply multiple operations in sequence", () => {
      const ops: ASTOperation[] = [
        {
          type: "create",
          parent_id: viewNode.id,
          node: {
            type: "component",
            component_type: "Button",
            name: "Button1",
            props: {},
            style: {},
            meta: {},
          },
        },
        {
          type: "create",
          parent_id: viewNode.id,
          node: {
            type: "component",
            component_type: "Button",
            name: "Button2",
            props: {},
            style: {},
            meta: {},
          },
        },
      ];

      const updated = applyOperations(rootNode, ops);
      const parent = findNode(updated, viewNode.id);

      expect(parent?.children).toHaveLength(3);
    });
  });
});
