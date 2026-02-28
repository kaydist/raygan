import type { ToolDefinition } from "./types";

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "list_files",
    description:
      "List all files in the project. Returns file paths, languages, and sizes. Use this first to understand the project structure before making changes.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "read_file",
    description:
      "Read the full content of a project file. Use this to understand existing code before modifying it.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The file path relative to project root (e.g. 'screens/HomeScreen.tsx')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_code",
    description:
      "Search across all project files for a text pattern. Returns matching lines with file paths and line numbers.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The text or pattern to search for across all project files",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "propose_plan",
    description:
      "Propose a plan of file changes before executing them. You MUST call this tool before using any write tools (create_file, modify_file, delete_file). The plan will be shown to the user for approval.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "A brief summary of the planned changes",
        },
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["create", "modify", "delete"],
              },
              path: {
                type: "string",
                description: "File path relative to project root",
              },
              description: {
                type: "string",
                description: "Brief description of the change",
              },
            },
            required: ["action", "path", "description"],
          },
          description: "List of file changes to be made",
        },
      },
      required: ["summary", "changes"],
    },
  },
  {
    name: "create_file",
    description:
      "Create a new file in the project. The plan must be approved first.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root",
        },
        content: {
          type: "string",
          description: "The full file content",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "modify_file",
    description:
      "Modify an existing file in the project by replacing its full content. The plan must be approved first.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root",
        },
        content: {
          type: "string",
          description: "The new full file content",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description:
      "Delete a file from the project. The plan must be approved first.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "validate_project",
    description:
      "Validate the project for common errors after making changes. Checks for: missing imports, broken references between files, duplicate files, TypeScript type issues, and missing dependencies. ALWAYS call this after finishing all file changes.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export const READ_ONLY_TOOL_NAMES = new Set([
  "list_files",
  "read_file",
  "search_code",
  "propose_plan",
]);

export const WRITE_TOOL_NAMES = new Set([
  "create_file",
  "modify_file",
  "delete_file",
]);
