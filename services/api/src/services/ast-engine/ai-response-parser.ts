import type {
  ASTNode,
  ASTOperation,
  ASTOperationCreate,
  ASTOperationUpdate,
  ASTOperationDelete,
  ASTOperationMove,
  ASTOperationDuplicate,
} from "@staq/shared";
import { parseSourceCode, type ParseError } from "./parser";

export interface AIResponseParseResult {
  operations: ASTOperation[];
  parsedNodes: ASTNode[];
  errors: ParseError[];
  warnings: string[];
}

export interface CodeBlock {
  language: string;
  filename: string | null;
  content: string;
}

export interface AIOperationHint {
  type: ASTOperation["type"];
  targetId?: string;
  targetPath?: string;
  parentId?: string;
  index?: number;
  newParentId?: string;
}

const CODE_BLOCK_REGEX = /```(\w+)?(?:\s+filename="([^"]+)")?\n([\s\S]*?)```/g;
const OPERATION_HINT_REGEX = /<!--\s*ast-operation:\s*(\{[\s\S]*?\})\s*-->/g;
const JSON_OPERATION_BLOCK_REGEX = /```json\s*(?:ast-operations?)?\n([\s\S]*?)```/g;

export function parseAIResponse(
  content: string,
  existingAST?: ASTNode
): AIResponseParseResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const operations: ASTOperation[] = [];
  const parsedNodes: ASTNode[] = [];

  if (!content || content.trim().length === 0) {
    errors.push({
      message: "Empty AI response",
      code: "EMPTY_RESPONSE",
    });
    return { operations, parsedNodes, errors, warnings };
  }

  const jsonOperations = extractJSONOperations(content);
  if (jsonOperations.length > 0) {
    const validated = validateOperations(jsonOperations, existingAST);
    operations.push(...validated.valid);
    errors.push(...validated.errors);
    warnings.push(...validated.warnings);
  }

  const hintOperations = extractOperationHints(content);
  const codeBlocks = extractCodeBlocks(content);

  for (const block of codeBlocks) {
    if (!isReactNativeCode(block)) {
      continue;
    }

    const parseResult = parseSourceCode(block.content);
    errors.push(...parseResult.errors);
    warnings.push(...parseResult.warnings);

    if (parseResult.ast) {
      const allNodes = [...parseResult.screens, ...parseResult.components];
      parsedNodes.push(...allNodes);

      const hint = findHintForBlock(block, hintOperations);
      const inferredOps = inferOperationsFromParsedNodes(
        allNodes,
        hint,
        existingAST,
        block.filename
      );
      operations.push(...inferredOps);
    }
  }

  return { operations, parsedNodes, errors, warnings };
}

function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = new RegExp(CODE_BLOCK_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const [, language = "text", filename, code = ""] = match;

    let resolvedFilename = filename || null;
    if (!resolvedFilename) {
      resolvedFilename = inferFilename(language, code);
    }

    if (code.trim()) {
      blocks.push({
        language: language || "text",
        filename: resolvedFilename,
        content: code.trim(),
      });
    }
  }

  return blocks;
}

function extractJSONOperations(content: string): Partial<ASTOperation>[] {
  const operations: Partial<ASTOperation>[] = [];
  const regex = new RegExp(JSON_OPERATION_BLOCK_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const jsonContent = match[1]?.trim();
    if (jsonContent) {
      try {
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed)) {
          operations.push(...parsed);
        } else if (parsed && typeof parsed === "object") {
          operations.push(parsed);
        }
      } catch {
        continue;
      }
    }
  }

  return operations;
}

function extractOperationHints(content: string): AIOperationHint[] {
  const hints: AIOperationHint[] = [];
  const regex = new RegExp(OPERATION_HINT_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const jsonContent = match[1];
    if (jsonContent) {
      try {
        const hint = JSON.parse(jsonContent) as AIOperationHint;
        if (hint.type) {
          hints.push(hint);
        }
      } catch {
        continue;
      }
    }
  }

  return hints;
}

function validateOperations(
  operations: Partial<ASTOperation>[],
  existingAST?: ASTNode
): { valid: ASTOperation[]; errors: ParseError[]; warnings: string[] } {
  const valid: ASTOperation[] = [];
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  for (const op of operations) {
    if (!op.type) {
      errors.push({
        message: "Operation missing required 'type' field",
        code: "INVALID_OPERATION",
      });
      continue;
    }

    switch (op.type) {
      case "create": {
        const createOp = op as Partial<ASTOperationCreate>;
        if (!createOp.parent_id) {
          errors.push({
            message: "Create operation missing 'parent_id'",
            code: "INVALID_CREATE_OP",
          });
          continue;
        }
        if (!createOp.node) {
          errors.push({
            message: "Create operation missing 'node'",
            code: "INVALID_CREATE_OP",
          });
          continue;
        }
        valid.push(createOp as ASTOperationCreate);
        break;
      }
      case "update": {
        const updateOp = op as Partial<ASTOperationUpdate>;
        if (!updateOp.node_id) {
          errors.push({
            message: "Update operation missing 'node_id'",
            code: "INVALID_UPDATE_OP",
          });
          continue;
        }
        if (!updateOp.updates) {
          errors.push({
            message: "Update operation missing 'updates'",
            code: "INVALID_UPDATE_OP",
          });
          continue;
        }
        if (existingAST && !findNodeById(existingAST, updateOp.node_id)) {
          warnings.push(`Update target node not found: ${updateOp.node_id}`);
        }
        valid.push(updateOp as ASTOperationUpdate);
        break;
      }
      case "delete": {
        const deleteOp = op as Partial<ASTOperationDelete>;
        if (!deleteOp.node_id) {
          errors.push({
            message: "Delete operation missing 'node_id'",
            code: "INVALID_DELETE_OP",
          });
          continue;
        }
        if (existingAST && !findNodeById(existingAST, deleteOp.node_id)) {
          warnings.push(`Delete target node not found: ${deleteOp.node_id}`);
        }
        valid.push(deleteOp as ASTOperationDelete);
        break;
      }
      case "move": {
        const moveOp = op as Partial<ASTOperationMove>;
        if (!moveOp.node_id) {
          errors.push({
            message: "Move operation missing 'node_id'",
            code: "INVALID_MOVE_OP",
          });
          continue;
        }
        if (!moveOp.new_parent_id) {
          errors.push({
            message: "Move operation missing 'new_parent_id'",
            code: "INVALID_MOVE_OP",
          });
          continue;
        }
        valid.push(moveOp as ASTOperationMove);
        break;
      }
      case "duplicate": {
        const dupOp = op as Partial<ASTOperationDuplicate>;
        if (!dupOp.node_id) {
          errors.push({
            message: "Duplicate operation missing 'node_id'",
            code: "INVALID_DUPLICATE_OP",
          });
          continue;
        }
        valid.push(dupOp as ASTOperationDuplicate);
        break;
      }
      default:
        errors.push({
          message: `Unknown operation type: ${(op as { type: string }).type}`,
          code: "UNKNOWN_OPERATION",
        });
    }
  }

  return { valid, errors, warnings };
}

function findNodeById(ast: ASTNode, nodeId: string): ASTNode | null {
  if (ast.id === nodeId) return ast;
  for (const child of ast.children) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }
  return null;
}

function isReactNativeCode(block: CodeBlock): boolean {
  const lang = block.language.toLowerCase();
  if (!["tsx", "jsx", "ts", "js", "typescript", "javascript"].includes(lang)) {
    return false;
  }

  const hasReactImport = /import.*from\s+['"]react['"]/.test(block.content);
  const hasRNImport = /import.*from\s+['"]react-native['"]/.test(block.content);
  const hasExpoImport = /import.*from\s+['"]expo/.test(block.content);
  const hasJSX = /<\w+[^>]*>/.test(block.content);

  return hasRNImport || hasExpoImport || (hasReactImport && hasJSX);
}

function inferFilename(language: string, code: string): string | null {
  const filenameComment = code.match(/^\/\/\s*(?:filename|path):\s*(.+)$/m);
  if (filenameComment?.[1]) {
    return filenameComment[1].trim();
  }

  const ext = getExtensionForLanguage(language);
  const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/);

  if (componentMatch?.[1]) {
    const name = componentMatch[1];
    if (name.endsWith("Screen")) {
      return `screens/${name}${ext}`;
    }
    if (/^[A-Z]/.test(name)) {
      return `components/${name}${ext}`;
    }
  }

  return null;
}

function getExtensionForLanguage(language: string): string {
  const langMap: Record<string, string> = {
    tsx: ".tsx",
    typescript: ".tsx",
    ts: ".ts",
    jsx: ".jsx",
    javascript: ".js",
    js: ".js",
  };
  return langMap[language.toLowerCase()] || ".tsx";
}

function findHintForBlock(
  block: CodeBlock,
  hints: AIOperationHint[]
): AIOperationHint | undefined {
  if (hints.length === 0) return undefined;

  if (block.filename) {
    const matchingHint = hints.find((h) => h.targetPath === block.filename);
    if (matchingHint) return matchingHint;
  }

  return hints[0];
}

function inferOperationsFromParsedNodes(
  nodes: ASTNode[],
  hint: AIOperationHint | undefined,
  existingAST: ASTNode | undefined,
  filename: string | null
): ASTOperation[] {
  const operations: ASTOperation[] = [];

  for (const node of nodes) {
    if (hint?.type === "update" && hint.targetId) {
      const updateOp: ASTOperationUpdate = {
        type: "update",
        node_id: hint.targetId,
        updates: {
          type: node.type,
          component_type: node.component_type,
          name: node.name,
          props: node.props,
          style: node.style,
          meta: node.meta,
        },
      };
      operations.push(updateOp);
    } else if (hint?.type === "delete" && hint.targetId) {
      const deleteOp: ASTOperationDelete = {
        type: "delete",
        node_id: hint.targetId,
      };
      operations.push(deleteOp);
    } else if (hint?.type === "move" && hint.targetId && hint.newParentId) {
      const moveOp: ASTOperationMove = {
        type: "move",
        node_id: hint.targetId,
        new_parent_id: hint.newParentId,
        index: hint.index,
      };
      operations.push(moveOp);
    } else {
      const parentId = hint?.parentId || existingAST?.id || "root";
      const createOp: ASTOperationCreate = {
        type: "create",
        parent_id: parentId,
        index: hint?.index,
        node: {
          type: node.type,
          component_type: node.component_type,
          name: node.name,
          props: node.props,
          style: node.style,
          meta: {
            ...node.meta,
            description: filename ? `Parsed from ${filename}` : undefined,
          },
        },
      };
      operations.push(createOp);
    }
  }

  return operations;
}

export function parseCodeBlocksOnly(content: string): CodeBlock[] {
  return extractCodeBlocks(content);
}

export function validateASTOperations(
  operations: unknown[],
  existingAST?: ASTNode
): { valid: ASTOperation[]; errors: ParseError[]; warnings: string[] } {
  return validateOperations(operations as Partial<ASTOperation>[], existingAST);
}
