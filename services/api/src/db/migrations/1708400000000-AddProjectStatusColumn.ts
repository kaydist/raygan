import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectStatusColumn1708400000000 implements MigrationInterface {
  name = "AddProjectStatusColumn1708400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'draft'
    `);

    await queryRunner.query(`
      UPDATE "projects"
      SET "status" = CASE
        WHEN "is_archived" = true THEN 'archived'
        WHEN "last_generated_at" IS NOT NULL THEN 'deployed'
        ELSE 'draft'
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN "is_archived"
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status" ON "projects" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_projects_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "is_archived" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "projects"
      SET "is_archived" = CASE
        WHEN "status" = 'archived' THEN true
        ELSE false
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN "status"
    `);
  }
}
