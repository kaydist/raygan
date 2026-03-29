import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";

import { BaseEntity } from "./base.entity";
import type { Project } from "./project.entity";
import type { Organization } from "./organization.entity";

export type BuildStatusType =
  | "queued"
  | "provisioning"
  | "building"
  | "completed"
  | "failed"
  | "cancelled";

export type BuildPlatformType = "android";

export type BuildProfileType = "development" | "preview" | "production";

export type BuildDistributionType = "internal" | "store";

export type BuildProviderType = "eas";

@Entity("builds")
@Index(["organization_id", "status"])
@Index(["project_id", "status"])
export class Build extends BaseEntity {
  @Column({ type: "integer" })
  project_id!: number;

  @Column({ type: "integer" })
  organization_id!: number;

  @Column({ type: "varchar", length: 20 })
  platform!: BuildPlatformType;

  @Column({ type: "varchar", length: 20, default: "queued" })
  status!: BuildStatusType;

  @Column({ type: "varchar", length: 20, default: "preview" })
  profile!: BuildProfileType;

  @Column({ type: "varchar", length: 20, default: "internal" })
  distribution!: BuildDistributionType;

  @Column({ type: "varchar", length: 20, default: "eas" })
  provider!: BuildProviderType;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  provider_build_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  provider_project_id!: string | null;

  @Column({ type: "text", nullable: true })
  artifact_url!: string | null;

  @Column({ type: "text", nullable: true })
  logs_url!: string | null;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  sdk_version!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  app_version!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  started_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  completed_at!: Date | null;

  @Column({ type: "boolean", default: false })
  auto_release!: boolean;

  @Column({ type: "varchar", length: 30, nullable: true })
  release_track!: "internal" | "alpha" | "beta" | "production" | null;

  @ManyToOne("Project", "builds")
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne("Organization", "builds")
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;
}
