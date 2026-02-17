import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUIStore } from "../ui-store";

vi.mock("zustand/middleware", async () => {
  const actual = await vi.importActual<typeof import("zustand/middleware")>("zustand/middleware");
  return {
    ...actual,
    persist: (fn: unknown) => fn,
  };
});

describe("useUIStore", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.reset();
    });
  });

  describe("activeMode", () => {
    it("should default to agent mode", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.activeMode).toBe("agent");
    });

    it("should update active mode", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setActiveMode("builder");
      });

      expect(result.current.activeMode).toBe("builder");
    });

    it("should support code-editor mode", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setActiveMode("code-editor");
      });

      expect(result.current.activeMode).toBe("code-editor");
    });
  });

  describe("panel toggles", () => {
    it("should toggle left panel", () => {
      const { result } = renderHook(() => useUIStore());
      const initial = result.current.isLeftPanelOpen;

      act(() => {
        result.current.toggleLeftPanel();
      });

      expect(result.current.isLeftPanelOpen).toBe(!initial);
    });

    it("should toggle right panel", () => {
      const { result } = renderHook(() => useUIStore());
      const initial = result.current.isRightPanelOpen;

      act(() => {
        result.current.toggleRightPanel();
      });

      expect(result.current.isRightPanelOpen).toBe(!initial);
    });

    it("should toggle bottom panel", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleBottomPanel();
      });

      expect(result.current.isBottomPanelOpen).toBe(true);
    });

    it("should set panel open state directly", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setLeftPanelOpen(false);
        result.current.setRightPanelOpen(false);
      });

      expect(result.current.isLeftPanelOpen).toBe(false);
      expect(result.current.isRightPanelOpen).toBe(false);
    });
  });

  describe("right panel mode", () => {
    it("should default to preview", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.rightPanelMode).toBe("preview");
    });

    it("should switch to inspector", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setRightPanelMode("inspector");
      });

      expect(result.current.rightPanelMode).toBe("inspector");
    });
  });

  describe("file tabs", () => {
    it("should open a file tab", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openFileTab("App.tsx");
      });

      expect(result.current.openFileTabs).toContain("App.tsx");
      expect(result.current.activeFileTab).toBe("App.tsx");
    });

    it("should not duplicate file tabs", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openFileTab("App.tsx");
        result.current.openFileTab("App.tsx");
      });

      expect(result.current.openFileTabs.filter((t) => t === "App.tsx")).toHaveLength(1);
    });

    it("should close a file tab", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openFileTab("App.tsx");
        result.current.openFileTab("Button.tsx");
        result.current.closeFileTab("App.tsx");
      });

      expect(result.current.openFileTabs).not.toContain("App.tsx");
      expect(result.current.activeFileTab).toBe("Button.tsx");
    });

    it("should set active tab to next when closing active", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openFileTab("first.tsx");
        result.current.openFileTab("second.tsx");
        result.current.openFileTab("third.tsx");
        result.current.setActiveFileTab("second.tsx");
        result.current.closeFileTab("second.tsx");
      });

      expect(result.current.activeFileTab).toBe("third.tsx");
    });

    it("should reorder file tabs", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openFileTab("a.tsx");
        result.current.openFileTab("b.tsx");
        result.current.openFileTab("c.tsx");
        result.current.reorderFileTabs(0, 2);
      });

      expect(result.current.openFileTabs).toEqual(["b.tsx", "c.tsx", "a.tsx"]);
    });
  });

  describe("tree nodes", () => {
    it("should toggle tree node expansion", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleTreeNode("components");
      });

      expect(result.current.expandedTreeNodes.has("components")).toBe(true);

      act(() => {
        result.current.toggleTreeNode("components");
      });

      expect(result.current.expandedTreeNodes.has("components")).toBe(false);
    });

    it("should expand tree node", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.expandTreeNode("screens");
      });

      expect(result.current.expandedTreeNodes.has("screens")).toBe(true);
    });

    it("should collapse tree node", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.expandTreeNode("screens");
        result.current.collapseTreeNode("screens");
      });

      expect(result.current.expandedTreeNodes.has("screens")).toBe(false);
    });

    it("should set multiple expanded nodes", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setExpandedTreeNodes(["a", "b", "c"]);
      });

      expect(result.current.expandedTreeNodes.has("a")).toBe(true);
      expect(result.current.expandedTreeNodes.has("b")).toBe(true);
      expect(result.current.expandedTreeNodes.has("c")).toBe(true);
    });
  });

  describe("canvas", () => {
    it("should set canvas zoom within bounds", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setCanvasZoom(2);
      });

      expect(result.current.canvasZoom).toBe(2);

      act(() => {
        result.current.setCanvasZoom(0.1);
      });

      expect(result.current.canvasZoom).toBe(0.25);

      act(() => {
        result.current.setCanvasZoom(10);
      });

      expect(result.current.canvasZoom).toBe(4);
    });

    it("should set canvas offset", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setCanvasOffset({ x: 100, y: 200 });
      });

      expect(result.current.canvasOffset).toEqual({ x: 100, y: 200 });
    });

    it("should reset canvas view", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setCanvasZoom(2);
        result.current.setCanvasOffset({ x: 100, y: 200 });
        result.current.resetCanvasView();
      });

      expect(result.current.canvasZoom).toBe(1);
      expect(result.current.canvasOffset).toEqual({ x: 0, y: 0 });
    });
  });

  describe("modals", () => {
    it("should open modal with data", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal("createProject", { name: "test" });
      });

      expect(result.current.modals.createProject.isOpen).toBe(true);
      expect(result.current.modals.createProject.data).toEqual({ name: "test" });
    });

    it("should close modal", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal("createProject");
        result.current.closeModal("createProject");
      });

      expect(result.current.modals.createProject.isOpen).toBe(false);
    });

    it("should close all modals", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal("createProject");
        result.current.openModal("deleteProject");
        result.current.closeAllModals();
      });

      expect(result.current.modals.createProject.isOpen).toBe(false);
      expect(result.current.modals.deleteProject.isOpen).toBe(false);
    });
  });

  describe("theme", () => {
    it("should default to system theme", () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.theme).toBe("system");
    });

    it("should set theme", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
    });
  });

  describe("layout presets", () => {
    it("should apply chat-focus preset", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.applyLayoutPreset("chat-focus");
      });

      expect(result.current.panelSizes.left).toBe(40);
      expect(result.current.panelSizes.center).toBe(60);
      expect(result.current.panelSizes.right).toBe(0);
      expect(result.current.isRightPanelOpen).toBe(false);
    });

    it("should apply build-focus preset", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.applyLayoutPreset("build-focus");
      });

      expect(result.current.panelSizes.left).toBe(0);
      expect(result.current.isLeftPanelOpen).toBe(false);
    });

    it("should apply balanced preset", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.applyLayoutPreset("balanced");
      });

      expect(result.current.panelSizes.left).toBe(25);
      expect(result.current.panelSizes.center).toBe(50);
      expect(result.current.panelSizes.right).toBe(25);
    });
  });

  describe("command palette", () => {
    it("should toggle command palette", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleCommandPalette();
      });

      expect(result.current.commandPaletteOpen).toBe(true);

      act(() => {
        result.current.toggleCommandPalette();
      });

      expect(result.current.commandPaletteOpen).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset all state to defaults", () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setActiveMode("builder");
        result.current.openFileTab("test.tsx");
        result.current.setCanvasZoom(2);
        result.current.reset();
      });

      expect(result.current.activeMode).toBe("agent");
      expect(result.current.openFileTabs).toEqual([]);
      expect(result.current.canvasZoom).toBe(1);
    });
  });
});
