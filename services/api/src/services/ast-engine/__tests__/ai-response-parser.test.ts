import { describe, it, expect } from "vitest";
import {
  parseAIResponse,
  parseCodeBlocksOnly,
  validateASTOperations,
} from "../ai-response-parser";
import type { ASTNode } from "@raygan/shared";

describe("parseAIResponse", () => {
  describe("code block extraction", () => {
    it("should extract React Native code blocks", () => {
      const content = `
Here's a new screen component:

\`\`\`tsx filename="screens/HomeScreen.tsx"
import React from "react";
import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View>
      <Text>Welcome Home</Text>
    </View>
  );
}
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.errors).toHaveLength(0);
      expect(result.parsedNodes).toHaveLength(1);
      expect(result.parsedNodes[0]?.name).toBe("HomeScreen");
    });

    it("should extract multiple code blocks", () => {
      const content = `
First, let's create a header:

\`\`\`tsx filename="components/Header.tsx"
import React from "react";
import { View, Text } from "react-native";

export function Header() {
  return <View><Text>Header</Text></View>;
}
\`\`\`

And a footer:

\`\`\`tsx filename="components/Footer.tsx"
import React from "react";
import { View, Text } from "react-native";

export function Footer() {
  return <View><Text>Footer</Text></View>;
}
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.errors).toHaveLength(0);
      expect(result.parsedNodes).toHaveLength(2);
    });

    it("should skip non-React Native code blocks", () => {
      const content = `
Here's some JSON config:

\`\`\`json
{"key": "value"}
\`\`\`

And a bash command:

\`\`\`bash
npm install
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.parsedNodes).toHaveLength(0);
      expect(result.operations).toHaveLength(0);
    });

    it("should handle empty response", () => {
      const result = parseAIResponse("");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe("EMPTY_RESPONSE");
    });
  });

  describe("JSON operation extraction", () => {
    it("should extract JSON AST operations", () => {
      const content = `
I'll update the component with these operations:

\`\`\`json ast-operations
[
  {
    "type": "update",
    "node_id": "node-123",
    "updates": {
      "props": { "title": "New Title" }
    }
  }
]
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe("update");
    });

    it("should validate operation structure", () => {
      const content = `
\`\`\`json ast-operations
[
  {
    "type": "update"
  }
]
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.errors.some(e => e.code === "INVALID_UPDATE_OP")).toBe(true);
    });
  });

  describe("operation inference", () => {
    it("should infer create operations for new components", () => {
      const content = `
\`\`\`tsx filename="components/NewButton.tsx"
import React from "react";
import { TouchableOpacity, Text } from "react-native";

export function NewButton() {
  return <TouchableOpacity><Text>Click</Text></TouchableOpacity>;
}
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe("create");
    });

    it("should use existing AST root as parent", () => {
      const existingAST: ASTNode = {
        id: "existing-root",
        type: "root",
        name: "root",
        props: {},
        style: {},
        children: [],
        meta: {},
      };

      const content = `
\`\`\`tsx
import React from "react";
import { View } from "react-native";

export function NewComponent() {
  return <View />;
}
\`\`\`
      `;

      const result = parseAIResponse(content, existingAST);

      expect(result.operations).toHaveLength(1);
      if (result.operations[0]?.type === "create") {
        expect(result.operations[0].parent_id).toBe("existing-root");
      }
    });
  });

  describe("operation hints", () => {
    it("should respect operation hints in HTML comments", () => {
      const content = `
<!-- ast-operation: {"type": "update", "targetId": "node-456"} -->

\`\`\`tsx
import React from "react";
import { View, Text } from "react-native";

export function UpdatedComponent() {
  return <View><Text>Updated</Text></View>;
}
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe("update");
      if (result.operations[0]?.type === "update") {
        expect(result.operations[0].node_id).toBe("node-456");
      }
    });

    it("should handle delete hints", () => {
      const content = `
<!-- ast-operation: {"type": "delete", "targetId": "node-to-delete"} -->

\`\`\`tsx
import React from "react";
import { View } from "react-native";

export function Placeholder() {
  return <View />;
}
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe("delete");
    });

    it("should handle move hints", () => {
      const content = `
<!-- ast-operation: {"type": "move", "targetId": "node-123", "newParentId": "parent-456", "index": 2} -->

\`\`\`tsx
import React from "react";
import { View } from "react-native";

export function MovedComponent() {
  return <View />;
}
\`\`\`
      `;

      const result = parseAIResponse(content);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.type).toBe("move");
      if (result.operations[0]?.type === "move") {
        expect(result.operations[0].new_parent_id).toBe("parent-456");
        expect(result.operations[0].index).toBe(2);
      }
    });
  });
});

describe("parseCodeBlocksOnly", () => {
  it("should extract code blocks without parsing", () => {
    const content = `
\`\`\`tsx filename="test.tsx"
const x = 1;
\`\`\`

\`\`\`json
{"key": "value"}
\`\`\`
    `;

    const blocks = parseCodeBlocksOnly(content);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.filename).toBe("test.tsx");
    expect(blocks[1]?.language).toBe("json");
  });

  it("should infer filename from component name", () => {
    const content = `
\`\`\`tsx
import React from "react";
import { View } from "react-native";

export function ProfileScreen() {
  return <View />;
}
\`\`\`
    `;

    const blocks = parseCodeBlocksOnly(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.filename).toBe("screens/ProfileScreen.tsx");
  });

  it("should infer component filename for non-screens", () => {
    const content = `
\`\`\`tsx
import React from "react";
import { View } from "react-native";

export function Avatar() {
  return <View />;
}
\`\`\`
    `;

    const blocks = parseCodeBlocksOnly(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.filename).toBe("components/Avatar.tsx");
  });
});

describe("validateASTOperations", () => {
  it("should validate create operations", () => {
    const operations = [
      {
        type: "create",
        parent_id: "parent-1",
        node: {
          type: "component",
          name: "Test",
          props: {},
          style: {},
          meta: {},
        },
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject create without parent_id", () => {
    const operations = [
      {
        type: "create",
        node: { type: "component", name: "Test" },
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(0);
    expect(result.errors.some(e => e.code === "INVALID_CREATE_OP")).toBe(true);
  });

  it("should validate update operations", () => {
    const operations = [
      {
        type: "update",
        node_id: "node-123",
        updates: { name: "NewName" },
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject update without node_id", () => {
    const operations = [
      {
        type: "update",
        updates: { name: "NewName" },
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(0);
    expect(result.errors.some(e => e.code === "INVALID_UPDATE_OP")).toBe(true);
  });

  it("should validate delete operations", () => {
    const operations = [
      {
        type: "delete",
        node_id: "node-to-delete",
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate move operations", () => {
    const operations = [
      {
        type: "move",
        node_id: "node-123",
        new_parent_id: "parent-456",
        index: 0,
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate duplicate operations", () => {
    const operations = [
      {
        type: "duplicate",
        node_id: "node-to-dup",
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject unknown operation types", () => {
    const operations = [
      {
        type: "invalid_type",
        node_id: "123",
      },
    ];

    const result = validateASTOperations(operations);

    expect(result.valid).toHaveLength(0);
    expect(result.errors.some(e => e.code === "UNKNOWN_OPERATION")).toBe(true);
  });

  it("should warn when target node not found in existing AST", () => {
    const existingAST: ASTNode = {
      id: "root",
      type: "root",
      name: "root",
      props: {},
      style: {},
      children: [],
      meta: {},
    };

    const operations = [
      {
        type: "update",
        node_id: "non-existent-node",
        updates: { name: "Test" },
      },
    ];

    const result = validateASTOperations(operations, existingAST);

    expect(result.valid).toHaveLength(1);
    expect(result.warnings.some(w => w.includes("not found"))).toBe(true);
  });
});
