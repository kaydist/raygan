import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRowLevelSecurityPolicies1708214400000 implements MigrationInterface {
  name = "AddRowLevelSecurityPolicies1708214400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS on all tables
    await queryRunner.query(`ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "project_files" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "ai_providers" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "ai_models" ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;`);

    // Helper function to get user's internal ID from Supabase auth.uid()
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_user_id()
      RETURNS INTEGER AS $$
        SELECT id FROM users WHERE auth_user_id = auth.uid() AND deleted_flag = false LIMIT 1;
      $$ LANGUAGE SQL SECURITY DEFINER STABLE;
    `);

    // Helper function to check org membership
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION is_org_member(org_id INTEGER)
      RETURNS BOOLEAN AS $$
        SELECT EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_id = org_id
            AND user_id = get_user_id()
            AND deleted_flag = false
            AND status = 'active'
        );
      $$ LANGUAGE SQL SECURITY DEFINER STABLE;
    `);

    // Helper function to check org role
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_org_role(org_id INTEGER)
      RETURNS VARCHAR AS $$
        SELECT role FROM organization_members
        WHERE organization_id = org_id
          AND user_id = get_user_id()
          AND deleted_flag = false
          AND status = 'active'
        LIMIT 1;
      $$ LANGUAGE SQL SECURITY DEFINER STABLE;
    `);

    // ==================== USERS ====================
    await queryRunner.query(`
      CREATE POLICY "users_select_own" ON "users"
        FOR SELECT USING (auth_user_id = auth.uid() AND deleted_flag = false);
    `);
    await queryRunner.query(`
      CREATE POLICY "users_update_own" ON "users"
        FOR UPDATE USING (auth_user_id = auth.uid() AND deleted_flag = false);
    `);

    // ==================== ORGANIZATIONS ====================
    await queryRunner.query(`
      CREATE POLICY "organizations_select_member" ON "organizations"
        FOR SELECT USING (is_org_member(id) AND deleted_flag = false);
    `);
    await queryRunner.query(`
      CREATE POLICY "organizations_update_admin" ON "organizations"
        FOR UPDATE USING (
          get_org_role(id) IN ('owner', 'admin') AND deleted_flag = false
        );
    `);

    // ==================== ORGANIZATION MEMBERS ====================
    await queryRunner.query(`
      CREATE POLICY "org_members_select" ON "organization_members"
        FOR SELECT USING (is_org_member(organization_id) AND deleted_flag = false);
    `);
    await queryRunner.query(`
      CREATE POLICY "org_members_insert_admin" ON "organization_members"
        FOR INSERT WITH CHECK (
          get_org_role(organization_id) IN ('owner', 'admin')
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "org_members_update_admin" ON "organization_members"
        FOR UPDATE USING (
          get_org_role(organization_id) IN ('owner', 'admin') AND deleted_flag = false
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "org_members_delete_admin" ON "organization_members"
        FOR DELETE USING (
          get_org_role(organization_id) IN ('owner', 'admin') AND deleted_flag = false
        );
    `);

    // ==================== PROJECTS ====================
    await queryRunner.query(`
      CREATE POLICY "projects_select_member" ON "projects"
        FOR SELECT USING (is_org_member(organization_id) AND deleted_flag = false);
    `);
    await queryRunner.query(`
      CREATE POLICY "projects_insert_member" ON "projects"
        FOR INSERT WITH CHECK (
          get_org_role(organization_id) IN ('owner', 'admin', 'member')
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "projects_update_member" ON "projects"
        FOR UPDATE USING (
          get_org_role(organization_id) IN ('owner', 'admin', 'member') AND deleted_flag = false
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "projects_delete_admin" ON "projects"
        FOR DELETE USING (
          get_org_role(organization_id) IN ('owner', 'admin') AND deleted_flag = false
        );
    `);

    // ==================== CONVERSATIONS ====================
    await queryRunner.query(`
      CREATE POLICY "conversations_select" ON "conversations"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
              AND is_org_member(p.organization_id)
              AND p.deleted_flag = false
          ) AND deleted_flag = false
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "conversations_insert" ON "conversations"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
              AND get_org_role(p.organization_id) IN ('owner', 'admin', 'member')
              AND p.deleted_flag = false
          )
        );
    `);

    // ==================== PROJECT FILES ====================
    await queryRunner.query(`
      CREATE POLICY "project_files_select" ON "project_files"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
              AND is_org_member(p.organization_id)
              AND p.deleted_flag = false
          ) AND deleted_flag = false
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "project_files_insert" ON "project_files"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
              AND get_org_role(p.organization_id) IN ('owner', 'admin', 'member')
              AND p.deleted_flag = false
          )
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "project_files_update" ON "project_files"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
              AND get_org_role(p.organization_id) IN ('owner', 'admin', 'member')
              AND p.deleted_flag = false
          ) AND deleted_flag = false
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "project_files_delete" ON "project_files"
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id
              AND get_org_role(p.organization_id) IN ('owner', 'admin')
              AND p.deleted_flag = false
          ) AND deleted_flag = false
        );
    `);

    // ==================== AI PROVIDERS (Public Read) ====================
    await queryRunner.query(`
      CREATE POLICY "ai_providers_select_enabled" ON "ai_providers"
        FOR SELECT USING (is_enabled = true AND deleted_flag = false);
    `);

    // ==================== AI MODELS (Public Read) ====================
    await queryRunner.query(`
      CREATE POLICY "ai_models_select_enabled" ON "ai_models"
        FOR SELECT USING (is_enabled = true AND deleted_flag = false);
    `);

    // ==================== SETTINGS ====================
    await queryRunner.query(`
      CREATE POLICY "settings_select_public" ON "settings"
        FOR SELECT USING (
          (visibility = 'public' AND deleted_flag = false)
          OR (
            organization_id IS NOT NULL
            AND is_org_member(organization_id)
            AND deleted_flag = false
          )
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "settings_insert_org" ON "settings"
        FOR INSERT WITH CHECK (
          organization_id IS NOT NULL
          AND get_org_role(organization_id) IN ('owner', 'admin')
        );
    `);
    await queryRunner.query(`
      CREATE POLICY "settings_update_org" ON "settings"
        FOR UPDATE USING (
          organization_id IS NOT NULL
          AND get_org_role(organization_id) IN ('owner', 'admin')
          AND deleted_flag = false
        );
    `);

    // Service role bypass (for backend API)
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_organizations" ON "organizations"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_users" ON "users"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_org_members" ON "organization_members"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_projects" ON "projects"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_conversations" ON "conversations"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_project_files" ON "project_files"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_ai_providers" ON "ai_providers"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_ai_models" ON "ai_models"
        FOR ALL USING (auth.role() = 'service_role');
    `);
    await queryRunner.query(`
      CREATE POLICY "service_role_bypass_settings" ON "settings"
        FOR ALL USING (auth.role() = 'service_role');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all policies
    const tables = [
      "organizations",
      "users",
      "organization_members",
      "projects",
      "conversations",
      "project_files",
      "ai_providers",
      "ai_models",
      "settings",
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS "service_role_bypass_${table.replace("_", "_")}" ON "${table}";`);
    }

    await queryRunner.query(`DROP POLICY IF EXISTS "settings_update_org" ON "settings";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "settings_insert_org" ON "settings";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "settings_select_public" ON "settings";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "ai_models_select_enabled" ON "ai_models";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "ai_providers_select_enabled" ON "ai_providers";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "project_files_delete" ON "project_files";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "project_files_update" ON "project_files";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "project_files_insert" ON "project_files";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "project_files_select" ON "project_files";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "conversations_insert" ON "conversations";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "conversations_select" ON "conversations";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "projects_delete_admin" ON "projects";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "projects_update_member" ON "projects";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "projects_insert_member" ON "projects";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "projects_select_member" ON "projects";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "org_members_delete_admin" ON "organization_members";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "org_members_update_admin" ON "organization_members";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "org_members_insert_admin" ON "organization_members";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "org_members_select" ON "organization_members";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "organizations_update_admin" ON "organizations";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "organizations_select_member" ON "organizations";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "users_update_own" ON "users";`);
    await queryRunner.query(`DROP POLICY IF EXISTS "users_select_own" ON "users";`);

    // Drop helper functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_org_role(INTEGER);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS is_org_member(INTEGER);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_user_id();`);

    // Disable RLS
    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
    }
  }
}
