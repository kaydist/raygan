import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import type { GenerateRequest, StreamChunk } from "../types";

let mockGenerateContent: Mock;
let mockGenerateContentStream: Mock;

vi.mock("@google/generative-ai", () => {
  const generateContentFn = vi.fn();
  const generateContentStreamFn = vi.fn();
  (globalThis as unknown as { __mockGoogleGenerate: Mock }).__mockGoogleGenerate = generateContentFn;
  (globalThis as unknown as { __mockGoogleStream: Mock }).__mockGoogleStream = generateContentStreamFn;

  class MockGenerativeModel {
    generateContent = generateContentFn;
    generateContentStream = generateContentStreamFn;
  }

  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return new MockGenerativeModel();
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    GoogleGenerativeAIError: class GoogleGenerativeAIError extends Error {},
  };
});

import { GoogleAdapter } from "../adapters/google.adapter";

describe("GoogleAdapter", () => {
  let adapter: GoogleAdapter;

  beforeEach(() => {
    mockGenerateContent = (globalThis as unknown as { __mockGoogleGenerate: Mock }).__mockGoogleGenerate;
    mockGenerateContentStream = (globalThis as unknown as { __mockGoogleStream: Mock }).__mockGoogleStream;
    vi.clearAllMocks();
    adapter = new GoogleAdapter("test-api-key");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generate", () => {
    it("should generate a response with correct format", async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "Hello from Gemini!" }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "google",
        model: "gemini-1.5-pro",
        messages: [{ role: "user", content: "Hello" }],
      };

      const response = await adapter.generate(request);

      expect(response.provider).toBe("google");
      expect(response.model).toBe("gemini-1.5-pro");
      expect(response.content).toBe("Hello from Gemini!");
      expect(response.finish_reason).toBe("stop");
      expect(response.usage).toEqual({
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      });
      expect(response.generation_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should normalize finish_reason for MAX_TOKENS", async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "Truncated response" }],
              },
              finishReason: "MAX_TOKENS",
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 100,
            totalTokenCount: 110,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "google",
        model: "gemini-1.5-pro",
        messages: [{ role: "user", content: "Write a long essay" }],
      };

      const response = await adapter.generate(request);
      expect(response.finish_reason).toBe("max_tokens");
    });

    it("should normalize finish_reason for SAFETY to error", async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "Filtered content" }],
              },
              finishReason: "SAFETY",
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "google",
        model: "gemini-1.5-pro",
        messages: [{ role: "user", content: "Test" }],
      };

      const response = await adapter.generate(request);
      expect(response.finish_reason).toBe("error");
    });
  });

  describe("stream", () => {
    it("should yield text deltas and final usage", async () => {
      const mockStream = (async function* () {
        yield { text: () => "Hello" };
        yield { text: () => " from" };
        yield { text: () => " Gemini" };
      })();

      const mockFinalResponse = {
        candidates: [
          {
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      };

      mockGenerateContentStream.mockResolvedValue({
        stream: mockStream,
        response: Promise.resolve(mockFinalResponse),
      });

      const request: GenerateRequest = {
        provider: "google",
        model: "gemini-1.5-pro",
        messages: [{ role: "user", content: "Hello" }],
      };

      const chunks: StreamChunk[] = [];
      for await (const chunk of adapter.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toContainEqual({ type: "text_delta", content: "Hello" });
      expect(chunks).toContainEqual({ type: "text_delta", content: " from" });
      expect(chunks).toContainEqual({ type: "text_delta", content: " Gemini" });
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
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "Test response" }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "google",
        model: "gemini-1.5-pro",
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

  describe("message conversion", () => {
    it("should convert assistant role to model role", async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: "Response" }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 20,
            candidatesTokenCount: 5,
            totalTokenCount: 25,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GenerateRequest = {
        provider: "google",
        model: "gemini-1.5-pro",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
      };

      await adapter.generate(request);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [
          { role: "user", parts: [{ text: "Hello" }] },
          { role: "model", parts: [{ text: "Hi there!" }] },
          { role: "user", parts: [{ text: "How are you?" }] },
        ],
      });
    });
  });
});
