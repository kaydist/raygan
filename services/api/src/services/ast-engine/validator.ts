import type { ASTNode, ASTValidationResult, ASTValidationError } from "@raygan/shared";
import { findNode, getAllNodeIds } from "./ast";

export function validateAST(ast: ASTNode): ASTValidationResult {
  const errors: ASTValidationError[] = [];

  validateNode(ast, "", errors, new Set());
  validateNoOrphans(ast, errors);
  validateNoCircularReferences(ast, errors);
  validateUniqueIds(ast, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateNode(
  node: ASTNode,
  path: string,
  errors: ASTValidationError[],
  visited: Set<string>
): void {
  if (visited.has(node.id)) {
    errors.push({
      node_id: node.id,
      path,
      code: "CIRCULAR_REFERENCE",
      message: `Circular reference detected at node ${node.id}`,
    });
    return;
  }

  visited.add(node.id);

  if (!node.id || typeof node.id !== "string") {
    errors.push({
      node_id: node.id ?? "unknown",
      path,
      code: "INVALID_ID",
      message: "Node must have a valid string id",
    });
  }

  if (!node.type) {
    errors.push({
      node_id: node.id,
      path,
      code: "MISSING_TYPE",
      message: "Node must have a type",
    });
  }

  if (!node.name || typeof node.name !== "string") {
    errors.push({
      node_id: node.id,
      path,
      code: "INVALID_NAME",
      message: "Node must have a valid string name",
    });
  }

  if (node.type === "component" && !node.component_type) {
    errors.push({
      node_id: node.id,
      path,
      code: "MISSING_COMPONENT_TYPE",
      message: "Component node must have a component_type",
    });
  }

  if (node.type === "navigator" && !node.navigator_type) {
    errors.push({
      node_id: node.id,
      path,
      code: "MISSING_NAVIGATOR_TYPE",
      message: "Navigator node must have a navigator_type",
    });
  }

  if (!Array.isArray(node.children)) {
    errors.push({
      node_id: node.id,
      path,
      code: "INVALID_CHILDREN",
      message: "Node children must be an array",
    });
  } else {
    node.children.forEach((child, index) => {
      validateNode(child, `${path}/children/${index}`, errors, visited);
    });
  }

  visited.delete(node.id);
}

function validateNoOrphans(ast: ASTNode, errors: ASTValidationError[]): void {
  function checkParentReferences(node: ASTNode): void {
    if (!Array.isArray(node.children)) return;

    for (const child of node.children) {
      const parentExists = findNode(ast, node.id) !== undefined;
      if (!parentExists) {
        errors.push({
          node_id: child.id,
          path: "",
          code: "ORPHAN_NODE",
          message: `Node ${child.id} has no valid parent`,
        });
      }
      checkParentReferences(child);
    }
  }

  checkParentReferences(ast);
}

function validateNoCircularReferences(
  ast: ASTNode,
  errors: ASTValidationError[]
): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: ASTNode): boolean {
    if (recursionStack.has(node.id)) {
      errors.push({
        node_id: node.id,
        path: "",
        code: "CIRCULAR_REFERENCE",
        message: `Circular reference detected: node ${node.id} appears in its own subtree`,
      });
      return true;
    }

    if (visited.has(node.id)) {
      return false;
    }

    visited.add(node.id);
    recursionStack.add(node.id);

    if (!Array.isArray(node.children)) {
      recursionStack.delete(node.id);
      return false;
    }

    for (const child of node.children) {
      if (dfs(child)) {
        return true;
      }
    }

    recursionStack.delete(node.id);
    return false;
  }

  dfs(ast);
}

function validateUniqueIds(ast: ASTNode, errors: ASTValidationError[]): void {
  const allIds = getAllNodeIds(ast);
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of allIds) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  for (const id of duplicates) {
    errors.push({
      node_id: id,
      path: "",
      code: "DUPLICATE_ID",
      message: `Duplicate node id found: ${id}`,
    });
  }
}

export function isValidAST(ast: ASTNode): boolean {
  return validateAST(ast).valid;
}
