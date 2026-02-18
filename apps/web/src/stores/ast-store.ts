import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuid } from "uuid";
import type {
  ASTNode,
  ASTOperation,
  ASTOperationCreate,
  ASTOperationUpdate,
  ASTOperationDelete,
  ASTOperationMove,
  ASTOperationDuplicate,
  ASTSnapshot,
  JSONPatch,
} from "@staq/shared";

const MAX_HISTORY_SIZE = 50;

interface ASTState {
  ast: ASTNode | null;
  version: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  expandedNodeIds: Set<string>;
  history: ASTSnapshot[];
  historyIndex: number;
  pendingOperations: ASTOperation[];
  isGenerating: boolean;
  generationProgress: number;
  lastSyncedVersion: number;
  isDirty: boolean;
  error: string | null;
}

interface ASTActions {
  setAST: (ast: ASTNode | null) => void;
  applyOperation: (operation: ASTOperation) => void;
  applyOperations: (operations: ASTOperation[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  findNode: (nodeId: string) => ASTNode | null;
  findParentNode: (nodeId: string) => ASTNode | null;
  getNodePath: (nodeId: string) => string[];
  setGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  addPendingOperation: (operation: ASTOperation) => void;
  clearPendingOperations: () => void;
  markSynced: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type ASTStore = ASTState & ASTActions;

const initialState: ASTState = {
  ast: null,
  version: 0,
  selectedNodeId: null,
  hoveredNodeId: null,
  expandedNodeIds: new Set(),
  history: [],
  historyIndex: -1,
  pendingOperations: [],
  isGenerating: false,
  generationProgress: 0,
  lastSyncedVersion: 0,
  isDirty: false,
  error: null,
};

function createEmptyRootNode(): ASTNode {
  return {
    id: uuid(),
    type: "root",
    name: "App",
    props: {},
    style: {},
    children: [],
    meta: {
      source: "agent",
      created_at: new Date().toISOString(),
      version: 1,
    },
  };
}

function cloneNode(node: ASTNode): ASTNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
    props: { ...node.props },
    style: { ...node.style },
    meta: { ...node.meta },
  };
}

function findNodeInTree(root: ASTNode, nodeId: string): ASTNode | null {
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findNodeInTree(child, nodeId);
    if (found) return found;
  }
  return null;
}

function findParentInTree(root: ASTNode, nodeId: string): ASTNode | null {
  for (const child of root.children) {
    if (child.id === nodeId) return root;
    const found = findParentInTree(child, nodeId);
    if (found) return found;
  }
  return null;
}

function getAllNodeIds(node: ASTNode): string[] {
  const ids = [node.id];
  for (const child of node.children) {
    ids.push(...getAllNodeIds(child));
  }
  return ids;
}

function getNodePathInTree(root: ASTNode, nodeId: string, path: string[] = []): string[] | null {
  if (root.id === nodeId) return [...path, root.name];
  for (const child of root.children) {
    const found = getNodePathInTree(child, nodeId, [...path, root.name]);
    if (found) return found;
  }
  return null;
}

function applyCreateOperation(ast: ASTNode, operation: ASTOperationCreate): ASTNode {
  const parent = findNodeInTree(ast, operation.parent_id);
  if (!parent) return ast;

  const newNode: ASTNode = {
    id: uuid(),
    type: operation.node.type,
    component_type: operation.node.component_type,
    navigator_type: operation.node.navigator_type,
    name: operation.node.name,
    props: operation.node.props || {},
    style: operation.node.style || {},
    children: operation.node.children || [],
    meta: {
      ...operation.node.meta,
      created_at: new Date().toISOString(),
      version: 1,
    },
  };

  const index = operation.index ?? parent.children.length;
  parent.children.splice(index, 0, newNode);

  return ast;
}

function applyUpdateOperation(ast: ASTNode, operation: ASTOperationUpdate): ASTNode {
  const node = findNodeInTree(ast, operation.node_id);
  if (!node) return ast;

  if (operation.updates.type !== undefined) node.type = operation.updates.type;
  if (operation.updates.component_type !== undefined) node.component_type = operation.updates.component_type;
  if (operation.updates.navigator_type !== undefined) node.navigator_type = operation.updates.navigator_type;
  if (operation.updates.name !== undefined) node.name = operation.updates.name;
  if (operation.updates.props !== undefined) node.props = { ...node.props, ...operation.updates.props };
  if (operation.updates.style !== undefined) node.style = { ...node.style, ...operation.updates.style };
  if (operation.updates.meta !== undefined) node.meta = { ...node.meta, ...operation.updates.meta };

  node.meta.updated_at = new Date().toISOString();
  node.meta.version = (node.meta.version || 0) + 1;

  return ast;
}

function applyDeleteOperation(ast: ASTNode, operation: ASTOperationDelete): ASTNode {
  const parent = findParentInTree(ast, operation.node_id);
  if (!parent) return ast;

  parent.children = parent.children.filter((child) => child.id !== operation.node_id);

  return ast;
}

function applyMoveOperation(ast: ASTNode, operation: ASTOperationMove): ASTNode {
  const node = findNodeInTree(ast, operation.node_id);
  const oldParent = findParentInTree(ast, operation.node_id);
  const newParent = findNodeInTree(ast, operation.new_parent_id);

  if (!node || !oldParent || !newParent) return ast;

  oldParent.children = oldParent.children.filter((child) => child.id !== operation.node_id);

  const index = operation.index ?? newParent.children.length;
  newParent.children.splice(index, 0, node);

  return ast;
}

function applyDuplicateOperation(ast: ASTNode, operation: ASTOperationDuplicate): ASTNode {
  const node = findNodeInTree(ast, operation.node_id);
  const parent = operation.new_parent_id
    ? findNodeInTree(ast, operation.new_parent_id)
    : findParentInTree(ast, operation.node_id);

  if (!node || !parent) return ast;

  const duplicatedNode = cloneNode(node);
  duplicatedNode.id = uuid();
  duplicatedNode.name = `${node.name}_copy`;
  duplicatedNode.meta.created_at = new Date().toISOString();
  duplicatedNode.meta.version = 1;

  const assignNewIds = (n: ASTNode): void => {
    n.id = uuid();
    n.children.forEach(assignNewIds);
  };
  duplicatedNode.children.forEach(assignNewIds);

  parent.children.push(duplicatedNode);

  return ast;
}

function applyOperationToAST(ast: ASTNode, operation: ASTOperation): ASTNode {
  const cloned = cloneNode(ast);

  switch (operation.type) {
    case "create":
      return applyCreateOperation(cloned, operation);
    case "update":
      return applyUpdateOperation(cloned, operation);
    case "delete":
      return applyDeleteOperation(cloned, operation);
    case "move":
      return applyMoveOperation(cloned, operation);
    case "duplicate":
      return applyDuplicateOperation(cloned, operation);
    default:
      return cloned;
  }
}

export const useASTStore = create<ASTStore>()(
  immer((set, get) => ({
    ...initialState,

    setAST: (ast) =>
      set((state) => {
        state.ast = ast;
        state.version = ast ? 1 : 0;
        state.isDirty = false;

        if (ast) {
          state.history = [
            {
              ast: cloneNode(ast),
              version: 1,
              timestamp: new Date().toISOString(),
            },
          ];
          state.historyIndex = 0;
        } else {
          state.history = [];
          state.historyIndex = -1;
        }
      }),

    applyOperation: (operation) =>
      set((state) => {
        if (!state.ast) {
          state.ast = createEmptyRootNode();
        }

        const newAST = applyOperationToAST(state.ast, operation);
        state.ast = newAST;
        state.version += 1;
        state.isDirty = true;

        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }

        const snapshot: ASTSnapshot = {
          ast: cloneNode(newAST),
          version: state.version,
          timestamp: new Date().toISOString(),
        };

        state.history.push(snapshot);

        if (state.history.length > MAX_HISTORY_SIZE) {
          state.history = state.history.slice(-MAX_HISTORY_SIZE);
        }

        state.historyIndex = state.history.length - 1;
      }),

    applyOperations: (operations) =>
      set((state) => {
        if (!state.ast) {
          state.ast = createEmptyRootNode();
        }

        let currentAST = state.ast;
        for (const operation of operations) {
          currentAST = applyOperationToAST(currentAST, operation);
        }

        state.ast = currentAST;
        state.version += 1;
        state.isDirty = true;

        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }

        const snapshot: ASTSnapshot = {
          ast: cloneNode(currentAST),
          version: state.version,
          timestamp: new Date().toISOString(),
        };

        state.history.push(snapshot);

        if (state.history.length > MAX_HISTORY_SIZE) {
          state.history = state.history.slice(-MAX_HISTORY_SIZE);
        }

        state.historyIndex = state.history.length - 1;
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          const snapshot = state.history[state.historyIndex];
          if (snapshot) {
            state.ast = cloneNode(snapshot.ast);
            state.version = snapshot.version;
            state.isDirty = true;
          }
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          const snapshot = state.history[state.historyIndex];
          if (snapshot) {
            state.ast = cloneNode(snapshot.ast);
            state.version = snapshot.version;
            state.isDirty = true;
          }
        }
      }),

    canUndo: () => {
      const { historyIndex } = get();
      return historyIndex > 0;
    },

    canRedo: () => {
      const { historyIndex, history } = get();
      return historyIndex < history.length - 1;
    },

    selectNode: (nodeId) =>
      set((state) => {
        state.selectedNodeId = nodeId;
      }),

    hoverNode: (nodeId) =>
      set((state) => {
        state.hoveredNodeId = nodeId;
      }),

    toggleNodeExpanded: (nodeId) =>
      set((state) => {
        if (state.expandedNodeIds.has(nodeId)) {
          state.expandedNodeIds.delete(nodeId);
        } else {
          state.expandedNodeIds.add(nodeId);
        }
      }),

    expandNode: (nodeId) =>
      set((state) => {
        state.expandedNodeIds.add(nodeId);
      }),

    collapseNode: (nodeId) =>
      set((state) => {
        state.expandedNodeIds.delete(nodeId);
      }),

    expandAll: () =>
      set((state) => {
        if (state.ast) {
          const allIds = getAllNodeIds(state.ast);
          state.expandedNodeIds = new Set(allIds);
        }
      }),

    collapseAll: () =>
      set((state) => {
        state.expandedNodeIds = new Set();
      }),

    findNode: (nodeId) => {
      const { ast } = get();
      if (!ast) return null;
      return findNodeInTree(ast, nodeId);
    },

    findParentNode: (nodeId) => {
      const { ast } = get();
      if (!ast) return null;
      return findParentInTree(ast, nodeId);
    },

    getNodePath: (nodeId) => {
      const { ast } = get();
      if (!ast) return [];
      return getNodePathInTree(ast, nodeId) || [];
    },

    setGenerating: (generating) =>
      set((state) => {
        state.isGenerating = generating;
        if (!generating) {
          state.generationProgress = 0;
        }
      }),

    setGenerationProgress: (progress) =>
      set((state) => {
        state.generationProgress = progress;
      }),

    addPendingOperation: (operation) =>
      set((state) => {
        state.pendingOperations.push(operation);
      }),

    clearPendingOperations: () =>
      set((state) => {
        state.pendingOperations = [];
      }),

    markSynced: () =>
      set((state) => {
        state.lastSyncedVersion = state.version;
        state.isDirty = false;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    reset: () => set(initialState),
  }))
);

export type {
  ASTNode,
  ASTOperation,
  ASTOperationCreate,
  ASTOperationUpdate,
  ASTOperationDelete,
  ASTOperationMove,
  ASTOperationDuplicate,
  ASTSnapshot,
  JSONPatch,
};
