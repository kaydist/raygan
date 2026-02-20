import { describe, it, expect, vi } from "vitest";

vi.mock("@/helpers", () => ({
  decryptKey: vi.fn((key: string) => key),
}));

vi.mock("../../../config", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    isDev: false,
    isProd: false,
    isTest: true,
    ENCRYPTION_KEY: "test-key-32-chars-exactly-here!",
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../../db", () => ({
  AppDataSource: {
    getRepository: vi.fn(() => ({
      update: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    })),
    isInitialized: true,
    createQueryRunner: vi.fn(() => ({
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: {
        save: vi.fn(),
      },
    })),
  },
  Project: class {},
  Conversation: class {},
  ProjectFile: class {},
  AIProvider: class {},
  AIModel: class {},
}));

import { PromptBuilder } from "../../ai-gateway/prompt-builder";
import { ResponseParser, parseResponse } from "../../ai-gateway/response-parser";

describe("Generation Flow Integration", () => {
  describe("PromptBuilder -> ResponseParser flow", () => {
    it("should build prompt and parse response correctly", () => {
      const builder = new PromptBuilder();

      builder.setProject({
        id: 1,
        uuid: "test-uuid",
        name: "Test App",
        organization_id: 1,
        framework: "expo",
        framework_version: "SDK 54",
        backend_provider: null,
        backend_config: null,
        file_tree: null,
        default_model_id: null,
        meta: null,
        created_on: new Date(),
        created_by: 1,
        updated_on: new Date(),
        updated_by: null,
        deleted_flag: false,
        deleted_on: null,
        deleted_by: null,
      } as any);

      const prompt = builder.build("Create a todo app");

      expect(prompt.system).toContain("Staq AI");
      expect(prompt.system).toContain("React Native");
      expect(prompt.system).toContain("todo");
      expect(prompt.messages).toHaveLength(1);
      expect(prompt.messages[0]?.content).toBe("Create a todo app");

      const aiResponse = `I'll create a simple todo app for you.

\`\`\`tsx filename="App.tsx"
import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now().toString(), text: input, completed: false }]);
      setInput("");
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo App</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Add a task"
        />
        <TouchableOpacity style={styles.button} onPress={addTodo}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggleTodo(item.id)}>
            <Text style={[styles.todo, item.completed && styles.completed]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  inputRow: { flexDirection: "row", marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5 },
  button: { backgroundColor: "#007AFF", padding: 10, marginLeft: 10, borderRadius: 5 },
  buttonText: { color: "#fff", fontWeight: "600" },
  todo: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  completed: { textDecorationLine: "line-through", color: "#999" },
});
\`\`\`

This creates a simple todo app with add and toggle functionality!`;

      const parser = new ResponseParser();
      const parsed = parser.parse(aiResponse);

      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.codeBlocks[0]?.filename).toBe("App.tsx");
      expect(parsed.codeBlocks[0]?.language).toBe("tsx");
      expect(parsed.codeBlocks[0]?.content).toContain("useState");
      expect(parsed.codeBlocks[0]?.content).toContain("FlatList");

      expect(parsed.astOperations).toHaveLength(1);
      expect(parsed.astOperations[0]?.type).toBe("create");
      expect(parsed.astOperations[0]?.targetPath).toBe("App.tsx");

      expect(parsed.text).toContain("I'll create a simple todo app");
      expect(parsed.text).toContain("add and toggle functionality");
    });

    it("should handle multi-file generation", () => {
      const aiResponse = `I'll create a button component and a screen that uses it.

\`\`\`tsx filename="components/Button.tsx"
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ title, onPress, variant = "primary" }: ButtonProps) {
  return (
    <TouchableOpacity style={[styles.button, styles[variant]]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: 16, borderRadius: 8, alignItems: "center" },
  primary: { backgroundColor: "#007AFF" },
  secondary: { backgroundColor: "#6c757d" },
  text: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
\`\`\`

\`\`\`tsx filename="screens/HomeScreen.tsx"
import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "../components/Button";

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Button title="Get Started" onPress={() => console.log("pressed")} />
      <Button title="Learn More" onPress={() => {}} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
});
\`\`\`

Both components are now ready to use!`;

      const parsed = parseResponse(aiResponse);

      expect(parsed.codeBlocks).toHaveLength(2);
      expect(parsed.codeBlocks[0]?.filename).toBe("components/Button.tsx");
      expect(parsed.codeBlocks[1]?.filename).toBe("screens/HomeScreen.tsx");

      expect(parsed.astOperations).toHaveLength(2);
      expect(parsed.astOperations.every(op => op.type === "create")).toBe(true);
    });

    it("should infer filenames when not provided", () => {
      const aiResponse = `Here's a login screen:

\`\`\`tsx
import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={() => {}} />
    </View>
  );
}
\`\`\``;

      const parsed = parseResponse(aiResponse);

      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.codeBlocks[0]?.filename).toBe("screens/LoginScreen.tsx");
    });

    it("should handle conversation history in prompts", () => {
      const builder = new PromptBuilder();

      builder.setConversationHistory([
        { role: "user", content: "Create a button component" },
        { role: "assistant", content: "Here's a button component..." },
        { role: "user", content: "Add loading state" },
        { role: "assistant", content: "I've added loading state..." },
      ]);

      const prompt = builder.build("Now add disabled state");

      expect(prompt.messages).toHaveLength(5);
      expect(prompt.messages[0]?.content).toBe("Create a button component");
      expect(prompt.messages[4]?.content).toBe("Now add disabled state");
    });

    it("should include existing files in context", () => {
      const builder = new PromptBuilder();
      const existingFiles = new Map<string, string>();
      existingFiles.set("components/Button.tsx", "export function Button() { return null; }");
      existingFiles.set("utils/tokens.ts", "export const colors = { primary: '#007AFF' };");

      builder.setExistingFiles(existingFiles);

      const prompt = builder.build("Update the button to use tokens");

      expect(prompt.system).toContain("Existing Project Files");
      expect(prompt.system).toContain("components/Button.tsx");
      expect(prompt.system).toContain("utils/tokens.ts");
    });
  });

  describe("ResponseParser streaming", () => {
    it("should accumulate chunks and detect complete blocks", () => {
      const parser = new ResponseParser();

      parser.appendChunk("Here's a component:\n\n```tsx filename=\"test.tsx\"\n");
      expect(parser.getBuffer()).toContain("Here's a component");

      parser.appendChunk("export function Test() {\n");
      parser.appendChunk("  return <div>Test</div>;\n");
      parser.appendChunk("}\n");

      const result = parser.appendChunk("```\n\nAll done!");

      expect(result.newBlocks.length).toBeGreaterThanOrEqual(0);

      const fullParse = parser.parse(parser.getBuffer());
      expect(fullParse.codeBlocks).toHaveLength(1);
      expect(fullParse.codeBlocks[0]?.filename).toBe("test.tsx");
    });

    it("should handle partial blocks during streaming", () => {
      const parser = new ResponseParser();

      const result1 = parser.appendChunk("```tsx filename=\"partial.tsx\"\n");
      expect(result1.partialBlock).toContain("```tsx");
      expect(result1.newBlocks).toHaveLength(0);

      parser.appendChunk("const x = 1;");
      parser.appendChunk("\n```");

      const fullParse = parser.parse(parser.getBuffer());
      expect(fullParse.codeBlocks).toHaveLength(1);
      expect(fullParse.codeBlocks[0]?.filename).toBe("partial.tsx");
    });
  });

  describe("ResponseParser validation edge cases", () => {
    it("should handle responses with no code", () => {
      const parsed = parseResponse("I understand your request, but I need more information.");

      expect(parsed.codeBlocks).toHaveLength(0);
      expect(parsed.astOperations).toHaveLength(0);
      expect(parsed.text).toContain("I understand your request");
    });

    it("should filter malformed code blocks", () => {
      const response = `\`\`\`tsx filename="malformed.tsx"
export function Broken() {
  return <div
\`\`\``;

      const parsed = parseResponse(response);

      expect(parsed.warnings.some(w => w.includes("malformed"))).toBe(true);
    });

    it("should sanitize dangerous filenames", () => {
      const response = `\`\`\`tsx filename="../../../etc/secrets.tsx"
export const x = 1;
\`\`\``;

      const parsed = parseResponse(response);

      expect(parsed.codeBlocks[0]?.filename).not.toContain("..");
      expect(parsed.warnings.some(w => w.includes("sanitized"))).toBe(true);
    });

    it("should handle JSON code blocks", () => {
      const response = `Here's the config:

\`\`\`json filename="app.json"
{
  "expo": {
    "name": "My App",
    "slug": "my-app"
  }
}
\`\`\``;

      const parsed = parseResponse(response);

      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.codeBlocks[0]?.language).toBe("json");
      expect(parsed.codeBlocks[0]?.filename).toBe("app.json");
    });
  });

  describe("PromptBuilder few-shot selection", () => {
    it("should select todo example for todo-related prompts", () => {
      const builder = new PromptBuilder();
      const prompt = builder.build("Create a todo list app");

      expect(prompt.system).toContain("Example");
      expect(prompt.system).toContain("todo");
    });

    it("should select calculator example for calculator prompts", () => {
      const builder = new PromptBuilder();
      const prompt = builder.build("Build a calculator");

      expect(prompt.system).toContain("Example");
      expect(prompt.system).toContain("calculator");
    });

    it("should select simple example for new projects", () => {
      const builder = new PromptBuilder();
      const prompt = builder.build("Create an app");

      expect(prompt.system).toContain("Example");
    });
  });

  describe("Backend schema context", () => {
    it("should include Supabase schema in prompt", () => {
      const builder = new PromptBuilder();
      builder.setProject({
        id: 1,
        uuid: "test",
        name: "Test",
        organization_id: 1,
        framework: "expo",
        backend_provider: "supabase",
      } as any);

      builder.setBackendSchema({
        provider: "supabase",
        tables: [
          {
            name: "users",
            columns: [
              { name: "id", type: "uuid", nullable: false },
              { name: "email", type: "varchar", nullable: false },
              { name: "created_at", type: "timestamp", nullable: false },
            ],
          },
          {
            name: "posts",
            columns: [
              { name: "id", type: "uuid", nullable: false },
              { name: "title", type: "varchar", nullable: false },
              { name: "user_id", type: "uuid", nullable: false },
            ],
          },
        ],
      });

      const prompt = builder.build("Fetch all users");

      expect(prompt.system).toContain("Backend Schema");
      expect(prompt.system).toContain("supabase");
      expect(prompt.system).toContain("users");
      expect(prompt.system).toContain("posts");
      expect(prompt.system).toContain("email");
    });
  });
});
