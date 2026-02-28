import type { Project } from "../../db";
import { SIMPLE_APP_EXAMPLE, TODO_APP_EXAMPLE, CALCULATOR_EXAMPLE, type FewShotExample } from "./prompts/few-shot-examples";

export interface PromptContext {
  project?: Project;
  fileTree?: Record<string, unknown>;
  currentFile?: string;
  selectedCode?: string;
  backendSchema?: BackendSchema;
  conversationHistory?: ConversationMessage[];
  existingFiles?: Map<string, string>;
}

const MAX_CONVERSATION_HISTORY = 10;

export interface BackendSchema {
  provider: string;
  tables?: TableSchema[];
  endpoints?: EndpointSchema[];
}

export interface TableSchema {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
}

export interface EndpointSchema {
  method: string;
  path: string;
  description?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const PLATFORM_CONTEXT = `You are Raygan AI, an expert React Native (Expo) code generator. You help users build production-ready mobile applications through natural conversation.

Your capabilities:
- Generate complete React Native components with TypeScript
- Create navigation structures using Expo Router (file-based routing)
- Build forms with validation
- Integrate with backend services (Supabase, Firebase, custom APIs)
- Style components using StyleSheet or NativeWind
- Implement animations with Reanimated
- Handle state management (Zustand, React Query)

You always generate code that:
- Is production-ready and follows best practices
- Uses TypeScript with proper typing
- Handles loading and error states
- Is accessible (a11y labels, touch targets)
- Works on both iOS and Android`;

const CODE_QUALITY_RULES = `## Code Quality Rules

### File Format
- ALWAYS generate \`.ts\` files for logic, utilities, hooks, types, and constants
- ALWAYS generate \`.tsx\` files ONLY when the file contains JSX (components, screens)
- Never use \`.js\` or \`.jsx\` extensions

### Folder Structure (CRITICAL)

**If the project already has files, ALWAYS follow the existing folder structure.** Do not introduce new top-level folders or reorganize. Place new files where similar files already exist.

For new projects, use this flat structure at the project root:
\`\`\`
app/               # Expo Router file-based routes (_layout.tsx, index.tsx, etc.)
components/        # Reusable UI components
hooks/             # Custom React hooks
utils/             # Helpers, API clients, constants
types/             # TypeScript interfaces and types
\`\`\`

**Strict rules:**
- NEVER create a \`src/\` folder. All code lives at the project root.
- NEVER create both \`app/\` and \`screens/\` — screens are route files inside \`app/\`
- NEVER create a \`navigation/\` folder — Expo Router handles routing via the \`app/\` directory
- NEVER duplicate a file that already exists at a different path (e.g., do not create \`components/Button.tsx\` if \`src/components/Button.tsx\` already exists)
- If existing files are inside \`src/\`, continue placing new files inside \`src/\` — do NOT mix root-level and \`src/\` files
- Use \`app/_layout.tsx\` for layouts (Stack, Tabs, Drawer)
- Navigation is handled via \`expo-router\` (\`Link\`, \`useRouter\`, \`Stack\`, \`Tabs\`), NOT \`@react-navigation\`

If the user explicitly requests Atomic Design, organize components as:
\`\`\`
components/
├── atoms/          # Basic building blocks (Button, Input, Text, Icon)
├── molecules/      # Combinations of atoms (FormField, SearchBar, Card)
├── organisms/      # Complex components (ProductList, Header, Form)
\`\`\`
Only use this pattern when the user asks for it by name.

### Design Tokens
When generating styles, create a shared tokens file if one doesn't exist:
- \`utils/tokens.ts\` — export colors, typography, and spacing constants
- Use semantic color names (e.g. \`primary\`, \`surface\`, \`error\`) not raw hex in components
- Define a spacing scale (xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32)
- Define typography presets (heading, subheading, body, caption, label)

### TypeScript
- Use strict TypeScript with explicit types for all props, state, and API responses
- Avoid \`any\` — use \`unknown\` if the type is truly unknown, then narrow with type guards
- Export shared types from \`types/\` directory
- Use \`interface\` for component props, \`type\` for unions and computed types

### React Native Best Practices
- Functional components with hooks only
- Memoize expensive computations with \`useMemo\`
- Memoize callbacks with \`useCallback\` when passing to child components
- Use \`FlatList\` for lists, never \`ScrollView\` + \`.map()\`
- Handle keyboard avoidance (\`KeyboardAvoidingView\` with platform-specific behavior)
- Ensure minimum 44x44pt touch targets

### Styling
- Use \`StyleSheet.create\` — never inline style objects
- Import all colors, spacing, and typography from \`utils/tokens\`
- NEVER hardcode color hex values in component files
- Support dark mode via \`useColorScheme\` when relevant

### Error Handling
- Every async operation must be wrapped in try/catch
- Always handle three UI states: loading, error, and empty/success
- Display user-friendly error messages (not raw error strings)
- Log errors to console in development for debugging

### Performance
- Lazy load screens where appropriate
- Avoid defining functions or objects inline inside JSX
- Use \`InteractionManager.runAfterInteractions\` for heavy post-navigation work
- Optimize images (appropriate sizing, caching)

### Package Selection (Expo SDK First)
- ALWAYS prefer Expo SDK packages (\`expo-*\`) over third-party alternatives
- Before using any third-party package, check if an Expo SDK equivalent exists
- Common Expo SDK packages to prefer:
  - \`expo-image\` over \`react-native-fast-image\`
  - \`expo-av\` for audio/video instead of third-party players
  - \`expo-camera\` over \`react-native-camera\`
  - \`expo-linear-gradient\` over \`react-native-linear-gradient\`
  - \`expo-blur\` over \`@react-native-community/blur\`
  - \`expo-haptics\` over \`react-native-haptic-feedback\`
  - \`expo-secure-store\` over \`react-native-keychain\`
  - \`expo-local-authentication\` for biometrics
  - \`@expo/vector-icons\` for icons
- Only use third-party packages when:
  1. No Expo SDK equivalent exists
  2. The user explicitly requests a specific package
  3. The feature requires native code not available in Expo SDK
- For animations, prefer \`react-native-reanimated\` (Expo-compatible) or \`moti\`
- Avoid packages with native dependencies that aren't in the Expo SDK, as they won't work in Expo Go or Snack preview`;

const OUTPUT_FORMAT = `## Output Format

You MUST follow this plan-first structure for every code generation response:

### Step 1: Approach
Start with 1-3 sentences describing what you will build and your high-level approach.

### Step 2: Task List
Write a \`## Tasks\` heading followed by a checklist of all planned tasks using \`- [ ]\` syntax:

\`\`\`
## Tasks
- [ ] First task name
- [ ] Second task name
- [ ] Third task name
\`\`\`

### Step 3: Execute Each Task
For each task, write a \`### Task Name\` heading (matching the checklist exactly), then the code blocks, then mark it done with \`- [x] Task Name\`:

\`\`\`
### First task name

\\\`\\\`\\\`ts filename="utils/tokens.ts"
// code here
\\\`\\\`\\\`

- [x] First task name
\`\`\`

### Step 4: Completion (Optional)
After all tasks are done, add a brief summary or next steps if helpful.

### Code Block Rules
- Use fenced code blocks with the language AND filename
- Use \`.ts\` for non-JSX files, \`.tsx\` only for files containing JSX
- Always include \`filename="path/to/file"\` in the code fence
- Use relative paths from project root
- When generating multiple files, order them logically (types → utils → components → screens)
- When modifying existing code, describe the specific changes before showing the updated code

### Critical Rules
- ALWAYS output the \`## Tasks\` checklist BEFORE writing any code
- ALWAYS use \`### Task Name\` headings that match the checklist items exactly
- ALWAYS mark tasks done with \`- [x] Task Name\` after completing each one
- Keep task names short and descriptive (e.g., "Set up design tokens", "Create main screen")
- Aim for 2-6 tasks per response — group related files into one task`;

const AGENT_OUTPUT_FORMAT = `## Agent Mode — How to Work

You have access to tools that let you explore and modify the project. Follow this workflow:

### Step 1: Explore
Use \`list_files\`, \`read_file\`, and \`search_code\` to understand the current project structure and existing code patterns. ALWAYS read relevant files before making changes.

### Step 2: Plan
Once you understand the codebase, call \`propose_plan\` with a summary and list of changes. Wait for the user to approve before proceeding.

### Step 3: Execute
After plan approval, execute changes one file at a time using \`create_file\`, \`modify_file\`, or \`delete_file\`.

### Step 4: Validate
After ALL file changes are complete, ALWAYS call \`validate_project\` to check for errors. If validation reports issues, fix them immediately — do NOT leave broken imports, missing files, or type errors. Repeat validation until it passes.

### Critical Rules
- ALWAYS explore before modifying — never guess file contents
- ALWAYS call \`propose_plan\` before any write operations
- ALWAYS use relative imports (e.g., \`./utils/tokens\`, \`../components/Button\`) — NEVER use \`@/\`, \`~/\`, or \`src/\` prefixes as they break Expo Snack
- ALWAYS place new files in the same folder structure that already exists — check \`list_files\` output first
- NEVER create duplicate files at different paths (e.g., don't create \`components/Button.tsx\` if \`src/components/Button.tsx\` exists)
- NEVER introduce new top-level folders (\`src/\`, \`screens/\`, \`navigation/\`) unless they already exist in the project
- Update root wiring files (App.tsx, layout files, barrel exports) when adding new screens/components
- Execute one file operation per tool call
- When modifying a file, provide the COMPLETE new content, not just the diff
- Maintain consistency with existing code patterns and naming conventions
- If a tokens file or theme file exists, use those values instead of hardcoding`;

export class PromptBuilder {
  private context: PromptContext;
  private agentMode = false;

  constructor(context: PromptContext = {}) {
    this.context = context;
  }

  setAgentMode(enabled: boolean): this {
    this.agentMode = enabled;
    return this;
  }

  build(userMessage: string): { system: string; messages: ConversationMessage[] } {
    const systemPrompt = this.agentMode
      ? this.buildAgentSystemPrompt()
      : this.buildSystemPrompt(userMessage);
    const messages = this.buildMessages(userMessage);

    return { system: systemPrompt, messages };
  }

  private buildAgentSystemPrompt(): string {
    const layers: string[] = [
      PLATFORM_CONTEXT,
      this.buildProjectContext(),
      CODE_QUALITY_RULES,
      AGENT_OUTPUT_FORMAT,
      this.buildBackendContext(),
    ];

    return layers.filter(Boolean).join("\n\n---\n\n");
  }

  private buildSystemPrompt(userMessage: string): string {
    const layers: string[] = [
      PLATFORM_CONTEXT,
      this.buildProjectContext(),
      this.buildExistingFilesContext(),
      CODE_QUALITY_RULES,
      OUTPUT_FORMAT,
      this.buildFewShotExample(userMessage),
      this.buildBackendContext(),
    ];

    return layers.filter(Boolean).join("\n\n---\n\n");
  }

  private buildFewShotExample(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    let example: FewShotExample | null = null;

    if (lowerMessage.includes("todo") || lowerMessage.includes("task list")) {
      example = TODO_APP_EXAMPLE;
    } else if (lowerMessage.includes("calculator") || lowerMessage.includes("calc")) {
      example = CALCULATOR_EXAMPLE;
    } else if (
      lowerMessage.includes("counter") ||
      lowerMessage.includes("simple app") ||
      lowerMessage.includes("basic app") ||
      this.isNewProject()
    ) {
      example = SIMPLE_APP_EXAMPLE;
    }

    if (!example) return "";

    return `## Example

Here's an example of the expected output format:

**User:** ${example.userMessage}

**Assistant:** ${example.assistantResponse}`;
  }

  private isNewProject(): boolean {
    const hasFiles = this.context.fileTree && Object.keys(this.context.fileTree).length > 0;
    const hasExistingFiles = this.context.existingFiles && this.context.existingFiles.size > 0;
    return !hasFiles && !hasExistingFiles;
  }

  private buildExistingFilesContext(): string {
    if (!this.context.existingFiles || this.context.existingFiles.size === 0) {
      return "";
    }

    let context = `## Existing Project Files

The project already has these files. You MUST:
- Place new files in the same folder structure that already exists (e.g., if components are in \`components/\`, put new components there — NOT in \`src/components/\`)
- NEVER create a file that duplicates an existing file at a different path
- NEVER introduce new top-level folders like \`src/\`, \`screens/\`, or \`navigation/\` unless they already exist
- Match existing naming conventions (kebab-case vs PascalCase, etc.)

`;

    for (const [path, content] of this.context.existingFiles) {
      const preview = content.length > 500 ? content.substring(0, 500) + "\n// ... (truncated)" : content;
      context += `### \`${path}\`\n\`\`\`tsx\n${preview}\n\`\`\`\n\n`;
    }

    return context;
  }

  private buildProjectContext(): string {
    if (!this.context.project) {
      return "";
    }

    const { project, fileTree, currentFile, selectedCode } = this.context;

    let context = `## Project Context

**Project:** ${project.name}
**Framework:** React Native (Expo) ${project.framework_version || "SDK 54"}`;

    if (project.backend_provider) {
      context += `\n**Backend:** ${project.backend_provider}`;
    }

    if (fileTree) {
      context += `\n\n### File Structure\n\`\`\`\n${this.formatFileTree(fileTree)}\n\`\`\``;
    }

    if (currentFile) {
      context += `\n\n### Current File\nUser is viewing: \`${currentFile}\``;
    }

    if (selectedCode) {
      context += `\n\n### Selected Code\n\`\`\`tsx\n${selectedCode}\n\`\`\``;
    }

    return context;
  }

  private buildBackendContext(): string {
    if (!this.context.backendSchema) {
      return "";
    }

    const { provider, tables, endpoints } = this.context.backendSchema;

    let context = `## Backend Schema

**Provider:** ${provider}`;

    if (tables && tables.length > 0) {
      context += "\n\n### Database Tables\n";
      for (const table of tables) {
        context += `\n**${table.name}**\n`;
        context += "| Column | Type | Nullable |\n|--------|------|----------|\n";
        for (const col of table.columns) {
          context += `| ${col.name} | ${col.type} | ${col.nullable ? "Yes" : "No"} |\n`;
        }
      }
    }

    if (endpoints && endpoints.length > 0) {
      context += "\n\n### API Endpoints\n";
      for (const ep of endpoints) {
        context += `- \`${ep.method} ${ep.path}\`${ep.description ? ` - ${ep.description}` : ""}\n`;
      }
    }

    return context;
  }

  private buildMessages(userMessage: string): ConversationMessage[] {
    const messages: ConversationMessage[] = [];

    if (this.context.conversationHistory) {
      const history = this.context.conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
      messages.push(...history);
    }

    messages.push({ role: "user", content: userMessage });

    return messages;
  }

  private formatFileTree(tree: Record<string, unknown>, indent = ""): string {
    let result = "";
    const entries = Object.entries(tree);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const [name, value] = entry;
      const isLast = i === entries.length - 1;
      const prefix = isLast ? "└── " : "├── ";

      result += `${indent}${prefix}${name}\n`;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        const childIndent = indent + (isLast ? "    " : "│   ");
        result += this.formatFileTree(value as Record<string, unknown>, childIndent);
      }
    }

    return result;
  }

  setProject(project: Project): this {
    this.context.project = project;
    return this;
  }

  setFileTree(fileTree: Record<string, unknown>): this {
    this.context.fileTree = fileTree;
    return this;
  }

  setCurrentFile(filePath: string): this {
    this.context.currentFile = filePath;
    return this;
  }

  setSelectedCode(code: string): this {
    this.context.selectedCode = code;
    return this;
  }

  setBackendSchema(schema: BackendSchema): this {
    this.context.backendSchema = schema;
    return this;
  }

  setConversationHistory(history: ConversationMessage[]): this {
    this.context.conversationHistory = history;
    return this;
  }

  setExistingFiles(files: Map<string, string>): this {
    this.context.existingFiles = files;
    return this;
  }
}
