import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";

import { env } from "../config";

/**
 * Database connection options
 * Database-agnostic configuration - works with any PostgreSQL provider
 */
const baseOptions: DataSourceOptions = {
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: false, // Never in production - use migrations
  logging: env.isDev,
  entities: ["src/db/entities/**/*.entity.ts"],
  migrations: ["src/db/migrations/**/*.ts"],
  subscribers: ["src/db/subscribers/**/*.ts"],
  extra: {
    // Connection pool settings
    max: env.isProd ? 60 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};

/**
 * TypeORM DataSource instance
 * Initialize with: await AppDataSource.initialize()
 */
export const AppDataSource = new DataSource(baseOptions);

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<DataSource> {
  if (!env.DATABASE_URL) {
    console.warn("DATABASE_URL not set, skipping database initialization");
    return AppDataSource;
  }

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("Database connection established");
    }
    return AppDataSource;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log("Database connection closed");
  }
}

/**
 * Run pending migrations
 */
export async function runMigrations(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized");
  }
  await AppDataSource.runMigrations();
  console.log("Migrations completed");
}

/**
 * Revert last migration
 */
export async function revertMigration(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized");
  }
  await AppDataSource.undoLastMigration();
  console.log("Migration reverted");
}
