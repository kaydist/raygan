import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCreditUsageTable1708301100000 implements MigrationInterface {
  name = "CreateCreditUsageTable1708301100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "credit_usage" (
        "id" SERIAL PRIMARY KEY,
        "uuid" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "organization_id" INTEGER NOT NULL REFERENCES "organizations"("id"),
        "user_id" INTEGER REFERENCES "users"("id"),
        "project_id" INTEGER REFERENCES "projects"("id"),
        "conversation_id" INTEGER REFERENCES "conversations"("id"),
        "model_id" INTEGER NOT NULL REFERENCES "ai_models"("id"),
        "model_name" VARCHAR(100) NOT NULL,
        "provider_slug" VARCHAR(50) NOT NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "input_tokens" INTEGER NOT NULL,
        "output_tokens" INTEGER NOT NULL,
        "total_tokens" INTEGER NOT NULL,
        "cost_usd" DECIMAL(12, 8) NOT NULL,
        "generation_time_ms" INTEGER NOT NULL,
        "used_fallback" BOOLEAN NOT NULL DEFAULT false,
        "original_model" VARCHAR(100),
        "finish_reason" VARCHAR(50) NOT NULL,
        "request_metadata" JSONB NOT NULL DEFAULT '{}',
        "meta" JSONB NOT NULL DEFAULT '{}',
        "created_on" TIMESTAMP NOT NULL DEFAULT NOW(),
        "created_by" INTEGER,
        "updated_on" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_by" INTEGER,
        "deleted_flag" BOOLEAN NOT NULL DEFAULT false,
        "deleted_on" TIMESTAMP,
        "deleted_by" INTEGER
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_credit_usage_org_created" ON "credit_usage" ("organization_id", "created_on");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_credit_usage_user_created" ON "credit_usage" ("user_id", "created_on");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_credit_usage_project_created" ON "credit_usage" ("project_id", "created_on");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_credit_usage_conversation" ON "credit_usage" ("conversation_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_credit_usage_model" ON "credit_usage" ("model_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_credit_usage_model";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_credit_usage_conversation";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_credit_usage_project_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_credit_usage_user_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_credit_usage_org_created";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credit_usage";`);
  }
}
