# Export to ZIP - Implementation Plan

## Overview

This document outlines the implementation plan for the "Export to ZIP" feature, which allows users to download a fully working, framework-specific project that can be immediately run locally.

## Architecture

### Current State

The codebase already has a well-designed adapter pattern:

```
services/api/src/services/ast-engine/
├── types.ts                    # FrameworkAdapter interface, DependencyTracker
├── serializer.ts               # serialize() orchestrator
└── adapters/
    ├── base-adapter.ts         # BaseFrameworkAdapter abstract class
    ├── expo.adapter.ts         # ExpoAdapter with scaffolding
    └── index.ts                # createAdapter() factory
```

**Existing Capabilities:**
- `FrameworkAdapter` interface with `generateScaffolding()` method
- `ExpoAdapter` generates: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `.gitignore`
- `DependencyTracker` collects packages from component usage
- `serialize()` converts AST → framework-specific code files

**Framework type already supports:**
```typescript
type Framework = "expo" | "bare-rn" | "flutter";
```

---

## Implementation Tasks

### Phase 1: Export Service (Backend)

#### Task 1.1: Install Dependencies

**File:** `services/api/package.json`

```bash
pnpm --filter=api add archiver
pnpm --filter=api add -D @types/archiver
```

---

#### Task 1.2: Create Export Service

**File:** `services/api/src/services/export.service.ts`

```typescript
import archiver from "archiver";
import { Readable } from "stream";
import { serialize } from "./ast-engine";
import type { Project } from "@/db/entities";
import type { ASTNode } from "@raygan/shared";

interface ExportOptions {
  includeBackendSDK?: boolean;
  format?: "zip" | "tar";
}

export class ExportService {
  constructor(
    private projectService: ProjectService,
    private fileStorageService: FileStorageService,
    private backendHubService: BackendHubService
  ) {}

  async exportProject(
    projectId: number,
    options: ExportOptions = {}
  ): Promise<{ stream: Readable; filename: string }> {
    // 1. Load project with AST
    const project = await this.projectService.findById(projectId);
    const ast = project.ast_snapshot as ASTNode;

    // 2. Serialize AST to code (includes scaffolding)
    const generatedFiles = serialize(ast, {
      includeScaffolding: true,
      projectName: project.name,
      projectSlug: project.slug,
      projectVersion: "1.0.0",
      framework: this.getFramework(project),
      useTypeScript: true,
      expoRouter: this.detectExpoRouter(ast),
    });

    // 3. Load stored files (user edits, assets)
    const storedFiles = await this.fileStorageService.findByProjectId(projectId);

    // 4. Merge: stored files override generated
    const allFiles = this.mergeFiles(generatedFiles, storedFiles);

    // 5. Add backend SDK if configured
    if (options.includeBackendSDK && project.backend_provider) {
      const sdkFiles = await this.generateBackendSDK(project);
      sdkFiles.forEach((content, path) => allFiles.set(path, content));
    }

    // 6. Add placeholder assets if missing
    this.ensureAssets(allFiles);

    // 7. Create ZIP stream
    const stream = this.createZipStream(allFiles, project.slug);

    return {
      stream,
      filename: `${project.slug}.zip`,
    };
  }

  private mergeFiles(
    generated: Map<string, string>,
    stored: ProjectFile[]
  ): Map<string, string> {
    const merged = new Map(generated);

    for (const file of stored) {
      if (!file.is_directory && file.content) {
        // Stored files take precedence (user edits)
        merged.set(file.path, file.content);
      }
    }

    return merged;
  }

  private createZipStream(
    files: Map<string, string>,
    rootFolder: string
  ): Readable {
    const archive = archiver("zip", { zlib: { level: 9 } });

    for (const [path, content] of files) {
      archive.append(content, { name: `${rootFolder}/${path}` });
    }

    archive.finalize();
    return archive;
  }

  private getFramework(project: Project): Framework {
    // Parse from project.framework_version or settings
    const version = project.framework_version || "expo-52";
    if (version.startsWith("expo")) return "expo";
    if (version.startsWith("bare")) return "bare-rn";
    if (version.startsWith("flutter")) return "flutter";
    return "expo";
  }

  private detectExpoRouter(ast: ASTNode): boolean {
    // Check if AST uses expo-router patterns
    // Look for file-based routing indicators
    return true; // Default to expo-router for new projects
  }

  private ensureAssets(files: Map<string, string>): void {
    // Add placeholder assets if not present
    const requiredAssets = [
      "assets/icon.png",
      "assets/splash.png",
      "assets/adaptive-icon.png",
      "assets/favicon.png",
    ];

    for (const asset of requiredAssets) {
      if (!files.has(asset)) {
        // Add .gitkeep to indicate placeholder
        files.set("assets/.gitkeep", "# Add your app icons here\n");
        break;
      }
    }
  }

  private async generateBackendSDK(
    project: Project
  ): Promise<Map<string, string>> {
    // Delegate to BackendHubService
    const adapter = this.backendHubService.getAdapter(project.backend_provider);
    if (!adapter) return new Map();

    const schema = await adapter.discoverSchema(project.backend_config);
    return adapter.generateClient(schema);
  }
}
```

---

#### Task 1.3: Create Export Routes

**File:** `services/api/src/routes/v1/exports.routes.ts`

```typescript
import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { ExportService } from "@/services/export.service";

const router = Router();

// GET /api/v1/projects/:projectId/export/zip
router.get(
  "/projects/:projectId/export/zip",
  authenticate,
  async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const authReq = req as AuthenticatedRequest;

      // Verify access
      const project = await projectService.findByUuid(projectId);
      const access = await projectService.checkAccess(
        authReq.dbUser.id,
        project.id
      );

      if (!access) {
        return res.status(403).json({
          data: null,
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }

      // Export
      const exportService = new ExportService(/* deps */);
      const { stream, filename } = await exportService.exportProject(
        project.id,
        { includeBackendSDK: req.query.includeBackendSDK === "true" }
      );

      // Stream response
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

#### Task 1.4: Register Routes

**File:** `services/api/src/routes/v1/index.ts`

```typescript
import exportRoutes from "./exports.routes";

// Add to router registration
router.use(exportRoutes);
```

---

### Phase 2: Framework Adapter Enhancements

#### Task 2.1: Enhance FrameworkAdapter Interface

**File:** `services/api/src/services/ast-engine/types.ts`

Add export-specific methods to the interface:

```typescript
export interface FrameworkAdapter {
  // ... existing methods ...

  // Export-specific
  getDependencyFile(): string; // "package.json" | "pubspec.yaml"
  getEntryPoint(): string;     // "App.tsx" | "lib/main.dart"
  getRequiredAssets(): string[]; // Platform-specific assets
}
```

---

#### Task 2.2: Add Bare React Native Adapter (Future)

**File:** `services/api/src/services/ast-engine/adapters/bare-rn.adapter.ts`

```typescript
export class BareRNAdapter extends BaseFrameworkAdapter {
  readonly framework = "bare-rn" as const;

  generateScaffolding(
    output: SerializerOutput,
    config: SerializerConfig,
    dependencies: DependencyTracker
  ): void {
    // Generate package.json
    output.set("package.json", this.generatePackageJson(config, dependencies));

    // Generate metro.config.js
    output.set("metro.config.js", this.generateMetroConfig());

    // Generate native project stubs
    output.set("android/.gitkeep", "# Run: npx react-native run-android\n");
    output.set("ios/.gitkeep", "# Run: npx react-native run-ios\n");

    // Entry point
    output.set("index.js", this.generateEntryPoint(config));

    // App component
    output.set("App.tsx", this.generateAppComponent());
  }

  // ... implement other abstract methods
}
```

---

#### Task 2.3: Add Flutter Adapter (Future)

**File:** `services/api/src/services/ast-engine/adapters/flutter.adapter.ts`

```typescript
export class FlutterAdapter extends BaseFrameworkAdapter {
  readonly framework = "flutter" as const;

  generateScaffolding(
    output: SerializerOutput,
    config: SerializerConfig,
    dependencies: DependencyTracker
  ): void {
    // Generate pubspec.yaml
    output.set("pubspec.yaml", this.generatePubspec(config, dependencies));

    // Generate main.dart
    output.set("lib/main.dart", this.generateMain(config));

    // Analysis options
    output.set("analysis_options.yaml", this.generateAnalysisOptions());

    // Native stubs
    output.set("android/.gitkeep", "# Generated by flutter create\n");
    output.set("ios/.gitkeep", "# Generated by flutter create\n");
  }

  serializeScreen(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void {
    // Convert AST to Dart/Flutter widgets
    const dartCode = this.generateDartWidget(node, context);
    const path = `lib/screens/${toSnakeCase(node.name)}.dart`;
    output.set(path, dartCode);
  }

  private generateDartWidget(node: ASTNode, context: SerializerContext): string {
    // Map AST components to Flutter widgets
    // Button → ElevatedButton
    // View → Container/Column/Row
    // Text → Text
    // etc.
  }
}
```

---

### Phase 3: Frontend Implementation

#### Task 3.1: Add Export API Client

**File:** `apps/web/src/lib/api/routes/exports.ts`

```typescript
import { axiosInstance } from "../client";

export const exportsApi = {
  downloadProjectZip: async (
    projectId: string,
    options?: { includeBackendSDK?: boolean }
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    if (options?.includeBackendSDK) {
      params.set("includeBackendSDK", "true");
    }

    const response = await axiosInstance.get(
      `/projects/${projectId}/export/zip?${params}`,
      { responseType: "blob" }
    );

    return response.data;
  },
};
```

---

#### Task 3.2: Create Download Utility

**File:** `apps/web/src/lib/utils/download.ts`

```typescript
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function downloadProjectZip(
  projectId: string,
  projectSlug: string,
  options?: { includeBackendSDK?: boolean }
): Promise<void> {
  const blob = await exportsApi.downloadProjectZip(projectId, options);
  downloadBlob(blob, `${projectSlug}.zip`);
}
```

---

#### Task 3.3: Add Export Button to Workspace

**File:** `apps/web/src/features/code-editor/components/CodeWorkspaceHeader.tsx`

```typescript
import { Download } from "lucide-react";
import { Button } from "@/components/atoms";
import { downloadProjectZip } from "@/lib/utils/download";
import { useProjectStore } from "@/stores/project-store";
import { useState } from "react";
import { toast } from "sonner";

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const project = useProjectStore((s) => s.project);

  const handleExport = async () => {
    if (!project) return;

    setIsExporting(true);
    try {
      await downloadProjectZip(project.uuid, project.slug);
      toast.success("Project exported successfully");
    } catch (error) {
      toast.error("Failed to export project");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : "Export"}
    </Button>
  );
}
```

---

### Phase 4: Testing & Edge Cases

#### Task 4.1: Handle Edge Cases

1. **Empty AST**: Export scaffold with placeholder screen
2. **Missing assets**: Add .gitkeep files
3. **Large projects**: Stream response (already handled by archiver)
4. **Special characters in filenames**: Sanitize paths
5. **Binary assets**: Base64 decode if stored as text

#### Task 4.2: Add Export Logging

Track exports in audit log:
- User ID
- Project ID
- Export timestamp
- File count
- Total size

---

## File Structure Summary

### Backend Files to Create/Modify

| File | Action |
|------|--------|
| `services/api/package.json` | Add `archiver` dependency |
| `services/api/src/services/export.service.ts` | **Create** |
| `services/api/src/routes/v1/exports.routes.ts` | **Create** |
| `services/api/src/routes/v1/index.ts` | Register export routes |

### Frontend Files to Create/Modify

| File | Action |
|------|--------|
| `apps/web/src/lib/api/routes/exports.ts` | **Create** |
| `apps/web/src/lib/utils/download.ts` | **Create** |
| `apps/web/src/features/code-editor/components/ExportButton.tsx` | **Create** |
| Workspace header component | Add ExportButton |

### Future Framework Adapters

| File | Framework |
|------|-----------|
| `adapters/bare-rn.adapter.ts` | Bare React Native |
| `adapters/flutter.adapter.ts` | Flutter/Dart |
| `adapters/swiftui.adapter.ts` | SwiftUI (iOS native) |

---

## Exported ZIP Structure

### Expo (Current)

```
my-app/
├── App.tsx                    # Entry point
├── app.json                   # Expo config
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript
├── babel.config.js            # Babel
├── .gitignore
├── src/
│   ├── app/                   # Expo Router pages
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── lib/                   # Backend SDK (if configured)
│       └── supabase.ts
└── assets/
    └── .gitkeep
```

### Bare React Native (Future)

```
my-app/
├── index.js                   # Entry point
├── App.tsx
├── package.json
├── metro.config.js
├── tsconfig.json
├── babel.config.js
├── .gitignore
├── android/                   # Native Android
│   └── .gitkeep
├── ios/                       # Native iOS
│   └── .gitkeep
└── src/
    └── ...
```

### Flutter (Future)

```
my-app/
├── lib/
│   ├── main.dart              # Entry point
│   └── screens/
│       └── home_screen.dart
├── pubspec.yaml               # Dependencies
├── analysis_options.yaml
├── android/
│   └── .gitkeep
├── ios/
│   └── .gitkeep
└── assets/
    └── .gitkeep
```

---

## Task Checklist

### Phase 1: Core Export (MVP)
- [ ] Install `archiver` package
- [ ] Create `ExportService`
- [ ] Create export API route
- [ ] Register routes
- [ ] Frontend API client
- [ ] Download utility
- [ ] Export button in workspace

### Phase 2: Enhancements
- [ ] Enhance FrameworkAdapter interface
- [ ] Add export logging/audit
- [ ] Handle binary assets
- [ ] Add progress indicator for large exports

### Phase 3: Additional Frameworks
- [ ] Bare React Native adapter
- [ ] Flutter adapter
- [ ] SwiftUI adapter (long-term)

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `archiver` | ^7.0.0 | ZIP file creation with streaming |
| `@types/archiver` | ^6.0.0 | TypeScript types |

---

## API Endpoint

```
GET /api/v1/projects/:projectId/export/zip

Query Parameters:
- includeBackendSDK: boolean (default: false)

Response:
- Content-Type: application/zip
- Content-Disposition: attachment; filename="project-slug.zip"
- Body: Binary ZIP stream

Errors:
- 401: Unauthorized
- 403: Forbidden (no project access)
- 404: Project not found
- 500: Export failed
```
