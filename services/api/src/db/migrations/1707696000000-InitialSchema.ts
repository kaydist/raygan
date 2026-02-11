import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1707696000000 implements MigrationInterface {
  name = "InitialSchema1707696000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL UNIQUE,
        "logo_url" text,
        "plan" varchar(20) NOT NULL DEFAULT 'free',
        "is_personal" boolean NOT NULL DEFAULT false,
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

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
        "auth_user_id" uuid NOT NULL UNIQUE,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "display_name" varchar(200) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "avatar_url" text,
        "activated_flag" boolean NOT NULL DEFAULT false,
        "activated_on" timestamptz,
        "activated_by" integer,
        "onboarding_completed" boolean NOT NULL DEFAULT false,
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

    // Create organization_members table
    await queryRunner.query(`
      CREATE TABLE "organization_members" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" varchar(20) NOT NULL DEFAULT 'member',
        "invited_by" integer REFERENCES "users"("id"),
        "invited_at" timestamptz,
        "joined_at" timestamptz,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer,
        UNIQUE("organization_id", "user_id")
      )
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "description" text,
        "slug" varchar(255) NOT NULL,
        "framework_version" varchar(20) NOT NULL DEFAULT 'expo-52',
        "ast_snapshot" jsonb NOT NULL DEFAULT '{}',
        "file_tree" jsonb NOT NULL DEFAULT '[]',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "backend_provider" varchar(50),
        "backend_config" text,
        "default_model_id" integer,
        "last_generated_at" timestamptz,
        "is_archived" boolean NOT NULL DEFAULT false,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "created_on" timestamptz NOT NULL DEFAULT now(),
        "created_by" integer,
        "updated_on" timestamptz NOT NULL DEFAULT now(),
        "updated_by" integer,
        "deleted_flag" boolean NOT NULL DEFAULT false,
        "deleted_on" timestamptz,
        "deleted_by" integer,
        UNIQUE("organization_id", "slug")
      )
    `);

    // Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" SERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
        "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "role" varchar(20) NOT NULL,
        "content" text NOT NULL,
        "model_id" integer,
        "tokens_in" integer,
        "tokens_out" integer,
        "generation_time_ms" integer,
        "cost_usd" numeric(10, 6),
        "ast_diff" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'active',
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

    // Create indexes
    await queryRunner.query(`CREATE INDEX "idx_organizations_slug" ON "organizations"("slug")`);
    await queryRunner.query(`CREATE INDEX "idx_organizations_deleted" ON "organizations"("deleted_flag")`);

    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users"("email")`);
    await queryRunner.query(`CREATE INDEX "idx_users_auth_user_id" ON "users"("auth_user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_deleted" ON "users"("deleted_flag")`);

    await queryRunner.query(`CREATE INDEX "idx_org_members_org_id" ON "organization_members"("organization_id")`);
    await queryRunner.query(`CREATE INDEX "idx_org_members_user_id" ON "organization_members"("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_org_members_deleted" ON "organization_members"("deleted_flag")`);

    await queryRunner.query(`CREATE INDEX "idx_projects_org_id" ON "projects"("organization_id")`);
    await queryRunner.query(`CREATE INDEX "idx_projects_slug" ON "projects"("slug")`);
    await queryRunner.query(`CREATE INDEX "idx_projects_deleted" ON "projects"("deleted_flag")`);

    await queryRunner.query(`CREATE INDEX "idx_conversations_project_id" ON "conversations"("project_id")`);
    await queryRunner.query(`CREATE INDEX "idx_conversations_deleted" ON "conversations"("deleted_flag")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_members" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE`);
  }
}
