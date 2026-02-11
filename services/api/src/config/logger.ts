import pino from "pino";

import { env } from "./env";

export const logger = pino({
  level: env.isDev ? "debug" : "info",
  transport: env.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      }
    : undefined,
});

export type Logger = typeof logger;
