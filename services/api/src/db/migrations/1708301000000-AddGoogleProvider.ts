import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleProvider1708301000000 implements MigrationInterface {
  name = "AddGoogleProvider1708301000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "ai_providers" ("slug", "name", "description", "base_url", "api_key_header", "priority") VALUES
      ('google', 'Google', 'Gemini models by Google', 'https://generativelanguage.googleapis.com/v1', 'x-goog-api-key', 4);
    `);

    await queryRunner.query(`
      INSERT INTO "ai_models" ("provider_id", "model_id", "name", "description", "context_window", "max_output_tokens", "input_cost_per_1k", "output_cost_per_1k", "supports_vision", "supports_tools", "supports_streaming", "is_default", "priority", "capabilities")
      SELECT p.id, m.model_id, m.name, m.description, m.context_window, m.max_output_tokens, m.input_cost_per_1k, m.output_cost_per_1k, m.supports_vision, m.supports_tools, m.supports_streaming, m.is_default, m.priority, m.capabilities::jsonb
      FROM "ai_providers" p
      CROSS JOIN (VALUES
        ('gemini-2.0-flash', 'Gemini 2.0 Flash', 'Latest Gemini 2.0 model, fast and capable with native tool use', 1048576, 8192, 0.0, 0.0, true, true, true, false, 1, '{"coding": true, "reasoning": true, "vision": true, "speed": true}'),
        ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'Most capable Gemini model with 2M context window', 2097152, 8192, 0.00125, 0.005, true, true, true, false, 2, '{"coding": true, "reasoning": true, "vision": true, "analysis": true}'),
        ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'Fast and efficient Gemini model with 1M context', 1048576, 8192, 0.000075, 0.0003, true, true, true, false, 3, '{"speed": true, "affordable": true, "vision": true}'),
        ('gemini-1.5-flash-8b', 'Gemini 1.5 Flash-8B', 'Smallest and fastest Gemini model', 1048576, 8192, 0.0000375, 0.00015, true, true, true, false, 4, '{"speed": true, "affordable": true}'),
        ('gemini-1.0-pro', 'Gemini 1.0 Pro', 'Previous generation Gemini model', 32760, 8192, 0.0005, 0.0015, false, true, true, false, 5, '{"coding": true, "reasoning": true}')
      ) AS m(model_id, name, description, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, supports_vision, supports_tools, supports_streaming, is_default, priority, capabilities)
      WHERE p.slug = 'google';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "ai_models" WHERE "provider_id" IN (
        SELECT "id" FROM "ai_providers" WHERE "slug" = 'google'
      );
    `);

    await queryRunner.query(`
      DELETE FROM "ai_providers" WHERE "slug" = 'google';
    `);
  }
}
