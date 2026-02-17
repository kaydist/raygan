import { describe, it, expect, beforeEach } from "vitest";
import { PromptBuilder } from "../prompt-builder";
import type { Project } from "../../../db";

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  uuid: "test-project-uuid",
  name: "Test Project",
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
  ...overrides,
} as Project);

describe("PromptBuilder", () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  describe("build", () => {
    it("should build a basic prompt with user message", () => {
      const result = builder.build("Create a login screen");

      expect(result.system).toContain("Staq AI");
      expect(result.system).toContain("React Native");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        role: "user",
        content: "Create a login screen",
      });
    });

    it("should include project context when set", () => {
      const project = createMockProject({ name: "My App" });
      builder.setProject(project);

      const result = builder.build("Add a button");

      expect(result.system).toContain("Project:** My App");
      expect(result.system).toContain("React Native (Expo)");
    });

    it("should include file tree when project and file tree are set", () => {
      const project = createMockProject();
      const fileTree = {
        components: {
          "Button.tsx": {},
          "Input.tsx": {},
        },
        screens: {
          "Home.tsx": {},
        },
      };
      builder.setProject(project);
      builder.setFileTree(fileTree);

      const result = builder.build("Create a form");

      expect(result.system).toContain("File Structure");
      expect(result.system).toContain("components");
      expect(result.system).toContain("screens");
    });

    it("should include current file context when project and current file are set", () => {
      const project = createMockProject();
      builder.setProject(project);
      builder.setCurrentFile("screens/HomeScreen.tsx");

      const result = builder.build("Add a button here");

      expect(result.system).toContain("Current File");
      expect(result.system).toContain("screens/HomeScreen.tsx");
    });

    it("should include selected code when project and selected code are set", () => {
      const project = createMockProject();
      builder.setProject(project);
      builder.setSelectedCode("const x = 1;");

      const result = builder.build("Refactor this");

      expect(result.system).toContain("Selected Code");
      expect(result.system).toContain("const x = 1;");
    });

    it("should include backend schema when set", () => {
      const project = createMockProject({ backend_provider: "supabase" });
      builder.setProject(project);
      builder.setBackendSchema({
        provider: "supabase",
        tables: [
          {
            name: "users",
            columns: [
              { name: "id", type: "uuid", nullable: false },
              { name: "email", type: "varchar", nullable: false },
            ],
          },
        ],
      });

      const result = builder.build("Fetch users");

      expect(result.system).toContain("Backend Schema");
      expect(result.system).toContain("supabase");
      expect(result.system).toContain("users");
    });
  });

  describe("conversation history", () => {
    it("should include conversation history in messages", () => {
      builder.setConversationHistory([
        { role: "user", content: "Create a button" },
        { role: "assistant", content: "Here's a button component..." },
      ]);

      const result = builder.build("Now add loading state");

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]).toEqual({
        role: "user",
        content: "Create a button",
      });
      expect(result.messages[1]).toEqual({
        role: "assistant",
        content: "Here's a button component...",
      });
      expect(result.messages[2]).toEqual({
        role: "user",
        content: "Now add loading state",
      });
    });

    it("should limit conversation history to last 10 messages", () => {
      const history = Array.from({ length: 15 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: `Message ${i}`,
      }));

      builder.setConversationHistory(history);

      const result = builder.build("New message");

      expect(result.messages).toHaveLength(11);
      expect(result.messages[0]?.content).toBe("Message 5");
      expect(result.messages[10]?.content).toBe("New message");
    });
  });

  describe("few-shot examples", () => {
    it("should include todo example for todo-related prompts", () => {
      const result = builder.build("Create a todo app");

      expect(result.system).toContain("Example");
      expect(result.system).toContain("todo");
    });

    it("should include calculator example for calculator prompts", () => {
      const result = builder.build("Build a calculator");

      expect(result.system).toContain("Example");
      expect(result.system).toContain("calculator");
    });

    it("should include simple example for new projects", () => {
      const result = builder.build("Create an app");

      expect(result.system).toContain("Example");
    });
  });

  describe("existing files context", () => {
    it("should include existing files when set", () => {
      const files = new Map<string, string>();
      files.set("App.tsx", 'export default function App() { return null; }');
      files.set("components/Button.tsx", 'export function Button() {}');

      builder.setExistingFiles(files);

      const result = builder.build("Add a new component");

      expect(result.system).toContain("Existing Project Files");
      expect(result.system).toContain("App.tsx");
      expect(result.system).toContain("components/Button.tsx");
    });

    it("should truncate long file contents", () => {
      const files = new Map<string, string>();
      const longContent = "x".repeat(1000);
      files.set("LongFile.tsx", longContent);

      builder.setExistingFiles(files);

      const result = builder.build("Update this");

      expect(result.system).toContain("truncated");
    });
  });

  describe("code quality rules", () => {
    it("should include TypeScript best practices", () => {
      const result = builder.build("Create something");

      expect(result.system).toContain("TypeScript");
      expect(result.system).toContain(".tsx");
      expect(result.system).toContain(".ts");
    });

    it("should include React Native best practices", () => {
      const result = builder.build("Create something");

      expect(result.system).toContain("FlatList");
      expect(result.system).toContain("StyleSheet");
      expect(result.system).toContain("KeyboardAvoidingView");
    });

    it("should include output format rules", () => {
      const result = builder.build("Create something");

      expect(result.system).toContain("filename=");
      expect(result.system).toContain("Output Format");
    });
  });

  describe("chained builder methods", () => {
    it("should support method chaining", () => {
      const project = createMockProject();

      const result = builder
        .setProject(project)
        .setFileTree({ src: {} })
        .setCurrentFile("src/App.tsx")
        .setSelectedCode("const x = 1;")
        .setConversationHistory([])
        .setExistingFiles(new Map())
        .build("Test");

      expect(result.system).toBeDefined();
      expect(result.messages).toHaveLength(1);
    });
  });
});
