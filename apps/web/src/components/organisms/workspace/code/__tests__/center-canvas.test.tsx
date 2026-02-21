import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CenterCanvas } from "../center-canvas";

const mockUseUIStore = vi.fn();
const mockUseProjectStore = vi.fn();

vi.mock("@/stores", () => ({
  useUIStore: (selector?: (state: unknown) => unknown) => {
    const state = mockUseUIStore();
    return selector ? selector(state) : state;
  },
  useProjectStore: (selector?: (state: unknown) => unknown) => {
    const state = mockUseProjectStore();
    return selector ? selector(state) : state;
  },
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="panel" className={className}>
      {children}
    </div>
  ),
  PanelGroup: ({
    children,
    direction,
    className,
  }: {
    children: React.ReactNode;
    direction: string;
    className?: string;
  }) => (
    <div data-testid="panel-group" data-direction={direction} className={className}>
      {children}
    </div>
  ),
}));

vi.mock("../../resize-handle", () => ({
  ResizeHandle: () => <div data-testid="resize-handle" />,
}));

vi.mock("../file-explorer", () => ({
  FileExplorer: () => <div data-testid="file-explorer">File Explorer</div>,
}));

vi.mock("@/features/code-editor", () => ({
  CodeEditor: ({ filePath }: { filePath: string }) => (
    <div data-testid="code-editor" data-file-path={filePath}>
      Code Editor
    </div>
  ),
}));

vi.mock("@/components/atoms", () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button data-testid="button" data-variant={variant} onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("CenterCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectStore.mockReturnValue({
      files: new Map(),
      openFileTabs: [],
      activeFileTab: null,
    });
  });

  describe("mode rendering", () => {
    it("should render BuilderCanvas in builder mode", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "builder",
        openFileTabs: [],
        activeFileTab: null,
      });

      render(<CenterCanvas />);

      expect(screen.getByText("Visual Builder")).toBeInTheDocument();
      expect(screen.getByText("Drag components to build your UI")).toBeInTheDocument();
    });

    it("should render FileExplorerPanel in agent mode", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "agent",
        openFileTabs: [],
        activeFileTab: null,
      });

      render(<CenterCanvas />);

      expect(screen.getByText("Explorer")).toBeInTheDocument();
      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });

    it("should render CodeWorkspace in code-editor mode", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "code-editor",
        openFileTabs: [],
        activeFileTab: null,
      });

      render(<CenterCanvas />);

      expect(screen.getByTestId("panel-group")).toBeInTheDocument();
      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });
  });

  describe("CodeWorkspace", () => {
    it("should show empty state when no file is selected", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "code-editor",
        openFileTabs: [],
        activeFileTab: null,
        closeFileTab: vi.fn(),
        setActiveFileTab: vi.fn(),
      });
      mockUseProjectStore.mockReturnValue({
        files: new Map(),
      });

      render(<CenterCanvas />);

      expect(screen.getByText("Select a file to edit")).toBeInTheDocument();
    });

    it("should show file not found when file doesn't exist", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "code-editor",
        openFileTabs: ["missing.tsx"],
        activeFileTab: "missing.tsx",
        closeFileTab: vi.fn(),
        setActiveFileTab: vi.fn(),
      });
      mockUseProjectStore.mockReturnValue({
        files: new Map(),
      });

      render(<CenterCanvas />);

      expect(screen.getByText("File not found")).toBeInTheDocument();
    });

    it("should render code editor when file exists", () => {
      const files = new Map([
        ["App.tsx", { content: "export default function App() {}", path: "App.tsx" }],
      ]);

      mockUseUIStore.mockReturnValue({
        activeMode: "code-editor",
        openFileTabs: ["App.tsx"],
        activeFileTab: "App.tsx",
        closeFileTab: vi.fn(),
        setActiveFileTab: vi.fn(),
      });
      mockUseProjectStore.mockReturnValue({ files });

      render(<CenterCanvas />);

      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
      expect(screen.getByTestId("code-editor")).toHaveAttribute("data-file-path", "App.tsx");
    });
  });

  describe("BuilderCanvas", () => {
    it("should render phone mockup frame", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "builder",
        openFileTabs: [],
        activeFileTab: null,
      });

      const { container } = render(<CenterCanvas />);

      const phoneFrame = container.querySelector(".rounded-\\[32px\\]");
      expect(phoneFrame).toBeInTheDocument();
    });

    it("should render zoom controls", () => {
      mockUseUIStore.mockReturnValue({
        activeMode: "builder",
        openFileTabs: [],
        activeFileTab: null,
      });

      render(<CenterCanvas />);

      const buttons = screen.getAllByTestId("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });
});
