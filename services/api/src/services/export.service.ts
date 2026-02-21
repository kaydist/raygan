import archiver from "archiver";
import { Readable } from "stream";

import type { ASTNode } from "@staq/shared";

import { logger } from "../config";
import type { Project, ProjectFile } from "../db";
import { serialize, type Framework, type SerializerOutput } from "./ast-engine";
import { FileStorageService } from "./file-storage.service";
import { ProjectService } from "./project.service";

export interface ExportOptions {
  includeBackendSDK?: boolean;
}

export interface ExportResult {
  stream: Readable;
  filename: string;
  fileCount: number;
}

export class ExportService {
  private projectService: ProjectService;
  private fileStorageService: FileStorageService;

  constructor() {
    this.projectService = new ProjectService();
    this.fileStorageService = new FileStorageService();
  }

  async exportProject(projectId: number, options: ExportOptions = {}): Promise<ExportResult> {
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    logger.info({ projectId, projectSlug: project.slug }, "Starting project export");

    const allFiles = await this.generateProjectFiles(project, options);

    const archive = archiver("zip", { zlib: { level: 9 } });
    const rootFolder = project.slug;

    for (const [path, content] of allFiles) {
      archive.append(content, { name: `${rootFolder}/${path}` });
    }

    archive.finalize();

    logger.info({
      projectId,
      projectSlug: project.slug,
      fileCount: allFiles.size,
    }, "Project export completed");

    return {
      stream: archive as unknown as Readable,
      filename: `${project.slug}.zip`,
      fileCount: allFiles.size,
    };
  }

  private async generateProjectFiles(
    project: Project,
    _options: ExportOptions
  ): Promise<Map<string, string>> {
    const ast = project.ast_snapshot as unknown as ASTNode | null;
    let generatedFiles: SerializerOutput = new Map();

    if (ast && ast.type === "root") {
      generatedFiles = serialize(ast, {
        includeScaffolding: true,
        projectName: project.name,
        projectSlug: project.slug,
        projectVersion: "1.0.0",
        framework: this.getFramework(project),
        useTypeScript: true,
        expoRouter: this.detectExpoRouter(ast),
        indent: "  ",
      });
    }

    const storedFiles = await this.fileStorageService.findByProjectId(project.id);
    const allFiles = this.mergeFiles(generatedFiles, storedFiles);

    this.ensureRequiredFiles(allFiles, project);

    return allFiles;
  }

  private mergeFiles(
    generated: SerializerOutput,
    stored: ProjectFile[]
  ): Map<string, string> {
    const merged = new Map(generated);

    for (const file of stored) {
      if (!file.is_directory && file.content) {
        merged.set(file.path, file.content);
      }
    }

    return merged;
  }

  private ensureRequiredFiles(files: Map<string, string>, project: Project): void {
    if (!files.has("assets/.gitkeep")) {
      files.set("assets/.gitkeep", "");
    }

    if (!files.has("README.md")) {
      files.set("README.md", this.generateReadme(project));
    }
  }

  private generateReadme(project: Project): string {
    return `# ${project.name}

Built with [Staq](https://staq.dev)

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start the development server
npx expo start
\`\`\`

## Project Structure

\`\`\`
├── App.tsx              # Entry point
├── app.json             # Expo configuration
├── src/
│   ├── app/             # Expo Router pages
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utility functions
└── assets/              # Images and fonts
\`\`\`

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
`;
  }

  private getFramework(project: Project): Framework {
    const version = project.framework_version || "expo-52";
    if (version.startsWith("expo")) return "expo";
    if (version.startsWith("bare")) return "bare-rn";
    if (version.startsWith("flutter")) return "flutter";
    return "expo";
  }

  private detectExpoRouter(ast: ASTNode): boolean {
    if (!ast.children || ast.children.length === 0) {
      return true;
    }

    const hasFileBasedRouting = ast.children.some(
      (child) => child.type === "screen" && child.props?.["expo-router"]
    );

    return hasFileBasedRouting || true;
  }
}
