import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CostEstimator } from "../cost-estimator";
import type { GenerateRequest } from "../types";
import type { AIModel } from "../../../db";

describe("CostEstimator", () => {
  let estimator: CostEstimator;

  beforeEach(() => {
    estimator = new CostEstimator();
  });

  afterEach(() => {
    estimator.cleanup();
  });

  describe("countTokens", () => {
    it("should count tokens for simple text", () => {
      const text = "Hello, world!";
      const tokens = estimator.countTokens(text, "gpt-4o");
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it("should count more tokens for longer text", () => {
      const shortText = "Hello";
      const longText = "Hello, this is a much longer piece of text that should have more tokens.";

      const shortTokens = estimator.countTokens(shortText, "gpt-4o");
      const longTokens = estimator.countTokens(longText, "gpt-4o");

      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it("should fall back to character-based estimation for unknown models", () => {
      const text = "Test text";
      const tokens = estimator.countTokens(text, "unknown-model-xyz");
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe("estimateRequestTokens", () => {
    it("should estimate tokens for a simple request", () => {
      const request: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello, how are you?" }],
      };

      const tokens = estimator.estimateRequestTokens(request);
      expect(tokens).toBeGreaterThan(0);
    });

    it("should include system prompt tokens", () => {
      const requestWithoutSystem: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      };

      const requestWithSystem: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
        system_prompt: "You are a helpful assistant that responds concisely.",
      };

      const tokensWithoutSystem = estimator.estimateRequestTokens(requestWithoutSystem);
      const tokensWithSystem = estimator.estimateRequestTokens(requestWithSystem);

      expect(tokensWithSystem).toBeGreaterThan(tokensWithoutSystem);
    });

    it("should count tokens for multiple messages", () => {
      const singleMessage: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      };

      const multipleMessages: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
      };

      const singleTokens = estimator.estimateRequestTokens(singleMessage);
      const multipleTokens = estimator.estimateRequestTokens(multipleMessages);

      expect(multipleTokens).toBeGreaterThan(singleTokens);
    });
  });

  describe("estimateCost", () => {
    const mockModel = {
      id: 1,
      model_id: "gpt-4o",
      input_cost_per_1k: 0.0025,
      output_cost_per_1k: 0.01,
      max_output_tokens: 4096,
      provider: { slug: "openai" },
    } as unknown as AIModel;

    it("should estimate cost correctly", () => {
      const request: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      };

      const estimate = estimator.estimateCost(request, mockModel);

      expect(estimate.provider).toBe("openai");
      expect(estimate.model).toBe("gpt-4o");
      expect(estimate.estimated_input_tokens).toBeGreaterThan(0);
      expect(estimate.estimated_output_tokens).toBe(4096);
      expect(estimate.estimated_cost_usd).toBeGreaterThan(0);
    });

    it("should use request max_tokens if provided", () => {
      const request: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 100,
      };

      const estimate = estimator.estimateCost(request, mockModel);

      expect(estimate.estimated_output_tokens).toBe(100);
    });

    it("should use custom estimated output tokens if provided", () => {
      const request: GenerateRequest = {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      };

      const estimate = estimator.estimateCost(request, mockModel, 500);

      expect(estimate.estimated_output_tokens).toBe(500);
    });
  });

  describe("calculateActualCost", () => {
    const mockModel = {
      id: 1,
      model_id: "gpt-4o",
      input_cost_per_1k: 0.0025,
      output_cost_per_1k: 0.01,
    } as unknown as AIModel;

    it("should calculate actual cost from usage", () => {
      const usage = {
        input_tokens: 1000,
        output_tokens: 500,
        total_tokens: 1500,
      };

      const cost = estimator.calculateActualCost(usage, mockModel);

      const expectedCost = (1000 / 1000) * 0.0025 + (500 / 1000) * 0.01;
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it("should handle zero tokens", () => {
      const usage = {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
      };

      const cost = estimator.calculateActualCost(usage, mockModel);
      expect(cost).toBe(0);
    });
  });
});
