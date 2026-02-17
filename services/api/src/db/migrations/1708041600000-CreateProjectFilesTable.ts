import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjectFilesTable1708041600000 implements MigrationInterface {
  name = "CreateProjectFilesTable1708041600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_files" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
        "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "path" varchar(500) NOT NULL,
        "name" varchar(255) NOT NULL,
        "file_type" varchar(20) NOT NULL DEFAULT 'code',
        "content" text,
        "language" varchar(50),
        "mime_type" varchar(100),
        "size_bytes" integer NOT NULL DEFAULT 0,
        "content_hash" varchar(64),
        "parent_id" integer REFERENCES "project_files"("id") ON DELETE SET NULL,
        "is_directory" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 0,
        "conversation_id" integer REFERENCES "conversations"("id") ON DELETE SET NULL,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_project_files_path_unique"
      ON "project_files"("project_id", "path")
      WHERE "deleted_flag" = false
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_files_project_id"
      ON "project_files"("project_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_files_parent_id"
      ON "project_files"("parent_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_files_deleted"
      ON "project_files"("deleted_flag")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_project_files_file_type"
      ON "project_files"("file_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_files" CASCADE`);
  }
}
