import { describe, it, expect, beforeEach } from "vitest";
import { ResponseParser, parseResponse, extractCodeBlocks } from "../response-parser";

describe("ResponseParser", () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  describe("parse", () => {
    it("should extract a single code block", () => {
      const content = `Here's a component:

\`\`\`tsx filename="components/Button.tsx"
export function Button() {
  return <button>Click me</button>;
}
\`\`\`

That's all!`;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0]?.language).toBe("tsx");
      expect(result.codeBlocks[0]?.filename).toBe("components/Button.tsx");
      expect(result.codeBlocks[0]?.content).toContain("export function Button");
    });

    it("should extract multiple code blocks", () => {
      const content = `First file:

\`\`\`tsx filename="screens/HomeScreen.tsx"
export function HomeScreen() {
  return <View />;
}
\`\`\`

Second file:

\`\`\`tsx filename="screens/ProfileScreen.tsx"
export function ProfileScreen() {
  return <View />;
}
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0]?.filename).toBe("screens/HomeScreen.tsx");
      expect(result.codeBlocks[1]?.filename).toBe("screens/ProfileScreen.tsx");
    });

    it("should extract text without code blocks", () => {
      const content = `Here's some explanation:

\`\`\`tsx filename="test.tsx"
const x = 1;
\`\`\`

And more text here.`;

      const result = parser.parse(content);

      expect(result.text).toContain("Here's some explanation:");
      expect(result.text).toContain("And more text here.");
      expect(result.text).not.toContain("const x = 1");
    });

    it("should handle code blocks without filename attribute", () => {
      const content = `\`\`\`tsx
// filename: components/Test.tsx
export function Test() {}
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0]?.filename).toBe("components/Test.tsx");
    });

    it("should infer filename from component name", () => {
      const content = `\`\`\`tsx
export function LoginScreen() {
  return <View />;
}
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0]?.filename).toBe("screens/LoginScreen.tsx");
    });

    it("should infer component filename for non-screen components", () => {
      const content = `\`\`\`tsx
export function Button() {
  return <TouchableOpacity />;
}
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks[0]?.filename).toBe("components/Button.tsx");
    });

    it("should handle empty code blocks", () => {
      const content = `\`\`\`tsx filename="empty.tsx"
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0]?.content).toBe("");
    });

    it("should handle code blocks with only language", () => {
      const content = `\`\`\`json
{"key": "value"}
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0]?.language).toBe("json");
      expect(result.codeBlocks[0]?.filename).toBeNull();
    });
  });

  describe("inferASTOperations", () => {
    it("should create 'create' operation for new files with imports", () => {
      const content = `\`\`\`tsx filename="new-file.tsx"
import React from "react";

export function NewComponent() {
  return <div />;
}
\`\`\``;

      const result = parser.parse(content);

      expect(result.astOperations).toHaveLength(1);
      expect(result.astOperations[0]?.type).toBe("create");
      expect(result.astOperations[0]?.targetPath).toBe("new-file.tsx");
    });

    it("should skip operations for blocks without filename", () => {
      const content = `\`\`\`json
{"key": "value"}
\`\`\``;

      const result = parser.parse(content);

      expect(result.astOperations).toHaveLength(0);
    });
  });

  describe("appendChunk (streaming)", () => {
    it("should accumulate chunks in buffer", () => {
      parser.appendChunk("Hello ");
      parser.appendChunk("world");

      expect(parser.getBuffer()).toBe("Hello world");
    });

    it("should detect complete code blocks during streaming", () => {
      parser.appendChunk("Some text\n\n```tsx filename=\"test.tsx\"\n");
      parser.appendChunk("const x = 1;\n");
      parser.appendChunk("```");

      const parsed = parser.parse(parser.getBuffer());
      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.codeBlocks[0]?.filename).toBe("test.tsx");
    });

    it("should report partial blocks during streaming", () => {
      const result = parser.appendChunk("```tsx\nconst x = 1;");

      expect(result.partialBlock).toContain("```tsx");
      expect(result.newBlocks).toHaveLength(0);
    });

    it("should reset buffer correctly", () => {
      parser.appendChunk("some content");
      parser.reset();

      expect(parser.getBuffer()).toBe("");
    });
  });

  describe("edge cases", () => {
    it("should handle nested code blocks in markdown", () => {
      const content = `Here's how to use it:

\`\`\`tsx filename="example.tsx"
const markdown = \`
Some text
\`;
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
    });

    it("should handle code blocks with special characters", () => {
      const content = `\`\`\`tsx filename="special.tsx"
const regex = /test\\.tsx$/;
const template = \`\${variable}\`;
\`\`\``;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0]?.content).toContain("regex");
    });

    it("should handle malformed response gracefully", () => {
      const content = "Just plain text without any code";

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(0);
      expect(result.text).toBe(content);
      expect(result.astOperations).toHaveLength(0);
    });

    it("should handle response with unclosed code block", () => {
      const content = `Here's some code:
\`\`\`tsx
const x = 1;
// No closing fence`;

      const result = parser.parse(content);

      expect(result.codeBlocks).toHaveLength(0);
    });
  });
});

describe("parseResponse helper", () => {
  it("should parse response correctly", () => {
    const content = `\`\`\`tsx filename="test.tsx"
export const x = 1;
\`\`\``;

    const result = parseResponse(content);

    expect(result.codeBlocks).toHaveLength(1);
  });
});

describe("extractCodeBlocks helper", () => {
  it("should extract code blocks correctly", () => {
    const content = `\`\`\`tsx filename="test.tsx"
export const x = 1;
\`\`\``;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.filename).toBe("test.tsx");
  });
});
