import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileExplorer } from "../file-explorer";

const mockUseUIStore = vi.fn();
const mockUseProjectStore = vi.fn();

vi.mock("@/stores", () => ({
  useUIStore: () => mockUseUIStore(),
  useProjectStore: (selector?: (state: unknown) => unknown) => {
    const state = mockUseProjectStore();
    return selector ? selector(state) : state;
  },
}));

describe("FileExplorer", () => {
  const mockToggleTreeNode = vi.fn();
  const mockOpenFileTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseUIStore.mockReturnValue({
      expandedTreeNodes: new Set<string>(),
      toggleTreeNode: mockToggleTreeNode,
      openFileTab: mockOpenFileTab,
      activeFileTab: null,
    });

    mockUseProjectStore.mockReturnValue({
      files: new Map(),
    });
  });

  describe("empty state", () => {
    it("should show empty state when no files", () => {
      render(<FileExplorer />);

      expect(screen.getByText("No files yet")).toBeInTheDocument();
      expect(screen.getByText("Generate code using the chat panel")).toBeInTheDocument();
    });
  });

  describe("file rendering", () => {
    it("should render single file", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("App.tsx")).toBeInTheDocument();
    });

    it("should render multiple files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
          ["index.ts", { path: "index.ts", name: "index.ts", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("App.tsx")).toBeInTheDocument();
      expect(screen.getByText("index.ts")).toBeInTheDocument();
    });

    it("should render TypeScript icon for .tsx files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("TS")).toBeInTheDocument();
    });

    it("should render JavaScript icon for .js files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["config.js", { path: "config.js", name: "config.js", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("JS")).toBeInTheDocument();
    });

    it("should render JSON icon for .json files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["package.json", { path: "package.json", name: "package.json", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("{}")).toBeInTheDocument();
    });
  });

  describe("folder structure", () => {
    it("should create folder for nested files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("components")).toBeInTheDocument();
    });

    it("should show files inside expanded folder", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(["components"]),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: null,
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("Button.tsx")).toBeInTheDocument();
    });

    it("should hide files inside collapsed folder", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: null,
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();
    });

    it("should handle deeply nested paths", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(["src", "src/features", "src/features/auth"]),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: null,
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["src/features/auth/Login.tsx", { path: "src/features/auth/Login.tsx", name: "Login.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      expect(screen.getByText("src")).toBeInTheDocument();
      expect(screen.getByText("features")).toBeInTheDocument();
      expect(screen.getByText("auth")).toBeInTheDocument();
      expect(screen.getByText("Login.tsx")).toBeInTheDocument();
    });
  });

  describe("folder sorting", () => {
    it("should sort folders before files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      const items = screen.getAllByRole("button");
      const itemTexts = items.map((item) => item.textContent);

      const componentsIndex = itemTexts.findIndex((t) => t?.includes("components"));
      const appIndex = itemTexts.findIndex((t) => t?.includes("App.tsx"));

      expect(componentsIndex).toBeLessThan(appIndex);
    });

    it("should sort items alphabetically within type", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["zebra.ts", { path: "zebra.ts", name: "zebra.ts", type: "file" }],
          ["apple.ts", { path: "apple.ts", name: "apple.ts", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      const items = screen.getAllByRole("button");
      const itemTexts = items.map((item) => item.textContent);

      const appleIndex = itemTexts.findIndex((t) => t?.includes("apple.ts"));
      const zebraIndex = itemTexts.findIndex((t) => t?.includes("zebra.ts"));

      expect(appleIndex).toBeLessThan(zebraIndex);
    });
  });

  describe("interactions", () => {
    it("should toggle folder on click", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      fireEvent.click(screen.getByText("components"));

      expect(mockToggleTreeNode).toHaveBeenCalledWith("components");
    });

    it("should open file on click", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      fireEvent.click(screen.getByText("App.tsx"));

      expect(mockOpenFileTab).toHaveBeenCalledWith("App.tsx");
    });

    it("should not open file when clicking folder", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      fireEvent.click(screen.getByText("components"));

      expect(mockOpenFileTab).not.toHaveBeenCalled();
    });
  });

  describe("active state", () => {
    it("should highlight active file", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: "App.tsx",
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      const button = screen.getByText("App.tsx").closest("button");
      expect(button).toHaveClass("bg-accent");
    });

    it("should not highlight non-active file", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: "Other.tsx",
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file" }],
        ]),
      });

      render(<FileExplorer />);

      const button = screen.getByText("App.tsx").closest("button");
      expect(button).not.toHaveClass("bg-accent");
    });
  });

  describe("modified indicator", () => {
    it("should show modified indicator for modified files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file", modified: true }],
        ]),
      });

      const { container } = render(<FileExplorer />);

      const modifiedIndicator = container.querySelector(".bg-yellow-500");
      expect(modifiedIndicator).toBeInTheDocument();
    });

    it("should not show modified indicator for unmodified files", () => {
      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["App.tsx", { path: "App.tsx", name: "App.tsx", type: "file", modified: false }],
        ]),
      });

      const { container } = render(<FileExplorer />);

      const modifiedIndicator = container.querySelector(".bg-yellow-500");
      expect(modifiedIndicator).not.toBeInTheDocument();
    });
  });

  describe("folder icons", () => {
    it("should show closed folder icon when collapsed", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: null,
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      const { container } = render(<FileExplorer />);

      expect(container.querySelector(".lucide-folder")).toBeInTheDocument();
    });

    it("should show open folder icon when expanded", () => {
      mockUseUIStore.mockReturnValue({
        expandedTreeNodes: new Set(["components"]),
        toggleTreeNode: mockToggleTreeNode,
        openFileTab: mockOpenFileTab,
        activeFileTab: null,
      });

      mockUseProjectStore.mockReturnValue({
        files: new Map([
          ["components/Button.tsx", { path: "components/Button.tsx", name: "Button.tsx", type: "file" }],
        ]),
      });

      const { container } = render(<FileExplorer />);

      expect(container.querySelector(".lucide-folder-open")).toBeInTheDocument();
    });
  });
});
