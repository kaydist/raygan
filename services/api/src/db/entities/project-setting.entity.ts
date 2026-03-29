import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";

import { BaseEntity } from "./base.entity";
import type { Project } from "./project.entity";
import type { Organization } from "./organization.entity";

export type ProjectSettingValueType = "string" | "number" | "boolean" | "json";

export type ProjectSettingVisibility = "private" | "internal";

@Entity("project_settings")
@Unique(["project_id", "category", "slug"])
@Index(["project_id"])
@Index(["organization_id"])
export class ProjectSetting extends BaseEntity {
  @Column({ type: "integer" })
  project_id!: number;

  @Column({ type: "integer" })
  organization_id!: number;

  @Column({ type: "varchar", length: 50 })
  category!: string;

  @Column({ type: "varchar", length: 100 })
  slug!: string;

  @Column({ type: "text" })
  value!: string;

  @Column({
    type: "enum",
    enum: ["string", "number", "boolean", "json"],
    default: "string",
  })
  value_type!: ProjectSettingValueType;

  @Column({ type: "boolean", default: false })
  is_encrypted!: boolean;

  @Column({ type: "boolean", nullable: true })
  is_valid!: boolean | null;

  @Column({ type: "timestamptz", nullable: true })
  last_verified_at!: Date | null;

  @Column({
    type: "enum",
    enum: ["private", "internal"],
    default: "private",
  })
  visibility!: ProjectSettingVisibility;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToOne("Project", { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne("Organization", { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;
}
