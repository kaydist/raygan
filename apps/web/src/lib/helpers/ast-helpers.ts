import type { ASTNode } from "@raygan/shared";

export function findNode(ast: ASTNode, nodeId: string): ASTNode | undefined {
  if (ast.id === nodeId) return ast;

  for (const child of ast.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }

  return undefined;
}

export function traverseAST(
  ast: ASTNode,
  callback: (node: ASTNode, depth: number) => void,
  depth = 0
): void {
  callback(ast, depth);
  for (const child of ast.children) {
    traverseAST(child, callback, depth + 1);
  }
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

export function getParentNode(
  ast: ASTNode,
  nodeId: string
): ASTNode | undefined {
  for (const child of ast.children) {
    if (child.id === nodeId) return ast;
    const found = getParentNode(child, nodeId);
    if (found) return found;
  }
  return undefined;
}

export function countNodes(ast: ASTNode): number {
  let count = 1;
  for (const child of ast.children) {
    count += countNodes(child);
  }
  return count;
}
