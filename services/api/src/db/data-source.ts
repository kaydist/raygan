import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";

import { env, logger } from "../config";
import {
  User,
  Organization,
  OrganizationMember,
  Project,
  ProjectFile,
  Conversation,
  AIProvider,
  AIModel,
  CreditUsage,
  Setting,
  Build,
  ProjectSetting,
  StoreListing,
  StoreRelease,
} from "./entities";
import { InitialSchema1707696000000 } from "./migrations/1707696000000-InitialSchema";
import { CreateAITables1707782400000 } from "./migrations/1707782400000-CreateAITables";
import { AddCurrentOrganizationToUser1707868800000 } from "./migrations/1707868800000-AddCurrentOrganizationToUser";
import { CreateProjectFilesTable1708041600000 } from "./migrations/1708041600000-CreateProjectFilesTable";
import { CreateSettingsTable1708128000000 } from "./migrations/1708128000000-CreateSettingsTable";
import { AddRowLevelSecurityPolicies1708214400000 } from "./migrations/1708214400000-AddRowLevelSecurityPolicies";
import { AddOpenAIProvider1708300800000 } from "./migrations/1708300800000-AddOpenAIProvider";
import { AddXAIProvider1708300900000 } from "./migrations/1708300900000-AddXAIProvider";
import { AddGoogleProvider1708301000000 } from "./migrations/1708301000000-AddGoogleProvider";
import { CreateCreditUsageTable1708301100000 } from "./migrations/1708301100000-CreateCreditUsageTable";
import { AddProviderLogoUrl1708301200000 } from "./migrations/1708301200000-AddProviderLogoUrl";
import { MakeCurrentOrganizationNullable1708301300000 } from "./migrations/1708301300000-MakeCurrentOrganizationNullable";
import { AddProjectStatusColumn1708400000000 } from "./migrations/1708400000000-AddProjectStatusColumn";
import { CreateBuildsTable1708500000000 } from "./migrations/1708500000000-CreateBuildsTable";
import { CreateStoreReleaseTables1708600000000 } from "./migrations/1708600000000-CreateStoreReleaseTables";

const baseOptions: DataSourceOptions = {
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: false,
  logging: ["error"],
  entities: [
    User,
    Organization,
    OrganizationMember,
    Project,
    ProjectFile,
    Conversation,
    AIProvider,
    AIModel,
    CreditUsage,
    Setting,
    Build,
    ProjectSetting,
    StoreListing,
    StoreRelease,
  ],
  migrations: [
    InitialSchema1707696000000,
    CreateAITables1707782400000,
    AddCurrentOrganizationToUser1707868800000,
    CreateProjectFilesTable1708041600000,
    CreateSettingsTable1708128000000,
    AddRowLevelSecurityPolicies1708214400000,
    AddOpenAIProvider1708300800000,
    AddXAIProvider1708300900000,
    AddGoogleProvider1708301000000,
    CreateCreditUsageTable1708301100000,
    AddProviderLogoUrl1708301200000,
    MakeCurrentOrganizationNullable1708301300000,
    AddProjectStatusColumn1708400000000,
    CreateBuildsTable1708500000000,
    CreateStoreReleaseTables1708600000000
  ],
  subscribers: [],
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
    logger.warn("DATABASE_URL not set, skipping database initialization");
    return AppDataSource;
  }

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("Database connection established");
    }
    return AppDataSource;
  } catch (error) {
    logger.error(error, "Database connection failed");
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info("Database connection closed");
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
  logger.info("Migrations completed");
}

/**
 * Revert last migration
 */
export async function revertMigration(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized");
  }
  await AppDataSource.undoLastMigration();
  logger.info("Migration reverted");
}
