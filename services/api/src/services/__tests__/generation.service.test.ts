import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SSEEvent } from "../generation.service";

describe("GenerationService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("generate", () => {
    it("should yield error event when project not found", async () => {
      vi.doMock("../project.service", () => ({
        ProjectService: class {
          findByUuid = vi.fn().mockResolvedValue(null);
          checkAccess = vi.fn();
        },
      }));

      vi.doMock("../conversation.service", () => ({
        ConversationService: class {
          create = vi.fn();
          createAssistantMessage = vi.fn();
          markCompleted = vi.fn();
          markError = vi.fn();
        },
      }));

      vi.doMock("../ai-provider.service", () => ({
        AIProviderService: class {
          getDefaultModel = vi.fn();
          getModelById = vi.fn();
        },
      }));

      vi.doMock("../ai-gateway", () => ({
        getAIGateway: vi.fn(() => ({ stream: vi.fn() })),
        PromptBuilder: class {
          setProject = vi.fn().mockReturnThis();
          setFileTree = vi.fn().mockReturnThis();
          setCurrentFile = vi.fn().mockReturnThis();
          setSelectedCode = vi.fn().mockReturnThis();
          setBackendSchema = vi.fn().mockReturnThis();
          build = vi.fn().mockReturnValue({ system: "", messages: [] });
        },
        ResponseParser: class {
          appendChunk = vi.fn().mockReturnValue({ newBlocks: [], partialBlock: null });
          parse = vi.fn().mockReturnValue({ text: "", codeBlocks: [], astOperations: [] });
        },
      }));

      const { GenerationService } = await import("../generation.service");
      const service = new GenerationService();
      const events: SSEEvent[] = [];

      for await (const event of service.generate({
        projectId: "non-existent-uuid",
        prompt: "Test prompt",
        userId: 1,
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("error");
      expect(events[0]?.data).toEqual({
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
    });

    it("should yield error event when access denied", async () => {
      const mockProject = { id: 1, uuid: "test-uuid", file_tree: {} };

      vi.doMock("../project.service", () => ({
        ProjectService: class {
          findByUuid = vi.fn().mockResolvedValue(mockProject);
          checkAccess = vi.fn().mockResolvedValue(null);
        },
      }));

      vi.doMock("../conversation.service", () => ({
        ConversationService: class {
          create = vi.fn();
          createAssistantMessage = vi.fn();
          markCompleted = vi.fn();
          markError = vi.fn();
        },
      }));

      vi.doMock("../ai-provider.service", () => ({
        AIProviderService: class {
          getDefaultModel = vi.fn();
          getModelById = vi.fn();
        },
      }));

      vi.doMock("../ai-gateway", () => ({
        getAIGateway: vi.fn(() => ({ stream: vi.fn() })),
        PromptBuilder: class {
          setProject = vi.fn().mockReturnThis();
          setFileTree = vi.fn().mockReturnThis();
          setCurrentFile = vi.fn().mockReturnThis();
          setSelectedCode = vi.fn().mockReturnThis();
          setBackendSchema = vi.fn().mockReturnThis();
          build = vi.fn().mockReturnValue({ system: "", messages: [] });
        },
        ResponseParser: class {
          appendChunk = vi.fn().mockReturnValue({ newBlocks: [], partialBlock: null });
          parse = vi.fn().mockReturnValue({ text: "", codeBlocks: [], astOperations: [] });
        },
      }));

      const { GenerationService } = await import("../generation.service");
      const service = new GenerationService();
      const events: SSEEvent[] = [];

      for await (const event of service.generate({
        projectId: "test-uuid",
        prompt: "Test prompt",
        userId: 1,
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("error");
      expect(events[0]?.data).toEqual({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    });

    it("should yield error event when no model available", async () => {
      const mockProject = { id: 1, uuid: "test-uuid", file_tree: {} };
      const mockConversation = { id: 1, uuid: "conv-uuid" };

      vi.doMock("../project.service", () => ({
        ProjectService: class {
          findByUuid = vi.fn().mockResolvedValue(mockProject);
          checkAccess = vi.fn().mockResolvedValue({ project: mockProject, role: "member" });
        },
      }));

      vi.doMock("../conversation.service", () => ({
        ConversationService: class {
          create = vi.fn().mockResolvedValue(mockConversation);
          createAssistantMessage = vi.fn();
          markCompleted = vi.fn();
          markError = vi.fn();
        },
      }));

      vi.doMock("../ai-provider.service", () => ({
        AIProviderService: class {
          getDefaultModel = vi.fn().mockResolvedValue(null);
          getModelById = vi.fn().mockResolvedValue(null);
        },
      }));

      vi.doMock("../ai-gateway", () => ({
        getAIGateway: vi.fn(() => ({ stream: vi.fn() })),
        PromptBuilder: class {
          setProject = vi.fn().mockReturnThis();
          setFileTree = vi.fn().mockReturnThis();
          setCurrentFile = vi.fn().mockReturnThis();
          setSelectedCode = vi.fn().mockReturnThis();
          setBackendSchema = vi.fn().mockReturnThis();
          build = vi.fn().mockReturnValue({ system: "", messages: [] });
        },
        ResponseParser: class {
          appendChunk = vi.fn().mockReturnValue({ newBlocks: [], partialBlock: null });
          parse = vi.fn().mockReturnValue({ text: "", codeBlocks: [], astOperations: [] });
        },
      }));

      const { GenerationService } = await import("../generation.service");
      const service = new GenerationService();
      const events: SSEEvent[] = [];

      for await (const event of service.generate({
        projectId: "test-uuid",
        prompt: "Test prompt",
        userId: 1,
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("error");
      expect(events[0]?.data).toEqual({
        message: "No model available",
        code: "NO_MODEL",
      });
    });

    it("should stream text events during generation", async () => {
      const mockProject = { id: 1, uuid: "test-uuid", file_tree: {}, backend_provider: null };
      const mockConversation = { id: 1, uuid: "conv-uuid" };
      const mockModel = {
        id: 1,
        model_id: "claude-sonnet-4",
        max_output_tokens: 4096,
        input_cost_per_1m: 3,
        output_cost_per_1m: 15,
        provider: { slug: "anthropic" },
      };

      vi.doMock("../project.service", () => ({
        ProjectService: class {
          findByUuid = vi.fn().mockResolvedValue(mockProject);
          checkAccess = vi.fn().mockResolvedValue({ project: mockProject, role: "member" });
        },
      }));

      vi.doMock("../conversation.service", () => ({
        ConversationService: class {
          create = vi.fn().mockResolvedValue(mockConversation);
          createAssistantMessage = vi.fn().mockResolvedValue({ uuid: "assistant-uuid" });
          markCompleted = vi.fn();
          markError = vi.fn();
        },
      }));

      vi.doMock("../ai-provider.service", () => ({
        AIProviderService: class {
          getDefaultModel = vi.fn().mockResolvedValue(mockModel);
          getModelById = vi.fn().mockResolvedValue(mockModel);
        },
      }));

      const mockStream = async function* () {
        yield { type: "text_delta", content: "Hello " };
        yield { type: "text_delta", content: "World!" };
        yield { type: "usage", usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } };
      };

      vi.doMock("../ai-gateway", () => ({
        getAIGateway: vi.fn(() => ({
          stream: vi.fn().mockReturnValue(mockStream()),
        })),
        PromptBuilder: class {
          setProject = vi.fn().mockReturnThis();
          setFileTree = vi.fn().mockReturnThis();
          setCurrentFile = vi.fn().mockReturnThis();
          setSelectedCode = vi.fn().mockReturnThis();
          setBackendSchema = vi.fn().mockReturnThis();
          build = vi.fn().mockReturnValue({ system: "", messages: [] });
        },
        ResponseParser: class {
          appendChunk = vi.fn().mockReturnValue({ newBlocks: [], partialBlock: null });
          parse = vi.fn().mockReturnValue({ text: "", codeBlocks: [], astOperations: [] });
        },
      }));

      const { GenerationService } = await import("../generation.service");
      const service = new GenerationService();
      const events: SSEEvent[] = [];

      for await (const event of service.generate({
        projectId: "test-uuid",
        prompt: "Test prompt",
        userId: 1,
      })) {
        events.push(event);
      }

      const textEvents = events.filter((e) => e.type === "text");
      expect(textEvents).toHaveLength(2);
      expect(textEvents[0]?.data).toEqual({ content: "Hello " });
      expect(textEvents[1]?.data).toEqual({ content: "World!" });

      const doneEvent = events.find((e) => e.type === "done");
      expect(doneEvent).toBeDefined();
      expect((doneEvent?.data as { conversation_id: string })?.conversation_id).toBe("assistant-uuid");
    });

    it("should handle stream errors gracefully", async () => {
      const mockProject = { id: 1, uuid: "test-uuid", file_tree: {}, backend_provider: null };
      const mockConversation = { id: 1, uuid: "conv-uuid" };
      const mockModel = {
        id: 1,
        model_id: "claude-sonnet-4",
        max_output_tokens: 4096,
        input_cost_per_1m: 3,
        output_cost_per_1m: 15,
        provider: { slug: "anthropic" },
      };

      const mockMarkError = vi.fn();

      vi.doMock("../project.service", () => ({
        ProjectService: class {
          findByUuid = vi.fn().mockResolvedValue(mockProject);
          checkAccess = vi.fn().mockResolvedValue({ project: mockProject, role: "member" });
        },
      }));

      vi.doMock("../conversation.service", () => ({
        ConversationService: class {
          create = vi.fn().mockResolvedValue(mockConversation);
          createAssistantMessage = vi.fn();
          markCompleted = vi.fn();
          markError = mockMarkError;
        },
      }));

      vi.doMock("../ai-provider.service", () => ({
        AIProviderService: class {
          getDefaultModel = vi.fn().mockResolvedValue(mockModel);
          getModelById = vi.fn().mockResolvedValue(mockModel);
        },
      }));

      const mockStream = async function* () {
        yield { type: "text_delta", content: "Starting..." };
        yield { type: "error", error: "API rate limit exceeded" };
      };

      vi.doMock("../ai-gateway", () => ({
        getAIGateway: vi.fn(() => ({
          stream: vi.fn().mockReturnValue(mockStream()),
        })),
        PromptBuilder: class {
          setProject = vi.fn().mockReturnThis();
          setFileTree = vi.fn().mockReturnThis();
          setCurrentFile = vi.fn().mockReturnThis();
          setSelectedCode = vi.fn().mockReturnThis();
          setBackendSchema = vi.fn().mockReturnThis();
          build = vi.fn().mockReturnValue({ system: "", messages: [] });
        },
        ResponseParser: class {
          appendChunk = vi.fn().mockReturnValue({ newBlocks: [], partialBlock: null });
          parse = vi.fn().mockReturnValue({ text: "", codeBlocks: [], astOperations: [] });
        },
      }));

      const { GenerationService } = await import("../generation.service");
      const service = new GenerationService();
      const events: SSEEvent[] = [];

      for await (const event of service.generate({
        projectId: "test-uuid",
        prompt: "Test prompt",
        userId: 1,
      })) {
        events.push(event);
      }

      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent?.data as { message: string })?.message).toBe("API rate limit exceeded");
    });
  });
});
