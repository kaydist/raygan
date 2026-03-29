import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStoreReleaseTables1708600000000
  implements MigrationInterface
{
  name = "CreateStoreReleaseTables1708600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums for project_settings
    await queryRunner.query(`
      CREATE TYPE "project_settings_value_type_enum" AS ENUM ('string', 'number', 'boolean', 'json');
    `);

    await queryRunner.query(`
      CREATE TYPE "project_settings_visibility_enum" AS ENUM ('private', 'internal');
    `);

    // project_settings table
    await queryRunner.query(`
      CREATE TABLE "project_settings" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" integer NOT NULL,
        "organization_id" integer NOT NULL,
        "category" varchar(50) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "value" text NOT NULL,
        "value_type" "project_settings_value_type_enum" NOT NULL DEFAULT 'string',
        "is_encrypted" boolean NOT NULL DEFAULT false,
        "is_valid" boolean,
        "last_verified_at" timestamptz,
        "visibility" "project_settings_visibility_enum" NOT NULL DEFAULT 'private',
        "description" text,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer,
        CONSTRAINT "UQ_project_settings_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_project_settings_project_category_slug" UNIQUE ("project_id", "category", "slug"),
        CONSTRAINT "FK_project_settings_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_settings_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_settings_project_id" ON "project_settings" ("project_id") WHERE "deleted_flag" = false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_settings_category" ON "project_settings" ("project_id", "category") WHERE "deleted_flag" = false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_project_settings_org_id" ON "project_settings" ("organization_id") WHERE "deleted_flag" = false
    `);

    // store_listings table
    await queryRunner.query(`
      CREATE TABLE "store_listings" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" integer NOT NULL,
        "organization_id" integer NOT NULL,
        "store" varchar(20) NOT NULL,
        "title" varchar(50) NOT NULL,
        "short_description" varchar(80),
        "full_description" text,
        "category" varchar(100),
        "privacy_policy_url" text,
        "support_email" varchar(255),
        "screenshots" jsonb NOT NULL DEFAULT '[]',
        "feature_graphic_url" text,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer,
        CONSTRAINT "UQ_store_listings_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_store_listings_project_store" UNIQUE ("project_id", "store"),
        CONSTRAINT "FK_store_listings_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_store_listings_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_listings_project_id" ON "store_listings" ("project_id") WHERE "deleted_flag" = false
    `);

    // store_releases table
    await queryRunner.query(`
      CREATE TABLE "store_releases" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" integer NOT NULL,
        "organization_id" integer NOT NULL,
        "build_id" integer NOT NULL,
        "store" varchar(20) NOT NULL,
        "track" varchar(30) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "provider_submission_id" varchar(255),
        "artifact_url" text,
        "error_message" text,
        "submitted_at" timestamptz,
        "review_completed_at" timestamptz,
        "auto_triggered" boolean NOT NULL DEFAULT false,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer,
        CONSTRAINT "UQ_store_releases_uuid" UNIQUE ("uuid"),
        CONSTRAINT "FK_store_releases_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_store_releases_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_store_releases_build" FOREIGN KEY ("build_id") REFERENCES "builds"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_releases_project_status" ON "store_releases" ("project_id", "status") WHERE "deleted_flag" = false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_releases_org_status" ON "store_releases" ("organization_id", "status") WHERE "deleted_flag" = false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_releases_build_id" ON "store_releases" ("build_id") WHERE "deleted_flag" = false
    `);

    // Add auto_release columns to builds table
    await queryRunner.query(`
      ALTER TABLE "builds"
        ADD COLUMN "auto_release" boolean NOT NULL DEFAULT false,
        ADD COLUMN "release_track" varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "builds" DROP COLUMN "release_track", DROP COLUMN "auto_release"`
    );
    await queryRunner.query(`DROP INDEX "IDX_store_releases_build_id"`);
    await queryRunner.query(`DROP INDEX "IDX_store_releases_org_status"`);
    await queryRunner.query(`DROP INDEX "IDX_store_releases_project_status"`);
    await queryRunner.query(`DROP TABLE "store_releases"`);
    await queryRunner.query(`DROP INDEX "IDX_store_listings_project_id"`);
    await queryRunner.query(`DROP TABLE "store_listings"`);
    await queryRunner.query(`DROP INDEX "IDX_project_settings_org_id"`);
    await queryRunner.query(`DROP INDEX "IDX_project_settings_category"`);
    await queryRunner.query(`DROP INDEX "IDX_project_settings_project_id"`);
    await queryRunner.query(`DROP TABLE "project_settings"`);
    await queryRunner.query(
      `DROP TYPE "project_settings_visibility_enum"`
    );
    await queryRunner.query(
      `DROP TYPE "project_settings_value_type_enum"`
    );
  }
}
