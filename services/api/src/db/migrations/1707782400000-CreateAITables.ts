import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAITables1707782400000 implements MigrationInterface {
  name = "CreateAITables1707782400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_providers" (
        "id" SERIAL PRIMARY KEY,
        "uuid" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "slug" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "base_url" VARCHAR(255),
        "api_key_encrypted" TEXT,
        "api_key_header" VARCHAR(255) DEFAULT 'Authorization',
        "timeout_ms" INTEGER NOT NULL DEFAULT 120000,
        "max_retries" INTEGER NOT NULL DEFAULT 3,
        "is_enabled" BOOLEAN NOT NULL DEFAULT true,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "meta" JSONB NOT NULL DEFAULT '{}',
        "created_on" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" INTEGER,
        "updated_on" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" INTEGER,
        "deleted_flag" BOOLEAN NOT NULL DEFAULT false,
        "deleted_on" TIMESTAMPTZ,
        "deleted_by" INTEGER
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_models" (
        "id" SERIAL PRIMARY KEY,
        "uuid" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "provider_id" INTEGER NOT NULL REFERENCES "ai_providers"("id") ON DELETE CASCADE,
        "model_id" VARCHAR(100) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "context_window" INTEGER NOT NULL,
        "max_output_tokens" INTEGER NOT NULL,
        "input_cost_per_1k" DECIMAL(10, 6) NOT NULL,
        "output_cost_per_1k" DECIMAL(10, 6) NOT NULL,
        "supports_vision" BOOLEAN NOT NULL DEFAULT false,
        "supports_tools" BOOLEAN NOT NULL DEFAULT false,
        "supports_streaming" BOOLEAN NOT NULL DEFAULT true,
        "is_enabled" BOOLEAN NOT NULL DEFAULT true,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "capabilities" JSONB NOT NULL DEFAULT '{}',
        "meta" JSONB NOT NULL DEFAULT '{}',
        "created_on" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" INTEGER,
        "updated_on" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" INTEGER,
        "deleted_flag" BOOLEAN NOT NULL DEFAULT false,
        "deleted_on" TIMESTAMPTZ,
        "deleted_by" INTEGER,
        UNIQUE("provider_id", "model_id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ai_providers_slug" ON "ai_providers"("slug") WHERE "deleted_flag" = false;
      CREATE INDEX "idx_ai_providers_enabled" ON "ai_providers"("is_enabled") WHERE "deleted_flag" = false;
      CREATE INDEX "idx_ai_models_provider" ON "ai_models"("provider_id") WHERE "deleted_flag" = false;
      CREATE INDEX "idx_ai_models_enabled" ON "ai_models"("is_enabled") WHERE "deleted_flag" = false;
      CREATE INDEX "idx_ai_models_default" ON "ai_models"("is_default") WHERE "deleted_flag" = false AND "is_default" = true;
    `);

    await queryRunner.query(`
      INSERT INTO "ai_providers" ("slug", "name", "description", "base_url", "api_key_header", "priority") VALUES
      ('anthropic', 'Anthropic', 'Claude AI models by Anthropic', 'https://api.anthropic.com', 'x-api-key', 1);
    `);

    await queryRunner.query(`
      INSERT INTO "ai_models" ("provider_id", "model_id", "name", "description", "context_window", "max_output_tokens", "input_cost_per_1k", "output_cost_per_1k", "supports_vision", "supports_tools", "supports_streaming", "is_default", "priority", "capabilities")
      SELECT p.id, m.model_id, m.name, m.description, m.context_window, m.max_output_tokens, m.input_cost_per_1k, m.output_cost_per_1k, m.supports_vision, m.supports_tools, m.supports_streaming, m.is_default, m.priority, m.capabilities::jsonb
      FROM "ai_providers" p
      CROSS JOIN (VALUES
        ('claude-opus-4-20250514', 'Claude Opus 4', 'Most capable Claude model, best for complex reasoning and coding', 200000, 32000, 0.015, 0.075, true, true, true, false, 1, '{"coding": true, "reasoning": true, "analysis": true}'),
        ('claude-sonnet-4-20250514', 'Claude Sonnet 4', 'Balanced performance, excellent for coding tasks', 200000, 16000, 0.003, 0.015, true, true, true, true, 2, '{"coding": true, "reasoning": true, "speed": true}'),
        ('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Previous gen Sonnet, still excellent for coding', 200000, 8192, 0.003, 0.015, true, true, true, false, 3, '{"coding": true, "reasoning": true}'),
        ('claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'Fast and affordable, good for quick tasks', 200000, 8192, 0.001, 0.005, true, true, true, false, 4, '{"speed": true, "affordable": true}')
      ) AS m(model_id, name, description, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, supports_vision, supports_tools, supports_streaming, is_default, priority, capabilities)
      WHERE p.slug = 'anthropic';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_models" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_providers" CASCADE;`);
  }
}
