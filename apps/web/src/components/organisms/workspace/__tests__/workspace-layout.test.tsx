import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WorkspaceLayout } from "../workspace-layout";

const mockUseUIStore = vi.fn();
const mockUseProjectFilesSync = vi.fn();

vi.mock("@/stores", () => ({
  useUIStore: () => mockUseUIStore(),
  useProjectStore: () => ({
    files: new Map(),
    fileTree: [],
    setFiles: vi.fn(),
    setFileTree: vi.fn(),
  }),
}));

vi.mock("@/hooks", () => ({
  useProjectFilesSync: () => mockUseProjectFilesSync(),
}));

vi.mock("react-resizable-panels", () => ({
  Panel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="panel" className={className}>
      {children}
    </div>
  ),
  Group: ({
    children,
    orientation,
    className,
  }: {
    children: React.ReactNode;
    orientation?: string;
    className?: string;
  }) => (
    <div data-testid="panel-group" data-orientation={orientation} className={className}>
      {children}
    </div>
  ),
}));

vi.mock("../resize-handle", () => ({
  ResizeHandle: () => <div data-testid="resize-handle" />,
}));

vi.mock("../agent-panel", () => ({
  AgentPanel: ({ projectId }: { projectId: string }) => (
    <div data-testid="agent-panel" data-project-id={projectId}>
      Agent Panel
    </div>
  ),
}));

vi.mock("../center-canvas", () => ({
  CenterCanvas: () => <div data-testid="center-canvas">Center Canvas</div>,
}));

vi.mock("../right-panel", () => ({
  RightPanel: ({ projectId }: { projectId: string }) => (
    <div data-testid="right-panel" data-project-id={projectId}>
      Right Panel
    </div>
  ),
}));

vi.mock("../status-bar", () => ({
  StatusBar: () => <div data-testid="status-bar">Status Bar</div>,
}));

describe("WorkspaceLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectFilesSync.mockReturnValue({ fileCount: 0 });
  });

  describe("rendering", () => {
    it("should render panel group after mount", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByTestId("panel-group")).toBeInTheDocument();
      });
    });

    it("should render workspace after mounting", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByTestId("panel-group")).toBeInTheDocument();
      });
    });

    it("should always render status bar", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByTestId("status-bar")).toBeInTheDocument();
      });
    });
  });

  describe("agent mode", () => {
    it("should render agent panel in agent mode", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByTestId("agent-panel")).toBeInTheDocument();
      });
    });

    it("should pass projectId to agent panel", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="my-project-123" />);

      await waitFor(() => {
        expect(screen.getByTestId("agent-panel")).toHaveAttribute(
          "data-project-id",
          "my-project-123"
        );
      });
    });

    it("should render three panels in agent mode", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        const panels = screen.getAllByTestId("panel");
        expect(panels.length).toBe(3);
      });
    });
  });

  describe("code editor mode", () => {
    it("should not render agent panel in code mode", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "code-editor" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.queryByTestId("agent-panel")).not.toBeInTheDocument();
      });
    });

    it("should render two panels in code mode", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "code-editor" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        const panels = screen.getAllByTestId("panel");
        expect(panels.length).toBe(2);
      });
    });
  });

  describe("builder mode", () => {
    it("should not render agent panel in builder mode", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "builder" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.queryByTestId("agent-panel")).not.toBeInTheDocument();
      });
    });

    it("should render two panels in builder mode", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "builder" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        const panels = screen.getAllByTestId("panel");
        expect(panels.length).toBe(2);
      });
    });
  });

  describe("common elements", () => {
    it("should always render center canvas", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByTestId("center-canvas")).toBeInTheDocument();
      });
    });

    it("should always render right panel", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        expect(screen.getByTestId("right-panel")).toBeInTheDocument();
      });
    });

    it("should always render resize handles", async () => {
      mockUseUIStore.mockReturnValue({ activeMode: "agent" });

      render(<WorkspaceLayout projectId="test-project" />);

      await waitFor(() => {
        const handles = screen.getAllByTestId("resize-handle");
        expect(handles.length).toBeGreaterThan(0);
      });
    });
  });
});
