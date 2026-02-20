import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatPanel } from "../components/chat-panel";

const mockUseConversations = vi.fn();
const mockUseGenerate = vi.fn();

vi.mock("@/lib/api/queries", () => ({
  useConversations: () => mockUseConversations(),
}));

vi.mock("../hooks/use-generate", () => ({
  useGenerate: () => mockUseGenerate(),
}));

vi.mock("../components/message-list", () => ({
  MessageList: ({ messages }: { messages: Array<{ id: string; content: string }> }) => (
    <div data-testid="message-list">
      {messages.map((m) => (
        <div key={m.id} data-testid="message">
          {m.content}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../components/prompt-input", () => ({
  PromptInput: ({
    onSubmit,
    onStop,
    isGenerating,
  }: {
    onSubmit: (prompt: string) => void;
    onStop: () => void;
    isGenerating: boolean;
  }) => (
    <div data-testid="prompt-input">
      <input
        data-testid="prompt-textarea"
        onChange={(e) => e.target.value}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            onSubmit((e.target as HTMLInputElement).value);
          }
        }}
      />
      {isGenerating ? (
        <button data-testid="stop-button" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button
          data-testid="send-button"
          onClick={() => {
            const input = document.querySelector(
              '[data-testid="prompt-textarea"]'
            ) as HTMLInputElement;
            onSubmit(input?.value || "test message");
          }}
        >
          Send
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/atoms", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe("ChatPanel", () => {
  const mockGenerate = vi.fn();
  const mockStop = vi.fn();
  const mockClearMessages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseConversations.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseGenerate.mockReturnValue({
      messages: [],
      isGenerating: false,
      error: null,
      generate: mockGenerate,
      stop: mockStop,
      clearMessages: mockClearMessages,
    });
  });

  describe("rendering", () => {
    it("should render chat header", () => {
      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByText("Chat")).toBeInTheDocument();
    });

    it("should render prompt input", () => {
      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByTestId("prompt-input")).toBeInTheDocument();
    });

    it("should render message list", () => {
      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByTestId("message-list")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when loading history", () => {
      mockUseConversations.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(<ChatPanel projectId="test-project" />);

      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should hide loading spinner when history loaded", () => {
      mockUseConversations.mockReturnValue({
        data: [],
        isLoading: false,
      });

      const { container } = render(<ChatPanel projectId="test-project" />);

      expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("should display error banner when error exists", () => {
      mockUseGenerate.mockReturnValue({
        messages: [],
        isGenerating: false,
        error: "Something went wrong",
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("should not display error banner when no error", () => {
      render(<ChatPanel projectId="test-project" />);

      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  describe("messages", () => {
    it("should display messages from useGenerate hook", () => {
      mockUseGenerate.mockReturnValue({
        messages: [
          { id: "1", role: "user", content: "Hello", createdAt: new Date() },
          { id: "2", role: "assistant", content: "Hi there!", createdAt: new Date() },
        ],
        isGenerating: false,
        error: null,
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });

    it("should convert conversation history to messages", () => {
      mockUseConversations.mockReturnValue({
        data: [
          { uuid: "msg-1", role: "user", content: "Previous message", created_on: new Date().toISOString() },
        ],
        isLoading: false,
      });

      render(<ChatPanel projectId="test-project" />);

      expect(mockUseGenerate).toHaveBeenCalled();
    });
  });

  describe("clear messages", () => {
    it("should show clear button when messages exist", () => {
      mockUseGenerate.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Test", createdAt: new Date() }],
        isGenerating: false,
        error: null,
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("should not show clear button when no messages", () => {
      render(<ChatPanel projectId="test-project" />);

      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("should call clearMessages when clear button clicked", async () => {
      mockUseGenerate.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Test", createdAt: new Date() }],
        isGenerating: false,
        error: null,
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      fireEvent.click(screen.getByText("Clear"));

      expect(mockClearMessages).toHaveBeenCalled();
    });

    it("should disable clear button while generating", () => {
      mockUseGenerate.mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Test", createdAt: new Date() }],
        isGenerating: true,
        error: null,
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      const clearButton = screen.getByText("Clear").closest("button");
      expect(clearButton).toBeDisabled();
    });
  });

  describe("generating state", () => {
    it("should show stop button when generating", () => {
      mockUseGenerate.mockReturnValue({
        messages: [],
        isGenerating: true,
        error: null,
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      expect(screen.getByTestId("stop-button")).toBeInTheDocument();
    });

    it("should call stop when stop button clicked", async () => {
      mockUseGenerate.mockReturnValue({
        messages: [],
        isGenerating: true,
        error: null,
        generate: mockGenerate,
        stop: mockStop,
        clearMessages: mockClearMessages,
      });

      render(<ChatPanel projectId="test-project" />);

      fireEvent.click(screen.getByTestId("stop-button"));

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe("submitting prompts", () => {
    it("should call generate when send button clicked", async () => {
      render(<ChatPanel projectId="test-project" />);

      fireEvent.click(screen.getByTestId("send-button"));

      expect(mockGenerate).toHaveBeenCalledWith({ prompt: "test message" });
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <ChatPanel projectId="test-project" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
