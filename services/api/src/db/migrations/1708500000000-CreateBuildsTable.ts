import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBuildsTable1708500000000 implements MigrationInterface {
  name = "CreateBuildsTable1708500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "builds" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" integer NOT NULL,
        "organization_id" integer NOT NULL,
        "platform" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'queued',
        "profile" varchar(20) NOT NULL DEFAULT 'preview',
        "distribution" varchar(20) NOT NULL DEFAULT 'internal',
        "provider" varchar(20) NOT NULL DEFAULT 'eas',
        "provider_build_id" varchar(255),
        "provider_project_id" varchar(255),
        "artifact_url" text,
        "logs_url" text,
        "error_message" text,
        "sdk_version" varchar(20),
        "app_version" varchar(20),
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer,
        CONSTRAINT "UQ_builds_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_builds_provider_build_id" UNIQUE ("provider_build_id"),
        CONSTRAINT "FK_builds_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_builds_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_builds_org_status" ON "builds" ("organization_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_builds_project_status" ON "builds" ("project_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_builds_project_status"`);
    await queryRunner.query(`DROP INDEX "IDX_builds_org_status"`);
    await queryRunner.query(`DROP TABLE "builds"`);
  }
}
