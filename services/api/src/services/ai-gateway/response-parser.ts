export interface ParsedResponse {
  text: string;
  codeBlocks: CodeBlock[];
  astOperations: ASTOperation[];
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

export class ResponseParser {
  private buffer: string = "";
  private parsedBlocks: CodeBlock[] = [];

  parse(content: string): ParsedResponse {
    const codeBlocks = this.extractCodeBlocks(content);
    const text = this.extractText(content, codeBlocks);
    const astOperations = this.inferASTOperations(codeBlocks);

    return { text, codeBlocks, astOperations };
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
      typescript: ".ts",
      tsx: ".tsx",
      javascript: ".js",
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

    const ext = langToExt[language];
    if (!ext) return null;

    if (language === "tsx" || language === "jsx") {
      const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/);
      if (componentMatch?.[1]) {
        const name = componentMatch[1];
        if (name.endsWith("Screen")) {
          return `screens/${name}.tsx`;
        }
        return `components/${name}.tsx`;
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
