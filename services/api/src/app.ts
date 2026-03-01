import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env, logger } from "./config";
import { errorHandler, notFoundHandler, requestContext } from "./middleware";
import { v1Routes } from "./routes/v1";
import { webhooksRoutes } from "./routes/v1/webhooks.routes";

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    })
  );

  // Request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === "/api/v1/health",
      },
    })
  );

  // Webhook routes (before JSON parsing to preserve raw body for HMAC)
  app.use("/api/v1", webhooksRoutes);

  // Body parsing
  app.use(express.json({ limit: "75mb" }));
  app.use(express.urlencoded({ extended: true, limit: "75mb" }));

  // Request context (adds requestId)
  app.use(requestContext);

  // API routes
  app.use("/api/v1", v1Routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
