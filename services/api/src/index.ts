import { createServer } from "http";
import { createApp } from "./app";
import { env, logger, initializeRedis, closeRedis } from "./config";
import { initializeDatabase, closeDatabase } from "./db";
import { setupSocketServer, closeSocketServer } from "./socket";

async function main() {
  await initializeDatabase();
  await initializeRedis();

  const app = createApp();
  const httpServer = createServer(app);

  setupSocketServer(httpServer);

  httpServer.listen(env.PORT, env.BIND_HOST, () => {
    logger.info(
      `Server running at http://${env.BIND_HOST}:${env.PORT} in ${env.NODE_ENV} mode`
    );
    logger.info(`Health check: http://${env.BIND_HOST}:${env.PORT}/api/v1/health`);
    logger.info(`WebSocket server ready`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await closeSocketServer();
    await closeRedis();
    await closeDatabase();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error(error, "Failed to start server");
  process.exit(1);
});
