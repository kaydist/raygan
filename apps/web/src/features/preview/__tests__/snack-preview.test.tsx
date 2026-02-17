import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SnackPreview } from "../components/snack-preview";

const mockUseSnackPreview = vi.fn();

vi.mock("../hooks", () => ({
  useSnackPreview: () => mockUseSnackPreview(),
}));

vi.mock("../components/device-frame", () => ({
  DeviceFrame: ({
    children,
    platform,
  }: {
    children: React.ReactNode;
    platform: string;
  }) => (
    <div data-testid="device-frame" data-platform={platform}>
      {children}
    </div>
  ),
}));

vi.mock("../components/device-selector", () => ({
  DeviceSelector: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="device-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="ios">iOS</option>
      <option value="android">Android</option>
    </select>
  ),
}));

vi.mock("../components/qr-code-display", () => ({
  QRCodeDisplay: ({ url, size }: { url: string; size: number }) => (
    <div data-testid="qr-code-display" data-url={url} data-size={size}>
      QR Code
    </div>
  ),
}));

vi.mock("@/components/atoms", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    className?: string;
  }) => (
    <button
      data-testid={`button-${variant || "default"}`}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe("SnackPreview", () => {
  const mockSyncFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSnackPreview.mockReturnValue({
      isConnected: true,
      isLoading: false,
      error: null,
      webPreviewURL: "https://snack.expo.dev/preview",
      qrCodeURL: "https://expo.dev/qr",
      errors: [],
      syncFiles: mockSyncFiles,
    });
  });

  describe("rendering", () => {
    it("should render preview header", () => {
      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("should render mode toggle buttons", () => {
      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText("Web")).toBeInTheDocument();
      expect(screen.getByText("Device")).toBeInTheDocument();
    });

    it("should render refresh button", () => {
      render(<SnackPreview projectId="test-project" />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when loading", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: false,
        isLoading: true,
        error: null,
        webPreviewURL: null,
        qrCodeURL: null,
        errors: [],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText("Connecting Simulator...")).toBeInTheDocument();
    });

    it("should disable refresh while loading", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: false,
        isLoading: true,
        error: null,
        webPreviewURL: null,
        qrCodeURL: null,
        errors: [],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.some((btn) => btn.hasAttribute("disabled"))).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should display error message", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: false,
        isLoading: false,
        error: "Failed to connect",
        webPreviewURL: null,
        qrCodeURL: null,
        errors: [],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText("Failed to connect")).toBeInTheDocument();
    });

    it("should display compilation errors", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: true,
        isLoading: false,
        error: null,
        webPreviewURL: "https://snack.expo.dev/preview",
        qrCodeURL: "https://expo.dev/qr",
        errors: [
          { message: "SyntaxError: Unexpected token" },
          { message: "TypeError: undefined is not a function" },
        ],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText("Compilation errors detected")).toBeInTheDocument();
      expect(screen.getByText("SyntaxError: Unexpected token")).toBeInTheDocument();
    });

    it("should truncate many errors", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: true,
        isLoading: false,
        error: null,
        webPreviewURL: "https://snack.expo.dev/preview",
        qrCodeURL: "https://expo.dev/qr",
        errors: [
          { message: "Error 1" },
          { message: "Error 2" },
          { message: "Error 3" },
          { message: "Error 4" },
          { message: "Error 5" },
        ],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText(/and 2 more errors/)).toBeInTheDocument();
    });
  });

  describe("web preview mode", () => {
    it("should show device selector in web mode", () => {
      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByTestId("device-selector")).toBeInTheDocument();
    });

    it("should render iframe when connected", () => {
      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByTestId("device-frame")).toBeInTheDocument();
      expect(screen.getByTitle("Simulator Preview")).toBeInTheDocument();
    });

    it("should show placeholder when no preview URL", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: false,
        isLoading: false,
        error: null,
        webPreviewURL: null,
        qrCodeURL: null,
        errors: [],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByText("Preview will appear when connected")).toBeInTheDocument();
    });
  });

  describe("device preview mode", () => {
    it("should switch to device mode", () => {
      render(<SnackPreview projectId="test-project" />);

      fireEvent.click(screen.getByText("Device"));

      expect(screen.getByTestId("qr-code-display")).toBeInTheDocument();
    });

    it("should hide device selector in device mode", () => {
      render(<SnackPreview projectId="test-project" />);

      fireEvent.click(screen.getByText("Device"));

      expect(screen.queryByTestId("device-selector")).not.toBeInTheDocument();
    });

    it("should display QR code with correct URL", () => {
      render(<SnackPreview projectId="test-project" />);

      fireEvent.click(screen.getByText("Device"));

      expect(screen.getByTestId("qr-code-display")).toHaveAttribute(
        "data-url",
        "https://expo.dev/qr"
      );
    });
  });

  describe("platform selection", () => {
    it("should default to iOS", () => {
      render(<SnackPreview projectId="test-project" />);

      expect(screen.getByTestId("device-frame")).toHaveAttribute(
        "data-platform",
        "ios"
      );
    });

    it("should change platform when selected", () => {
      render(<SnackPreview projectId="test-project" />);

      fireEvent.change(screen.getByTestId("device-selector"), {
        target: { value: "android" },
      });

      expect(screen.getByTestId("device-frame")).toHaveAttribute(
        "data-platform",
        "android"
      );
    });
  });

  describe("sync functionality", () => {
    it("should call syncFiles on refresh click in empty state", () => {
      mockUseSnackPreview.mockReturnValue({
        isConnected: false,
        isLoading: false,
        error: null,
        webPreviewURL: null,
        qrCodeURL: null,
        errors: [],
        syncFiles: mockSyncFiles,
      });

      render(<SnackPreview projectId="test-project" />);

      const refreshButton = screen.getByText("Refresh Preview");
      fireEvent.click(refreshButton);

      expect(mockSyncFiles).toHaveBeenCalled();
    });
  });

  describe("project name", () => {
    it("should use default project name", () => {
      render(<SnackPreview projectId="test-project" />);

      expect(mockUseSnackPreview).toHaveBeenCalled();
    });

    it("should use custom project name", () => {
      render(
        <SnackPreview projectId="test-project" projectName="My Custom App" />
      );

      expect(mockUseSnackPreview).toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <SnackPreview projectId="test-project" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
