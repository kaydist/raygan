import type { ASTNode, JSONPatch } from "@raygan/shared";

export function generatePatches(oldAst: ASTNode, newAst: ASTNode): JSONPatch[] {
  const patches: JSONPatch[] = [];
  diffNodes(oldAst, newAst, "", patches);
  return patches;
}

export function applyPatches(ast: ASTNode, patches: JSONPatch[]): ASTNode {
  let result = JSON.parse(JSON.stringify(ast)) as ASTNode;

  for (const patch of patches) {
    result = applyPatch(result, patch);
  }

  return result;
}

function diffNodes(
  oldNode: ASTNode | undefined,
  newNode: ASTNode | undefined,
  path: string,
  patches: JSONPatch[]
): void {
  if (oldNode === undefined && newNode === undefined) {
    return;
  }

  if (oldNode === undefined && newNode !== undefined) {
    patches.push({ op: "add", path, value: newNode });
    return;
  }

  if (oldNode !== undefined && newNode === undefined) {
    patches.push({ op: "remove", path });
    return;
  }

  if (oldNode!.id !== newNode!.id) {
    patches.push({ op: "replace", path, value: newNode });
    return;
  }

  const old = oldNode!;
  const curr = newNode!;

  if (old.type !== curr.type) {
    patches.push({ op: "replace", path: `${path}/type`, value: curr.type });
  }

  if (old.component_type !== curr.component_type) {
    if (curr.component_type === undefined) {
      patches.push({ op: "remove", path: `${path}/component_type` });
    } else {
      patches.push({
        op: old.component_type === undefined ? "add" : "replace",
        path: `${path}/component_type`,
        value: curr.component_type,
      });
    }
  }

  if (old.navigator_type !== curr.navigator_type) {
    if (curr.navigator_type === undefined) {
      patches.push({ op: "remove", path: `${path}/navigator_type` });
    } else {
      patches.push({
        op: old.navigator_type === undefined ? "add" : "replace",
        path: `${path}/navigator_type`,
        value: curr.navigator_type,
      });
    }
  }

  if (old.name !== curr.name) {
    patches.push({ op: "replace", path: `${path}/name`, value: curr.name });
  }

  diffObject(old.props, curr.props, `${path}/props`, patches);
  diffObject(old.style as Record<string, unknown>, curr.style as Record<string, unknown>, `${path}/style`, patches);
  diffObject(old.meta as Record<string, unknown>, curr.meta as Record<string, unknown>, `${path}/meta`, patches);

  diffChildren(old.children, curr.children, `${path}/children`, patches);
}

function diffObject(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  path: string,
  patches: JSONPatch[]
): void {
  const oldKeys = new Set(Object.keys(oldObj));
  const newKeys = new Set(Object.keys(newObj));

  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      patches.push({ op: "remove", path: `${path}/${escapeJsonPointer(key)}` });
    }
  }

  for (const key of newKeys) {
    const escapedKey = escapeJsonPointer(key);
    const newValue = newObj[key];
    const oldValue = oldObj[key];

    if (!oldKeys.has(key)) {
      patches.push({ op: "add", path: `${path}/${escapedKey}`, value: newValue });
    } else if (!deepEqual(oldValue, newValue)) {
      if (isObject(oldValue) && isObject(newValue)) {
        diffObject(
          oldValue as Record<string, unknown>,
          newValue as Record<string, unknown>,
          `${path}/${escapedKey}`,
          patches
        );
      } else {
        patches.push({ op: "replace", path: `${path}/${escapedKey}`, value: newValue });
      }
    }
  }
}

function diffChildren(
  oldChildren: ASTNode[],
  newChildren: ASTNode[],
  path: string,
  patches: JSONPatch[]
): void {
  const oldIds = oldChildren.map((c) => c.id);
  const newIds = newChildren.map((c) => c.id);

  const removedIds = oldIds.filter((id) => !newIds.includes(id));
  const addedIds = newIds.filter((id) => !oldIds.includes(id));
  const commonIds = oldIds.filter((id) => newIds.includes(id));

  for (let i = removedIds.length - 1; i >= 0; i--) {
    const id = removedIds[i]!;
    const oldIndex = oldIds.indexOf(id);
    patches.push({ op: "remove", path: `${path}/${oldIndex}` });
  }

  for (const id of addedIds) {
    const newIndex = newIds.indexOf(id);
    const node = newChildren[newIndex];
    patches.push({ op: "add", path: `${path}/${newIndex}`, value: node });
  }

  for (const id of commonIds) {
    const oldIndex = oldIds.indexOf(id);
    const newIndex = newIds.indexOf(id);

    const oldChild = oldChildren[oldIndex];
    const newChild = newChildren[newIndex];

    if (oldIndex !== newIndex) {
      patches.push({
        op: "move",
        from: `${path}/${oldIndex}`,
        path: `${path}/${newIndex}`,
      });
    }

    diffNodes(oldChild, newChild, `${path}/${newIndex}`, patches);
  }
}

function applyPatch(obj: ASTNode, patch: JSONPatch): ASTNode {
  const result = JSON.parse(JSON.stringify(obj)) as ASTNode;
  const pathParts = parseJsonPointer(patch.path);

  if (pathParts.length === 0) {
    if (patch.op === "replace" || patch.op === "add") {
      return patch.value as ASTNode;
    }
    throw new Error("Cannot remove root");
  }

  const parentPath = pathParts.slice(0, -1);
  const key = pathParts[pathParts.length - 1]!;
  const parent = getAtPath(result, parentPath);

  if (parent === undefined) {
    throw new Error(`Path not found: ${patch.path}`);
  }

  switch (patch.op) {
    case "add":
      if (Array.isArray(parent)) {
        const index = key === "-" ? parent.length : parseInt(key, 10);
        parent.splice(index, 0, patch.value);
      } else {
        (parent as Record<string, unknown>)[key] = patch.value;
      }
      break;

    case "remove":
      if (Array.isArray(parent)) {
        parent.splice(parseInt(key, 10), 1);
      } else {
        delete (parent as Record<string, unknown>)[key];
      }
      break;

    case "replace":
      if (Array.isArray(parent)) {
        parent[parseInt(key, 10)] = patch.value;
      } else {
        (parent as Record<string, unknown>)[key] = patch.value;
      }
      break;

    case "move": {
      if (!patch.from) throw new Error("Move operation requires 'from'");
      const fromParts = parseJsonPointer(patch.from);
      const fromParentPath = fromParts.slice(0, -1);
      const fromKey = fromParts[fromParts.length - 1]!;
      const fromParent = getAtPath(result, fromParentPath);

      let value: unknown;
      if (Array.isArray(fromParent)) {
        value = fromParent.splice(parseInt(fromKey, 10), 1)[0];
      } else {
        value = (fromParent as Record<string, unknown>)[fromKey];
        delete (fromParent as Record<string, unknown>)[fromKey];
      }

      if (Array.isArray(parent)) {
        const index = key === "-" ? parent.length : parseInt(key, 10);
        parent.splice(index, 0, value);
      } else {
        (parent as Record<string, unknown>)[key] = value;
      }
      break;
    }

    case "copy": {
      if (!patch.from) throw new Error("Copy operation requires 'from'");
      const copyFromParts = parseJsonPointer(patch.from);
      const copyValue = getAtPath(result, copyFromParts);

      if (Array.isArray(parent)) {
        const index = key === "-" ? parent.length : parseInt(key, 10);
        parent.splice(index, 0, JSON.parse(JSON.stringify(copyValue)));
      } else {
        (parent as Record<string, unknown>)[key] = JSON.parse(JSON.stringify(copyValue));
      }
      break;
    }

    case "test": {
      const testValue = getAtPath(result, pathParts);
      if (!deepEqual(testValue, patch.value)) {
        throw new Error(`Test failed at ${patch.path}`);
      }
      break;
    }
  }

  return result;
}

function getAtPath(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      current = current[parseInt(key, 10)];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function parseJsonPointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer: ${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function escapeJsonPointer(str: string): string {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
