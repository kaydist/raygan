export interface ParsedResponse {
  text: string;
  codeBlocks: CodeBlock[];
  astOperations: ASTOperation[];
  warnings: string[];
}

export interface CodeBlock {
  language: string;
  filename: string | null;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface ASTOperation {
  type: "create" | "update" | "delete" | "move";
  targetPath: string;
  content?: string;
  newPath?: string;
}

const CODE_BLOCK_REGEX = /```(\w+)?(?:\s+filename="([^"]+)")?\n([\s\S]*?)```/g;
const FILENAME_IN_COMMENT_REGEX = /^\/\/\s*(?:file(?:name)?|path):\s*(.+)$/m;

const MAX_FILE_SIZE = 100 * 1024;
const VALID_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md", ".html"];

export class ResponseParser {
  private buffer: string = "";
  private parsedBlocks: CodeBlock[] = [];
  private warnings: string[] = [];

  parse(content: string): ParsedResponse {
    this.warnings = [];

    if (!content || content.trim().length === 0) {
      this.warnings.push("Empty content received from AI");
      return { text: "", codeBlocks: [], astOperations: [], warnings: this.warnings };
    }

    const codeBlocks = this.extractCodeBlocks(content);
    const validatedBlocks = this.validateCodeBlocks(codeBlocks);
    const text = this.extractText(content, codeBlocks);
    const astOperations = this.inferASTOperations(validatedBlocks);

    return { text, codeBlocks: validatedBlocks, astOperations, warnings: [...this.warnings] };
  }

  private validateCodeBlocks(blocks: CodeBlock[]): CodeBlock[] {
    return blocks.filter((block) => {
      if (!block.content || block.content.trim().length === 0) {
        this.warnings.push(`Empty code block skipped: ${block.filename || "unnamed"}`);
        return false;
      }

      if (block.content.length > MAX_FILE_SIZE) {
        this.warnings.push(`Code block too large (${block.content.length} bytes), truncating: ${block.filename}`);
        block.content = block.content.substring(0, MAX_FILE_SIZE);
      }

      if (block.filename) {
        const sanitized = this.sanitizeFilename(block.filename);
        if (sanitized !== block.filename) {
          this.warnings.push(`Filename sanitized: ${block.filename} -> ${sanitized}`);
          block.filename = sanitized;
        }

        if (!this.isValidFilename(block.filename)) {
          this.warnings.push(`Invalid filename skipped: ${block.filename}`);
          return false;
        }
      }

      if (!this.isValidCode(block.content, block.language)) {
        this.warnings.push(`Potentially malformed code in: ${block.filename || "unnamed"}`);
      }

      return true;
    });
  }

  private sanitizeFilename(filename: string): string {
    let sanitized = filename
      .replace(/\.\./g, "")
      .replace(/^\/+/, "")
      .replace(/[<>:"|?*]/g, "")
      .trim();

    if (sanitized.startsWith("src/")) {
      sanitized = sanitized.slice(4);
    }

    return sanitized;
  }

  private isValidFilename(filename: string): boolean {
    if (!filename || filename.length === 0 || filename.length > 255) {
      return false;
    }

    if (filename.includes("..") || filename.startsWith("/")) {
      return false;
    }

    const hasValidExtension = VALID_EXTENSIONS.some((ext) => filename.endsWith(ext)) || !filename.includes(".");
    return hasValidExtension;
  }

  private isValidCode(content: string, language: string): boolean {
    if (["tsx", "ts", "jsx", "js", "typescript", "javascript"].includes(language.toLowerCase())) {
      const hasBasicStructure =
        content.includes("import") ||
        content.includes("export") ||
        content.includes("function") ||
        content.includes("const") ||
        content.includes("class");

      const balancedBraces = this.checkBalancedBraces(content);

      return hasBasicStructure && balancedBraces;
    }
    return true;
  }

  private checkBalancedBraces(content: string): boolean {
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;

    for (const char of content) {
      switch (char) {
        case "{": braceCount++; break;
        case "}": braceCount--; break;
        case "(": parenCount++; break;
        case ")": parenCount--; break;
        case "[": bracketCount++; break;
        case "]": bracketCount--; break;
      }

      if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
        return false;
      }
    }

    return braceCount === 0 && parenCount === 0 && bracketCount === 0;
  }

  appendChunk(chunk: string): { newBlocks: CodeBlock[]; partialBlock: string | null } {
    this.buffer += chunk;

    const completeBlocks: CodeBlock[] = [];
    let partialBlock: string | null = null;

    const openIndex = this.buffer.lastIndexOf("```");
    if (openIndex !== -1) {
      const afterOpen = this.buffer.substring(openIndex);
      const closeMatch = afterOpen.match(/```[\s\S]*?```/);

      if (closeMatch) {
        const fullContent = this.buffer;
        const newBlocks = this.extractCodeBlocks(fullContent);

        for (const block of newBlocks) {
          const alreadyParsed = this.parsedBlocks.some(
            (b) => b.startIndex === block.startIndex && b.content === block.content
          );
          if (!alreadyParsed) {
            completeBlocks.push(block);
            this.parsedBlocks.push(block);
          }
        }
      } else {
        partialBlock = afterOpen;
      }
    }

    return { newBlocks: completeBlocks, partialBlock };
  }

  reset(): void {
    this.buffer = "";
    this.parsedBlocks = [];
    this.warnings = [];
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  getBuffer(): string {
    return this.buffer;
  }

  private extractCodeBlocks(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let match: RegExpExecArray | null;

    const regex = new RegExp(CODE_BLOCK_REGEX.source, "g");

    while ((match = regex.exec(content)) !== null) {
      const [fullMatch, language = "text", filename, code = ""] = match;

      let resolvedFilename = filename || null;

      if (!resolvedFilename && code) {
        const filenameMatch = code.match(FILENAME_IN_COMMENT_REGEX);
        if (filenameMatch?.[1]) {
          resolvedFilename = filenameMatch[1].trim();
        }
      }

      if (!resolvedFilename) {
        resolvedFilename = this.inferFilename(language, code);
      }

      blocks.push({
        language: language || "text",
        filename: resolvedFilename,
        content: code.trim(),
        startIndex: match.index,
        endIndex: match.index + fullMatch.length,
      });
    }

    return blocks;
  }

  private extractText(content: string, codeBlocks: CodeBlock[]): string {
    let text = content;

    const sortedBlocks = [...codeBlocks].sort((a, b) => b.startIndex - a.startIndex);
    for (const block of sortedBlocks) {
      text = text.substring(0, block.startIndex) + text.substring(block.endIndex);
    }

    return text
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private inferASTOperations(codeBlocks: CodeBlock[]): ASTOperation[] {
    const operations: ASTOperation[] = [];

    for (const block of codeBlocks) {
      if (!block.filename) continue;

      if (this.isNewFile(block)) {
        operations.push({
          type: "create",
          targetPath: block.filename,
          content: block.content,
        });
      } else {
        operations.push({
          type: "update",
          targetPath: block.filename,
          content: block.content,
        });
      }
    }

    return operations;
  }

  private inferFilename(language: string, code: string): string | null {
    const langToExt: Record<string, string> = {
      typescript: ".tsx",
      ts: ".ts",
      tsx: ".tsx",
      javascript: ".js",
      js: ".js",
      jsx: ".jsx",
      json: ".json",
      css: ".css",
      scss: ".scss",
      html: ".html",
      markdown: ".md",
      md: ".md",
      yaml: ".yaml",
      yml: ".yml",
    };

    const normalizedLang = language?.toLowerCase() || "javascript";
    const ext = langToExt[normalizedLang] || ".js";

    const isReactCode = ["tsx", "jsx", "javascript", "js", "typescript", "ts"].includes(normalizedLang);

    if (isReactCode) {
      const hasDefaultExport = /export\s+default\s+/.test(code);
      const hasAppComponent = /(?:function|const)\s+App\s*[=(]/.test(code);
      const hasReactImport = /import\s+.*\s+from\s+['"]react['"]/.test(code);
      const hasReactNativeImport = /import\s+.*\s+from\s+['"]react-native['"]/.test(code);

      if (hasAppComponent || (hasReactNativeImport && hasDefaultExport)) {
        return "App.js";
      }

      const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/);
      if (componentMatch?.[1]) {
        const name = componentMatch[1];

        if (name === "App") {
          return "App.js";
        }
        if (name.endsWith("Screen")) {
          return `screens/${name}${ext}`;
        }
        if (/^[A-Z]/.test(name)) {
          return `components/${name}${ext}`;
        }
      }

      // Fallback: if it has React imports and default export, assume it's App.js
      if ((hasReactImport || hasReactNativeImport) && hasDefaultExport) {
        return "App.js";
      }
    }

    return null;
  }

  private isNewFile(block: CodeBlock): boolean {
    if (!block.content) return false;

    const hasImports = block.content.includes("import ");
    const hasExport = block.content.includes("export ");
    const hasFullComponent = /(?:function|const)\s+\w+.*(?:=>|{)/s.test(block.content);

    return hasImports || (hasExport && hasFullComponent);
  }
}

export function parseResponse(content: string): ParsedResponse {
  const parser = new ResponseParser();
  return parser.parse(content);
}

export function extractCodeBlocks(content: string): CodeBlock[] {
  const parser = new ResponseParser();
  return parser.parse(content).codeBlocks;
}
