import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { getAIGateway } from "../services/ai-gateway";
import { getPlanApprovalGate } from "../services/ai-gateway/plan-approval-gate";
import { AIProviderService } from "../services";
import { GenerationService } from "../services/generation.service";

const providerService = new AIProviderService();
const generationService = new GenerationService();

export async function listModels(_req: Request, res: Response): Promise<void> {
  try {
    const gateway = getAIGateway();
    const models = await gateway.getAvailableModels();

    res.json({
      data: models.map((m) => ({
        id: m.id,
        model_id: m.model_id,
        name: m.name,
        description: m.description,
        provider: {
          slug: m.provider?.slug,
          name: m.provider?.name,
          logo_url: m.provider?.logo_url,
        },
        context_window: m.context_window,
        max_output_tokens: m.max_output_tokens,
        input_cost_per_1k: m.input_cost_per_1k,
        output_cost_per_1k: m.output_cost_per_1k,
        supports_vision: m.supports_vision,
        supports_tools: m.supports_tools,
        supports_streaming: m.supports_streaming,
        is_default: m.is_default,
        capabilities: m.capabilities,
      })),
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "List models failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function generate(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { model, messages, system_prompt, max_tokens, temperature } = req.body;

    const modelConfig = await providerService.getModelById(model);
    if (!modelConfig) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Invalid model" },
      });
      return;
    }

    const gateway = getAIGateway();
    const response = await gateway.generate({
      provider: modelConfig.provider.slug,
      model,
      messages,
      system_prompt,
      max_tokens,
      temperature,
      metadata: { user_id: authReq.dbUser.id, },
    });

    res.json({
      data: {
        id: response.id,
        model: response.model,
        content: response.content,
        finish_reason: response.finish_reason,
        usage: response.usage,
        generation_time_ms: response.generation_time_ms,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Generate failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function streamGenerate(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { model, messages, system_prompt, max_tokens, temperature } = req.body;

    const modelConfig = await providerService.getModelById(model);
    if (!modelConfig) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Invalid model" },
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const gateway = getAIGateway();
    const stream = gateway.stream({
      provider: modelConfig.provider.slug,
      model,
      messages,
      system_prompt,
      max_tokens,
      temperature,
      metadata: { user_id: authReq.dbUser.id, },
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      if (chunk.type === "done" || chunk.type === "error") {
        break;
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    logger.error({ err }, "Stream generate failed");

    if (!res.headersSent) {
      res.status(500).json({
        data: null,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
      });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export async function generateForProject(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const projectId = req.params.projectId as string;
  const { prompt: rawPrompt, model_id, current_file, selected_code, max_tokens, temperature, images: rawImages } = req.body;
  const prompt = typeof rawPrompt === "string" ? rawPrompt : "";

  const validatedImages: Array<{ media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string }> = [];
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    if (rawImages.length > MAX_IMAGES) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: `Maximum ${MAX_IMAGES} images allowed` },
      });
      return;
    }

    for (const img of rawImages) {
      if (!img || typeof img.media_type !== "string" || typeof img.data !== "string") {
        res.status(400).json({
          data: null,
          error: { code: ERROR_CODES.BAD_REQUEST, message: "Invalid image format" },
        });
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.has(img.media_type)) {
        res.status(400).json({
          data: null,
          error: { code: ERROR_CODES.BAD_REQUEST, message: `Unsupported image type: ${img.media_type}` },
        });
        return;
      }
      const sizeBytes = Math.ceil((img.data.length * 3) / 4);
      if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        res.status(400).json({
          data: null,
          error: { code: ERROR_CODES.BAD_REQUEST, message: "Image exceeds 10MB limit" },
        });
        return;
      }
      validatedImages.push({ media_type: img.media_type, data: img.data });
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const abortController = new AbortController();

  req.on("close", () => {
    abortController.abort();
  });

  const heartbeatInterval = setInterval(() => {
    if (!abortController.signal.aborted) {
      res.write(": heartbeat\n\n");
    }
  }, 15000);

  try {
    const stream = generationService.generate({
      projectId,
      prompt,
      userId: authReq.dbUser.id,
      modelId: model_id,
      currentFile: current_file,
      selectedCode: selected_code,
      maxTokens: max_tokens,
      temperature,
      signal: abortController.signal,
      images: validatedImages.length > 0 ? validatedImages : undefined,
    });

    for await (const event of stream) {
      if (abortController.signal.aborted) break;

      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);

      if (event.type === "done" || event.type === "error") {
        break;
      }
    }

    if (!abortController.signal.aborted) {
      res.write("event: close\ndata: {}\n\n");
    }
  } catch (err) {
    if (abortController.signal.aborted) {
      logger.info({ projectId }, "Generation aborted by client");
    } else {
      logger.error({ err, projectId }, "Project generation failed");
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "Generation failed", code: "INTERNAL_ERROR" })}\n\n`);
    }
  } finally {
    clearInterval(heartbeatInterval);
    res.end();
  }
}

export async function approvePlan(req: Request, res: Response): Promise<void> {
  try {
    const planId = req.params.planId as string;
    if (!planId) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Plan ID is required" },
      });
      return;
    }

    const gate = getPlanApprovalGate();
    const resolved = gate.resolve(planId, "approved");

    if (!resolved) {
      res.status(404).json({
        data: null,
        error: { code: "PLAN_NOT_FOUND", message: "Plan not found or already resolved" },
      });
      return;
    }

    res.json({ data: { plan_id: planId, status: "approved" }, error: null });
  } catch (err) {
    logger.error({ err }, "Approve plan failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function rejectPlan(req: Request, res: Response): Promise<void> {
  try {
    const planId = req.params.planId as string;
    if (!planId) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Plan ID is required" },
      });
      return;
    }

    const gate = getPlanApprovalGate();
    const resolved = gate.resolve(planId, "rejected");

    if (!resolved) {
      res.status(404).json({
        data: null,
        error: { code: "PLAN_NOT_FOUND", message: "Plan not found or already resolved" },
      });
      return;
    }

    res.json({ data: { plan_id: planId, status: "rejected" }, error: null });
  } catch (err) {
    logger.error({ err }, "Reject plan failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
