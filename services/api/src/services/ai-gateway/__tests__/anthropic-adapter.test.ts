import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnthropicAdapter } from "../adapters/anthropic.adapter";
import type { GenerateRequest, StreamChunk } from "../types";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(),
        stream: vi.fn(),
      };
    },
  };
});

vi.mock("../../../config", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AnthropicAdapter", () => {
  let adapter: AnthropicAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AnthropicAdapter("test-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate", () => {
    it("should return generated content", async () => {
      const mockResponse = {
        id: "msg_123",
        model: "claude-sonnet-4",
        content: [{ type: "text", text: "Generated response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (adapter as any).client.messages.create = mockCreate;

      const request: GenerateRequest = {
        provider: "anthropic",
        model: "claude-sonnet-4",
        messages: [{ role: "user", content: "Hello" }],
        system_prompt: "You are helpful",
        max_tokens: 1000,
        temperature: 0.7,
      };

      const result = await adapter.generate(request);

      expect(result.content).toBe("Generated response");
      expect(result.provider).toBe("anthropic");
      expect(result.usage.input_tokens).toBe(10);
      expect(result.usage.output_tokens).toBe(20);
    });

    it("should retry on transient failures", async () => {
      const mockError = new Error("Rate limit exceeded");
      const mockResponse = {
        id: "msg_123",
        model: "claude-sonnet-4",
        content: [{ type: "text", text: "Success" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      (adapter as any).client.messages.create = mockCreate;

      const request: GenerateRequest = {
        provider: "anthropic",
        model: "claude-sonnet-4",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1000,
      };

      const result = await adapter.generate(request);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.content).toBe("Success");
    });
  });

  describe("stream", () => {
    it("should yield text deltas", async () => {
      const mockEvents = [
        { type: "content_block_delta", delta: { text: "Hello " } },
        { type: "content_block_delta", delta: { text: "World" } },
        { type: "message_stop" },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockEvents) {
            yield event;
          }
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };

      (adapter as any).client.messages.stream = vi.fn().mockReturnValue(mockStream);

      const request: GenerateRequest = {
        provider: "anthropic",
        model: "claude-sonnet-4",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1000,
      };

      const chunks: StreamChunk[] = [];
      for await (const chunk of adapter.stream(request)) {
        chunks.push(chunk);
      }

      const textChunks = chunks.filter((c) => c.type === "text_delta");
      expect(textChunks).toHaveLength(2);
      expect(textChunks[0]?.content).toBe("Hello ");
      expect(textChunks[1]?.content).toBe("World");
    });

    it("should yield usage information", async () => {
      const mockEvents = [
        { type: "content_block_delta", delta: { text: "Test" } },
        { type: "message_delta", usage: { output_tokens: 10 } },
        { type: "message_stop" },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockEvents) {
            yield event;
          }
        },
        finalMessage: vi.fn().mockResolvedValue({
          usage: { input_tokens: 5, output_tokens: 10 },
        }),
      };

      (adapter as any).client.messages.stream = vi.fn().mockReturnValue(mockStream);

      const request: GenerateRequest = {
        provider: "anthropic",
        model: "claude-sonnet-4",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1000,
      };

      const chunks: StreamChunk[] = [];
      for await (const chunk of adapter.stream(request)) {
        chunks.push(chunk);
      }

      const usageChunks = chunks.filter((c) => c.type === "usage");
      expect(usageChunks.length).toBeGreaterThan(0);
    });

    it("should handle stream errors", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          throw new Error("Connection lost");
        },
        finalMessage: vi.fn(),
      };

      (adapter as any).client.messages.stream = vi.fn().mockReturnValue(mockStream);

      const request: GenerateRequest = {
        provider: "anthropic",
        model: "claude-sonnet-4",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1000,
      };

      const chunks: StreamChunk[] = [];
      for await (const chunk of adapter.stream(request)) {
        chunks.push(chunk);
      }

      const errorChunks = chunks.filter((c) => c.type === "error");
      expect(errorChunks).toHaveLength(1);
      expect(errorChunks[0]?.error).toContain("Connection lost");
    });
  });

  describe("retry logic", () => {
    it("should identify retryable errors", () => {
      const retryableErrors = [
        new Error("rate limit exceeded"),
        new Error("timeout"),
        new Error("503 Service Unavailable"),
        new Error("overloaded"),
        new Error("ECONNRESET"),
        new Error("socket hang up"),
      ];

      for (const error of retryableErrors) {
        const isRetryable = (adapter as any).isRetryableError(error);
        expect(isRetryable).toBe(true);
      }
    });

    it("should not retry non-retryable errors", () => {
      const nonRetryableErrors = [
        new Error("invalid API key"),
        new Error("model not found"),
        new Error("insufficient credits"),
      ];

      for (const error of nonRetryableErrors) {
        const isRetryable = (adapter as any).isRetryableError(error);
        expect(isRetryable).toBe(false);
      }
    });
  });

  describe("validateConnection", () => {
    it("should return true on successful validation", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: "msg_123",
        content: [{ type: "text", text: "Hi" }],
      });

      (adapter as any).client.messages.create = mockCreate;

      const result = await adapter.validateConnection();

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 10,
        })
      );
    });

    it("should return false on validation failure", async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error("Invalid API key"));

      (adapter as any).client.messages.create = mockCreate;

      const result = await adapter.validateConnection();

      expect(result).toBe(false);
    });
  });
});
