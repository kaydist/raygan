import { createApp } from "./app";
import { env, logger } from "./config";
import { initializeDatabase, closeDatabase } from "./db";

async function main() {
  await initializeDatabase();

  const app = createApp();

  app.listen(env.PORT, env.HOST, () => {
    logger.info(
      `Server running at http://${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode`
    );
    logger.info(`Health check: http://${env.HOST}:${env.PORT}/api/v1/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
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
