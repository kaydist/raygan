import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrentOrganizationToUser1707868800000 implements MigrationInterface {
  name = "AddCurrentOrganizationToUser1707868800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "current_organization_id" integer
    `);

    await queryRunner.query(`
      UPDATE "users" u
      SET "current_organization_id" = (
        SELECT om."organization_id"
        FROM "organization_members" om
        JOIN "organizations" o ON o."id" = om."organization_id"
        WHERE om."user_id" = u."id"
          AND om."deleted_flag" = false
          AND o."is_personal" = true
        LIMIT 1
      )
      WHERE u."current_organization_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users" u
      SET "current_organization_id" = (
        SELECT om."organization_id"
        FROM "organization_members" om
        WHERE om."user_id" = u."id"
          AND om."deleted_flag" = false
        ORDER BY om."created_on" ASC
        LIMIT 1
      )
      WHERE u."current_organization_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "activated_flag" = false
      WHERE "current_organization_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "current_organization_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_current_organization"
      FOREIGN KEY ("current_organization_id")
      REFERENCES "organizations"("id")
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_current_organization_id"
      ON "users" ("current_organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_current_organization_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_current_organization"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "current_organization_id"`);
  }
}
