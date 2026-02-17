import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileStorageService } from "../file-storage.service";

vi.mock("../db/repositories/base.repository", () => ({
  BaseRepository: class {
    findAll = vi.fn();
    findOne = vi.fn();
    findById = vi.fn();
    findByUuid = vi.fn();
    create = vi.fn();
    update = vi.fn();
    softDelete = vi.fn();
    count = vi.fn();
  },
}));

vi.mock("../../db", () => ({
  AppDataSource: {
    getRepository: vi.fn(() => ({
      update: vi.fn(),
    })),
  },
  ProjectFile: class {},
}));

vi.mock("../../config", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    isDev: false,
    isProd: false,
    isTest: true,
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("FileStorageService", () => {
  let service: FileStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileStorageService();
  });

  describe("getFileTree", () => {
    it("should build file tree from flat file list", async () => {
      const mockFiles = [
        { path: "App.tsx", name: "App.tsx", is_directory: false, language: "typescript", size_bytes: 100 },
        { path: "components/Button.tsx", name: "Button.tsx", is_directory: false, language: "typescript", size_bytes: 200 },
        { path: "components/Input.tsx", name: "Input.tsx", is_directory: false, language: "typescript", size_bytes: 150 },
        { path: "screens/Home.tsx", name: "Home.tsx", is_directory: false, language: "typescript", size_bytes: 300 },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const tree = await service.getFileTree(1);

      expect(tree).toBeDefined();
      expect(tree.length).toBeGreaterThan(0);

      const appFile = tree.find(n => n.name === "App.tsx");
      expect(appFile).toBeDefined();
      expect(appFile?.type).toBe("file");

      const componentsDir = tree.find(n => n.name === "components");
      expect(componentsDir).toBeDefined();
      expect(componentsDir?.type).toBe("directory");
      expect(componentsDir?.children?.length).toBe(2);
    });

    it("should handle empty file list", async () => {
      vi.spyOn(service, "findByProjectId").mockResolvedValue([]);

      const tree = await service.getFileTree(1);

      expect(tree).toEqual([]);
    });

    it("should handle deeply nested paths", async () => {
      const mockFiles = [
        { path: "src/features/auth/components/LoginForm.tsx", name: "LoginForm.tsx", is_directory: false },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const tree = await service.getFileTree(1);

      expect(tree[0]?.name).toBe("src");
      expect(tree[0]?.children?.[0]?.name).toBe("features");
    });
  });

  describe("getSnackFiles", () => {
    it("should convert files to Snack format", async () => {
      const mockFiles = [
        { path: "App.tsx", content: "export default function App() {}", is_directory: false },
        { path: "components/Button.tsx", content: "export function Button() {}", is_directory: false },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const snackFiles = await service.getSnackFiles(1);

      expect(snackFiles["App.tsx"]).toBeDefined();
      expect(snackFiles["App.tsx"].type).toBe("CODE");
      expect(snackFiles["App.tsx"].contents).toBe("export default function App() {}");

      expect(snackFiles["components/Button.tsx"]).toBeDefined();
    });

    it("should identify asset files", async () => {
      const mockFiles = [
        { path: "assets/logo.png", content: "base64data", is_directory: false },
        { path: "App.tsx", content: "code", is_directory: false },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const snackFiles = await service.getSnackFiles(1);

      expect(snackFiles["assets/logo.png"]?.type).toBe("ASSET");
      expect(snackFiles["App.tsx"]?.type).toBe("CODE");
    });

    it("should skip directories", async () => {
      const mockFiles = [
        { path: "components", is_directory: true, content: null },
        { path: "components/Button.tsx", is_directory: false, content: "code" },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const snackFiles = await service.getSnackFiles(1);

      expect(snackFiles["components"]).toBeUndefined();
      expect(snackFiles["components/Button.tsx"]).toBeDefined();
    });

    it("should normalize paths for Snack", async () => {
      const mockFiles = [
        { path: "src/components/Button.tsx", content: "code", is_directory: false },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const snackFiles = await service.getSnackFiles(1);

      expect(snackFiles["components/Button.tsx"]).toBeDefined();
      expect(snackFiles["src/components/Button.tsx"]).toBeUndefined();
    });
  });

  describe("getFilesForFrontend", () => {
    it("should format files for frontend consumption", async () => {
      const mockFiles = [
        {
          uuid: "file-uuid",
          path: "App.tsx",
          name: "App.tsx",
          is_directory: false,
          content: "export default function App() {}",
          language: "typescript",
          size_bytes: 100,
          version: 1,
          updated_on: new Date("2024-01-01"),
        },
      ];

      vi.spyOn(service, "findByProjectId").mockResolvedValue(mockFiles as any);

      const files = await service.getFilesForFrontend(1);

      expect(files).toHaveLength(1);
      expect(files[0]).toEqual({
        uuid: "file-uuid",
        path: "App.tsx",
        name: "App.tsx",
        type: "file",
        content: "export default function App() {}",
        language: "typescript",
        size_bytes: 100,
        version: 1,
        updated_on: new Date("2024-01-01"),
      });
    });
  });
});

describe("FileStorageService language inference", () => {
  let service: FileStorageService;

  beforeEach(() => {
    service = new FileStorageService();
  });

  it("should infer typescript for .ts files", () => {
    const language = (service as any).inferLanguage("utils/helpers.ts");
    expect(language).toBe("typescript");
  });

  it("should infer typescript for .tsx files", () => {
    const language = (service as any).inferLanguage("components/Button.tsx");
    expect(language).toBe("typescript");
  });

  it("should infer javascript for .js files", () => {
    const language = (service as any).inferLanguage("config.js");
    expect(language).toBe("javascript");
  });

  it("should infer json for .json files", () => {
    const language = (service as any).inferLanguage("package.json");
    expect(language).toBe("json");
  });

  it("should return plaintext for unknown extensions", () => {
    const language = (service as any).inferLanguage("README");
    expect(language).toBe("plaintext");
  });
});

describe("FileStorageService asset detection", () => {
  let service: FileStorageService;

  beforeEach(() => {
    service = new FileStorageService();
  });

  it("should detect PNG as asset", () => {
    const isAsset = (service as any).isAssetFile("logo.png");
    expect(isAsset).toBe(true);
  });

  it("should detect JPG as asset", () => {
    const isAsset = (service as any).isAssetFile("photo.jpg");
    expect(isAsset).toBe(true);
  });

  it("should detect SVG as asset", () => {
    const isAsset = (service as any).isAssetFile("icon.svg");
    expect(isAsset).toBe(true);
  });

  it("should not detect TSX as asset", () => {
    const isAsset = (service as any).isAssetFile("Button.tsx");
    expect(isAsset).toBe(false);
  });

  it("should handle case insensitivity", () => {
    const isAsset = (service as any).isAssetFile("IMAGE.PNG");
    expect(isAsset).toBe(true);
  });
});
