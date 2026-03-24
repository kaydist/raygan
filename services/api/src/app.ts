import cors from "cors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env, logger } from "./config";
import { createBullBoardMiddleware } from "./jobs";
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

  // Bull Board admin UI (Basic Auth protected)
  if (env.REDIS_URL) {
    try {
      const boardMiddleware = createBullBoardMiddleware();
      app.use(
        "/admin/queues",
        (req: Request, res: Response, next: NextFunction) => {
          const auth = req.headers.authorization;
          if (!auth || !auth.startsWith("Basic ")) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
            res.status(401).send("Authentication required");
            return;
          }

          const [username, password] = Buffer.from(auth.slice(6), "base64")
            .toString()
            .split(":");

          if (
            username !== env.BULL_BOARD_USERNAME ||
            password !== env.BULL_BOARD_PASSWORD
          ) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
            res.status(401).send("Invalid credentials");
            return;
          }

          next();
        },
        boardMiddleware.getRouter()
      );
      logger.info("Bull Board mounted at /admin/queues");
    } catch (err) {
      logger.warn("Bull Board not mounted: Redis unavailable");
    }
  }

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
