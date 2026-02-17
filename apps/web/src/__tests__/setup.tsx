import "@testing-library/jest-dom";
import { vi } from "vitest";
import { enableMapSet } from "immer";

enableMapSet();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/workspace/test-project",
  useParams: () => ({ projectId: "test-project" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value: string; onChange?: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
  Editor: ({ value, onChange }: { value: string; onChange?: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("snack-sdk", () => ({
  Snack: class MockSnack {
    constructor() {}
    updateFiles = vi.fn();
    getState = vi.fn().mockReturnValue({
      url: "https://snack.expo.dev/test",
      files: {},
    });
    addStateListener = vi.fn().mockReturnValue(() => {});
    setOnline = vi.fn();
  },
  SnackTransport: class {},
  createRuntimeUrl: vi.fn().mockReturnValue("https://snack.expo.dev/test"),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock;
