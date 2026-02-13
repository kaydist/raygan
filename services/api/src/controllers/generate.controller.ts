import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { getAIGateway } from "../services/ai-gateway";
import { AIProviderService } from "../services";

const providerService = new AIProviderService();

export async function listModels(_req: Request, res: Response): Promise<void> {
  try {
    const gateway = getAIGateway();
    const models = await gateway.getAvailableModels();

    res.json({
      data: models.map((m) => ({
        id: m.model_id,
        name: m.name,
        description: m.description,
        provider: m.provider?.slug,
        context_window: m.context_window,
        max_output_tokens: m.max_output_tokens,
        supports_vision: m.supports_vision,
        supports_streaming: m.supports_streaming,
        is_default: m.is_default,
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
      metadata: { user_id: authReq.userId },
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
      metadata: { user_id: authReq.userId },
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
