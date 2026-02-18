export {
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
} from "./ast";

export { generatePatches, applyPatches } from "./differ";

export { validateAST, isValidAST } from "./validator";

export {
  serialize,
  DependencyTracker,
  ImportManager,
  StyleManager,
  type SerializerConfig,
  type SerializerOutput,
  type Framework,
} from "./serializer";

export { createAdapter } from "./adapters";
export type { FrameworkAdapter, ComponentImport, SerializerContext } from "./types";
