import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";

import { BaseEntity } from "./base.entity";
import { Organization } from "./organization.entity";
import type { Conversation } from "./conversation.entity";

@Entity("projects")
export class Project extends BaseEntity {
  @Column({ type: "integer" })
  organization_id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 255 })
  slug!: string;

  @Column({ type: "varchar", length: 20, default: "expo-52" })
  framework_version!: string;

  @Column({ type: "jsonb", default: {} })
  ast_snapshot!: Record<string, unknown>;

  @Column({ type: "jsonb", default: [] })
  file_tree!: unknown[];

  @Column({ type: "jsonb", default: {} })
  settings!: Record<string, unknown>;

  @Column({ type: "varchar", length: 50, nullable: true })
  backend_provider!: string | null;

  @Column({ type: "text", nullable: true })
  backend_config!: string | null;

  @Column({ type: "integer", nullable: true })
  default_model_id!: number | null;

  @Column({ type: "timestamptz", nullable: true })
  last_generated_at!: Date | null;

  @Column({ type: "boolean", default: false })
  is_archived!: boolean;

  // Relations
  @ManyToOne(() => Organization, (org) => org.projects)
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;

  @OneToMany("Conversation", "project")
  conversations!: Conversation[];
}
