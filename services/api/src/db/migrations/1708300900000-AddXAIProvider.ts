import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddXAIProvider1708300900000 implements MigrationInterface {
  name = "AddXAIProvider1708300900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "ai_providers" ("slug", "name", "description", "base_url", "api_key_header", "priority") VALUES
      ('xai', 'xAI', 'Grok models by xAI', 'https://api.x.ai/v1', 'Authorization', 3);
    `);

    await queryRunner.query(`
      INSERT INTO "ai_models" ("provider_id", "model_id", "name", "description", "context_window", "max_output_tokens", "input_cost_per_1k", "output_cost_per_1k", "supports_vision", "supports_tools", "supports_streaming", "is_default", "priority", "capabilities")
      SELECT p.id, m.model_id, m.name, m.description, m.context_window, m.max_output_tokens, m.input_cost_per_1k, m.output_cost_per_1k, m.supports_vision, m.supports_tools, m.supports_streaming, m.is_default, m.priority, m.capabilities::jsonb
      FROM "ai_providers" p
      CROSS JOIN (VALUES
        ('grok-2', 'Grok 2', 'Most capable Grok model with advanced reasoning', 131072, 32768, 0.002, 0.01, true, true, true, false, 1, '{"coding": true, "reasoning": true, "vision": true, "analysis": true}'),
        ('grok-2-mini', 'Grok 2 Mini', 'Fast and efficient Grok model', 131072, 32768, 0.0002, 0.001, false, true, true, false, 2, '{"speed": true, "affordable": true, "coding": true}'),
        ('grok-beta', 'Grok Beta', 'Latest Grok beta model with experimental features', 131072, 32768, 0.005, 0.015, true, true, true, false, 3, '{"coding": true, "reasoning": true, "experimental": true}')
      ) AS m(model_id, name, description, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, supports_vision, supports_tools, supports_streaming, is_default, priority, capabilities)
      WHERE p.slug = 'xai';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "ai_models" WHERE "provider_id" IN (
        SELECT "id" FROM "ai_providers" WHERE "slug" = 'xai'
      );
    `);

    await queryRunner.query(`
      DELETE FROM "ai_providers" WHERE "slug" = 'xai';
    `);
  }
}
