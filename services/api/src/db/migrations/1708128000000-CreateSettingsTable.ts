import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSettingsTable1708128000000 implements MigrationInterface {
  name = "CreateSettingsTable1708128000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "settings_category_enum" AS ENUM ('app', 'ai', 'billing', 'preview', 'security', 'general');
    `);

    await queryRunner.query(`
      CREATE TYPE "settings_visibility_enum" AS ENUM ('public', 'private', 'internal');
    `);

    await queryRunner.query(`
      CREATE TYPE "settings_value_type_enum" AS ENUM ('string', 'number', 'boolean', 'json');
    `);

    await queryRunner.query(`
      CREATE TABLE "settings" (
        "id" SERIAL PRIMARY KEY,
        "uuid" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "organization_id" INTEGER REFERENCES "organizations"("id") ON DELETE CASCADE DEFAULT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "value" TEXT NOT NULL,
        "value_type" "settings_value_type_enum" NOT NULL DEFAULT 'string',
        "category" "settings_category_enum" NOT NULL DEFAULT 'general',
        "visibility" "settings_visibility_enum" NOT NULL DEFAULT 'private',
        "description" TEXT,
        "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
        "meta" JSONB NOT NULL DEFAULT '{}',
        "created_on" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" INTEGER,
        "updated_on" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" INTEGER,
        "deleted_flag" BOOLEAN NOT NULL DEFAULT false,
        "deleted_on" TIMESTAMPTZ,
        "deleted_by" INTEGER,
        UNIQUE("organization_id", "slug")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_settings_slug" ON "settings"("slug") WHERE "deleted_flag" = false;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_settings_category" ON "settings"("category") WHERE "deleted_flag" = false;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_settings_visibility" ON "settings"("visibility") WHERE "deleted_flag" = false;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_settings_org_id" ON "settings"("organization_id") WHERE "deleted_flag" = false;
    `);

    await queryRunner.query(`
      INSERT INTO "settings" ("slug", "value", "value_type", "category", "visibility", "description") VALUES
      ('app.name', 'Staq', 'string', 'app', 'public', 'Application name'),
      ('app.version', '1.0.0', 'string', 'app', 'public', 'Application version'),
      ('app.maintenance_mode', 'false', 'boolean', 'app', 'public', 'Enable maintenance mode');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "settings" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "settings_value_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "settings_visibility_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "settings_category_enum";`);
  }
}
