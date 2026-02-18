import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import type { GenerateRequest, StreamChunk } from "../types";

let mockCreate: Mock;

vi.mock("openai", () => {
  const createFn = vi.fn();
  (globalThis as unknown as { __mockXAICreate: Mock }).__mockXAICreate = createFn;

  class MockOpenAI {
    chat = {
      completions: {
        create: createFn,
      },
    };
  }

  return {
    default: MockOpenAI,
    APIError: class APIError extends Error {
      status: number;
      constructor(status: number, message: string) {
        super(message);
        this.status = status;
      }
    },
  };
});

import { XAIAdapter } from "../adapters/xai.adapter";

describe("XAIAdapter", () => {
  let adapter: XAIAdapter;

  beforeEach(() => {
    mockCreate = (globalThis as unknown as { __mockXAICreate: Mock }).__mockXAICreate;
    vi.clearAllMocks();
    adapter = new XAIAdapter("test-api-key");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generate", () => {
    it("should generate a response with correct format", async () => {
      const mockResponse = {
        id: "grok-123",
        model: "grok-2",
        choices: [
          {
            message: { content: "Hello from Grok!" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "xai",
        model: "grok-2",
        messages: [{ role: "user", content: "Hello" }],
      };

      const response = await adapter.generate(request);

      expect(response.id).toBe("grok-123");
      expect(response.provider).toBe("xai");
      expect(response.model).toBe("grok-2");
      expect(response.content).toBe("Hello from Grok!");
      expect(response.finish_reason).toBe("stop");
      expect(response.usage).toEqual({
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      });
      expect(response.generation_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should include system prompt in messages", async () => {
      const mockResponse = {
        id: "grok-123",
        model: "grok-2",
        choices: [
          {
            message: { content: "Response" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "xai",
        model: "grok-2",
        messages: [{ role: "user", content: "Hello" }],
        system_prompt: "You are a helpful assistant.",
      };

      await adapter.generate(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello" },
          ],
        }),
      );
    });

    it("should normalize finish_reason for length", async () => {
      const mockResponse = {
        id: "grok-123",
        model: "grok-2",
        choices: [
          {
            message: { content: "Truncated response" },
            finish_reason: "length",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 100, total_tokens: 110 },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "xai",
        model: "grok-2",
        messages: [{ role: "user", content: "Write a long essay" }],
      };

      const response = await adapter.generate(request);
      expect(response.finish_reason).toBe("max_tokens");
    });
  });

  describe("stream", () => {
    it("should yield text deltas and final usage", async () => {
      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: "Hello" }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: { content: " from Grok" }, finish_reason: null }],
        };
        yield {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        };
      })();

      mockCreate.mockResolvedValue(mockStream);

      const request: GenerateRequest = {
        provider: "xai",
        model: "grok-2",
        messages: [{ role: "user", content: "Hello" }],
      };

      const chunks: StreamChunk[] = [];
      for await (const chunk of adapter.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual({ type: "text_delta", content: "Hello" });
      expect(chunks).toContainEqual({ type: "text_delta", content: " from Grok" });
      expect(chunks).toContainEqual({
        type: "usage",
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      });
      expect(chunks).toContainEqual({ type: "done", finish_reason: "stop" });
    });
  });

  describe("response format compatibility", () => {
    it("should produce same response structure as other adapters", async () => {
      const mockResponse = {
        id: "grok-123",
        model: "grok-2",
        choices: [
          {
            message: { content: "Test response" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "xai",
        model: "grok-2",
        messages: [{ role: "user", content: "Test" }],
      };

      const response = await adapter.generate(request);

      expect(response).toHaveProperty("id");
      expect(response).toHaveProperty("provider");
      expect(response).toHaveProperty("model");
      expect(response).toHaveProperty("content");
      expect(response).toHaveProperty("finish_reason");
      expect(response).toHaveProperty("usage");
      expect(response).toHaveProperty("generation_time_ms");

      expect(response.usage).toHaveProperty("input_tokens");
      expect(response.usage).toHaveProperty("output_tokens");
      expect(response.usage).toHaveProperty("total_tokens");

      expect(["stop", "max_tokens", "error"]).toContain(response.finish_reason);
    });
  });
});
