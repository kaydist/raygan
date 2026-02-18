import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpenAIProvider1708300800000 implements MigrationInterface {
  name = "AddOpenAIProvider1708300800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "ai_providers" ("slug", "name", "description", "base_url", "api_key_header", "priority") VALUES
      ('openai', 'OpenAI', 'GPT models by OpenAI', 'https://api.openai.com/v1', 'Authorization', 2);
    `);

    await queryRunner.query(`
      INSERT INTO "ai_models" ("provider_id", "model_id", "name", "description", "context_window", "max_output_tokens", "input_cost_per_1k", "output_cost_per_1k", "supports_vision", "supports_tools", "supports_streaming", "is_default", "priority", "capabilities")
      SELECT p.id, m.model_id, m.name, m.description, m.context_window, m.max_output_tokens, m.input_cost_per_1k, m.output_cost_per_1k, m.supports_vision, m.supports_tools, m.supports_streaming, m.is_default, m.priority, m.capabilities::jsonb
      FROM "ai_providers" p
      CROSS JOIN (VALUES
        ('gpt-4o', 'GPT-4o', 'Most capable GPT model, multimodal with vision support', 128000, 16384, 0.0025, 0.01, true, true, true, false, 1, '{"coding": true, "reasoning": true, "vision": true, "analysis": true}'),
        ('gpt-4o-mini', 'GPT-4o Mini', 'Fast and affordable GPT-4 class model', 128000, 16384, 0.00015, 0.0006, true, true, true, false, 2, '{"speed": true, "affordable": true, "coding": true}'),
        ('gpt-4-turbo', 'GPT-4 Turbo', 'Previous gen GPT-4 with vision, large context window', 128000, 4096, 0.01, 0.03, true, true, true, false, 3, '{"coding": true, "reasoning": true, "vision": true}'),
        ('gpt-4', 'GPT-4', 'Original GPT-4, reliable for complex tasks', 8192, 8192, 0.03, 0.06, false, true, true, false, 4, '{"coding": true, "reasoning": true}'),
        ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and very affordable, good for simple tasks', 16385, 4096, 0.0005, 0.0015, false, true, true, false, 5, '{"speed": true, "affordable": true}'),
        ('o1', 'o1', 'Advanced reasoning model for complex problem solving', 200000, 100000, 0.015, 0.06, true, false, true, false, 6, '{"reasoning": true, "math": true, "coding": true}'),
        ('o1-mini', 'o1 Mini', 'Faster reasoning model, optimized for STEM tasks', 128000, 65536, 0.003, 0.012, false, false, true, false, 7, '{"reasoning": true, "math": true, "speed": true}')
      ) AS m(model_id, name, description, context_window, max_output_tokens, input_cost_per_1k, output_cost_per_1k, supports_vision, supports_tools, supports_streaming, is_default, priority, capabilities)
      WHERE p.slug = 'openai';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "ai_models" WHERE "provider_id" IN (
        SELECT "id" FROM "ai_providers" WHERE "slug" = 'openai'
      );
    `);

    await queryRunner.query(`
      DELETE FROM "ai_providers" WHERE "slug" = 'openai';
    `);
  }
}
