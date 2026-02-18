import { v4 as uuidv4 } from "uuid";
import type {
  ASTNode,
  ASTOperation,
  ASTOperationCreate,
  ASTOperationUpdate,
  ASTOperationDelete,
  ASTOperationMove,
  ASTOperationDuplicate,
  CreateNodeOptions,
  ASTNodeMeta,
} from "@staq/shared";

export function createNode(options: CreateNodeOptions): ASTNode {
  const now = new Date().toISOString();
  const meta: ASTNodeMeta = {
    source: "builder",
    created_at: now,
    updated_at: now,
    version: 1,
    ...options.meta,
  };

  return {
    id: uuidv4(),
    type: options.type,
    component_type: options.component_type,
    navigator_type: options.navigator_type,
    name: options.name,
    props: options.props ?? {},
    style: options.style ?? {},
    children: options.children ?? [],
    meta,
  };
}

export function createRootNode(): ASTNode {
  return createNode({
    type: "root",
    name: "App",
    meta: { source: "agent" },
  });
}

export function findNode(ast: ASTNode, nodeId: string): ASTNode | undefined {
  if (ast.id === nodeId) return ast;

  for (const child of ast.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }

  return undefined;
}

export function findParentNode(ast: ASTNode, nodeId: string): ASTNode | undefined {
  for (const child of ast.children) {
    if (child.id === nodeId) return ast;
    const found = findParentNode(child, nodeId);
    if (found) return found;
  }
  return undefined;
}

export function getNodePath(ast: ASTNode, nodeId: string): string[] {
  const path: string[] = [];

  function search(node: ASTNode, currentPath: string[]): boolean {
    if (node.id === nodeId) {
      path.push(...currentPath, node.id);
      return true;
    }

    for (const child of node.children) {
      if (search(child, [...currentPath, node.id])) {
        return true;
      }
    }

    return false;
  }

  search(ast, []);
  return path;
}

export function getNodeIndex(parent: ASTNode, nodeId: string): number {
  return parent.children.findIndex((child) => child.id === nodeId);
}

export function cloneNode(node: ASTNode, deep = true): ASTNode {
  const now = new Date().toISOString();
  const cloned: ASTNode = {
    ...node,
    id: uuidv4(),
    props: { ...node.props },
    style: JSON.parse(JSON.stringify(node.style)),
    meta: {
      ...node.meta,
      created_at: now,
      updated_at: now,
      version: 1,
    },
    children: deep ? node.children.map((child) => cloneNode(child, true)) : [],
  };
  return cloned;
}

export function traverseAST(
  ast: ASTNode,
  callback: (node: ASTNode, depth: number, parent: ASTNode | null) => void,
  depth = 0,
  parent: ASTNode | null = null
): void {
  callback(ast, depth, parent);
  for (const child of ast.children) {
    traverseAST(child, callback, depth + 1, ast);
  }
}

export function countNodes(ast: ASTNode): number {
  let count = 1;
  for (const child of ast.children) {
    count += countNodes(child);
  }
  return count;
}

export function getAllNodeIds(ast: ASTNode): string[] {
  const ids: string[] = [ast.id];
  if (Array.isArray(ast.children)) {
    for (const child of ast.children) {
      ids.push(...getAllNodeIds(child));
    }
  }
  return ids;
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

export function addNode(
  ast: ASTNode,
  parentId: string,
  node: ASTNode,
  index?: number
): ASTNode {
  const parent = findNode(ast, parentId);
  if (!parent) {
    throw new Error(`Parent node not found: ${parentId}`);
  }

  const insertIndex = index !== undefined ? index : parent.children.length;
  const newChildren = [...parent.children];
  newChildren.splice(insertIndex, 0, node);

  return updateNodeInTree(ast, parentId, {
    children: newChildren,
    meta: { ...parent.meta, updated_at: new Date().toISOString() },
  });
}

export function updateNode(
  ast: ASTNode,
  nodeId: string,
  updates: Partial<Omit<ASTNode, "id" | "children">>
): ASTNode {
  const node = findNode(ast, nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  return updateNodeInTree(ast, nodeId, {
    ...updates,
    meta: {
      ...node.meta,
      ...updates.meta,
      updated_at: new Date().toISOString(),
      version: (node.meta.version ?? 0) + 1,
    },
  });
}

export function removeNode(ast: ASTNode, nodeId: string): ASTNode {
  if (ast.id === nodeId) {
    throw new Error("Cannot remove root node");
  }

  const parent = findParentNode(ast, nodeId);
  if (!parent) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const newChildren = parent.children.filter((child) => child.id !== nodeId);

  return updateNodeInTree(ast, parent.id, {
    children: newChildren,
    meta: { ...parent.meta, updated_at: new Date().toISOString() },
  });
}

export function moveNode(
  ast: ASTNode,
  nodeId: string,
  newParentId: string,
  index?: number
): ASTNode {
  if (nodeId === ast.id) {
    throw new Error("Cannot move root node");
  }

  const node = findNode(ast, nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const newParent = findNode(ast, newParentId);
  if (!newParent) {
    throw new Error(`New parent not found: ${newParentId}`);
  }

  const ancestorIds = getNodePath(ast, newParentId);
  if (ancestorIds.includes(nodeId)) {
    throw new Error("Cannot move a node into its own descendant");
  }

  let result = removeNode(ast, nodeId);
  result = addNode(result, newParentId, node, index);

  return result;
}

export function duplicateNode(
  ast: ASTNode,
  nodeId: string,
  newParentId?: string
): ASTNode {
  const node = findNode(ast, nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const cloned = cloneNode(node, true);
  cloned.name = `${node.name} (copy)`;

  const targetParentId = newParentId ?? findParentNode(ast, nodeId)?.id;
  if (!targetParentId) {
    throw new Error("Cannot duplicate root node without specifying parent");
  }

  const parent = findNode(ast, targetParentId);
  if (!parent) {
    throw new Error(`Parent not found: ${targetParentId}`);
  }

  const originalIndex = getNodeIndex(parent, nodeId);
  const insertIndex = newParentId ? undefined : originalIndex + 1;

  return addNode(ast, targetParentId, cloned, insertIndex);
}

function updateNodeInTree(
  ast: ASTNode,
  nodeId: string,
  updates: Partial<ASTNode>
): ASTNode {
  if (ast.id === nodeId) {
    return {
      ...ast,
      ...updates,
      children: updates.children ?? ast.children,
    };
  }

  return {
    ...ast,
    children: ast.children.map((child) =>
      updateNodeInTree(child, nodeId, updates)
    ),
  };
}

// =============================================================================
// APPLY OPERATIONS
// =============================================================================

export function applyOperation(ast: ASTNode, operation: ASTOperation): ASTNode {
  switch (operation.type) {
    case "create":
      return applyCreateOperation(ast, operation as ASTOperationCreate);
    case "update":
      return applyUpdateOperation(ast, operation as ASTOperationUpdate);
    case "delete":
      return applyDeleteOperation(ast, operation as ASTOperationDelete);
    case "move":
      return applyMoveOperation(ast, operation as ASTOperationMove);
    case "duplicate":
      return applyDuplicateOperation(ast, operation as ASTOperationDuplicate);
    default: {
      const _exhaustive: never = operation;
      throw new Error(`Unknown operation type: ${(_exhaustive as ASTOperation).type}`);
    }
  }
}

export function applyOperations(ast: ASTNode, operations: ASTOperation[]): ASTNode {
  return operations.reduce((currentAst, op) => applyOperation(currentAst, op), ast);
}

function applyCreateOperation(ast: ASTNode, op: ASTOperationCreate): ASTNode {
  const newNode = createNode({
    type: op.node.type,
    component_type: op.node.component_type,
    navigator_type: op.node.navigator_type,
    name: op.node.name,
    props: op.node.props,
    style: op.node.style,
    children: op.node.children,
    meta: op.node.meta,
  });

  return addNode(ast, op.parent_id, newNode, op.index);
}

function applyUpdateOperation(ast: ASTNode, op: ASTOperationUpdate): ASTNode {
  return updateNode(ast, op.node_id, op.updates);
}

function applyDeleteOperation(ast: ASTNode, op: ASTOperationDelete): ASTNode {
  return removeNode(ast, op.node_id);
}

function applyMoveOperation(ast: ASTNode, op: ASTOperationMove): ASTNode {
  return moveNode(ast, op.node_id, op.new_parent_id, op.index);
}

function applyDuplicateOperation(ast: ASTNode, op: ASTOperationDuplicate): ASTNode {
  return duplicateNode(ast, op.node_id, op.new_parent_id);
}
