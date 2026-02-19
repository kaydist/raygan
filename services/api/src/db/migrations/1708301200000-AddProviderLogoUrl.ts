import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProviderLogoUrl1708301200000 implements MigrationInterface {
  name = "AddProviderLogoUrl1708301200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_providers" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(500);
    `);

    await queryRunner.query(`
      UPDATE "ai_providers" SET "logo_url" = CASE "slug"
        WHEN 'anthropic' THEN 'https://cdn.simpleicons.org/claude/D4A27F'
        WHEN 'openai' THEN 'https://cdn.simpleicons.org/openaigym/ffffff'
        WHEN 'xai' THEN 'https://cdn.simpleicons.org/x/ffffff'
        WHEN 'google' THEN 'https://cdn.simpleicons.org/googlegemini/8E75B2'
        ELSE NULL
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_providers" DROP COLUMN IF EXISTS "logo_url";
    `);
  }
}
