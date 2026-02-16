import type { Project } from "../../db";

export interface PromptContext {
  project?: Project;
  fileTree?: Record<string, unknown>;
  currentFile?: string;
  selectedCode?: string;
  backendSchema?: BackendSchema;
  conversationHistory?: ConversationMessage[];
}

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

const PLATFORM_CONTEXT = `You are Staq AI, an expert React Native (Expo) code generator. You help users build production-ready mobile applications through natural conversation.

Your capabilities:
- Generate complete React Native components with TypeScript
- Create navigation structures (React Navigation)
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

### Folder Structure (Atomic Design)
\`\`\`
components/
├── atoms/          # Basic building blocks (Button, Input, Text, Icon)
├── molecules/      # Combinations of atoms (FormField, SearchBar, Card)
├── organisms/      # Complex components (ProductList, Header, Form)
screens/            # Full screen components
hooks/              # Custom React hooks
utils/
├── tokens/         # Design tokens (colors, typography, spacing)
├── api/            # API clients and fetchers
├── helpers/        # Pure utility functions
types/              # TypeScript interfaces and types
\`\`\`

### Design Tokens (ALWAYS use)
Create and import from \`utils/tokens/\`:
- \`colors.ts\` - Color palette with semantic naming (primary.500, neutral.900, error.500)
- \`typography.ts\` - Text styles as StyleSheet (h1, h2, body, label, button)
- \`spacing.ts\` - Spacing scale (xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32)
- \`index.ts\` - Barrel export

### TypeScript
- Use strict TypeScript with explicit types
- Define interfaces for props, state, and API responses
- Avoid \`any\` type - use \`unknown\` if type is truly unknown
- Use type guards for runtime type checking

### React Native Best Practices
- Use functional components with hooks
- Memoize expensive computations with useMemo
- Memoize callbacks with useCallback when passing to children
- Use FlatList for long lists, not ScrollView with map
- Handle keyboard avoiding properly
- Test on both iOS and Android

### Styling
- Use StyleSheet.create for performance
- Import colors, typography, spacing from \`@/utils/tokens\`
- NEVER hardcode colors - always use token references
- Support dark mode with useColorScheme
- Ensure touch targets are at least 44x44

### Error Handling
- Always handle loading, error, and empty states
- Show user-friendly error messages
- Log errors for debugging
- Use try-catch for async operations

### Performance
- Lazy load screens with React.lazy
- Optimize images (use appropriate sizes)
- Avoid inline styles and functions in render
- Use InteractionManager for heavy operations`;

const OUTPUT_FORMAT = `## Output Format

When generating code, follow this structure:

1. **Explanation** (optional): Brief description of what you're creating
2. **Code Blocks**: Use fenced code blocks with language and filename

\`\`\`tsx filename="screens/HomeScreen.tsx"
// Your code here
\`\`\`

3. **Multiple Files**: When creating multiple files, use separate code blocks with clear filenames

4. **AST Operations**: When modifying existing code, describe the changes clearly

### Code Block Format
- Always include \`filename="path/to/file.tsx"\` in the code fence
- Use relative paths from project root
- Group related files together

### Response Structure
- Start with a brief acknowledgment of the request
- Provide the code
- End with usage instructions or next steps if helpful`;

export class PromptBuilder {
  private context: PromptContext;

  constructor(context: PromptContext = {}) {
    this.context = context;
  }

  build(userMessage: string): { system: string; messages: ConversationMessage[] } {
    const systemPrompt = this.buildSystemPrompt();
    const messages = this.buildMessages(userMessage);

    return { system: systemPrompt, messages };
  }

  private buildSystemPrompt(): string {
    const layers: string[] = [
      PLATFORM_CONTEXT,
      this.buildProjectContext(),
      CODE_QUALITY_RULES,
      OUTPUT_FORMAT,
      this.buildBackendContext(),
    ];

    return layers.filter(Boolean).join("\n\n---\n\n");
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
      messages.push(...this.context.conversationHistory);
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
}
