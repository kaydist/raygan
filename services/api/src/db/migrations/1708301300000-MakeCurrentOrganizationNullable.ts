import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeCurrentOrganizationNullable1708301300000 implements MigrationInterface {
  name = "MakeCurrentOrganizationNullable1708301300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "current_organization_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "activated_flag" = false
      WHERE "current_organization_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "current_organization_id" SET NOT NULL
    `);
  }
}
