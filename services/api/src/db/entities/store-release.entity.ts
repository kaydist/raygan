import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";

import { BaseEntity } from "./base.entity";
import type { Project } from "./project.entity";
import type { Organization } from "./organization.entity";
import type { Build } from "./build.entity";

export type ReleaseStatusType =
  | "pending"
  | "submitting"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "live"
  | "failed";

export type ReleaseTrackType = "internal" | "alpha" | "beta" | "production";

export type ReleaseStoreType = "google_play" | "apple_app_store";
// Note: identical to StoreListingStoreType — kept separate to avoid circular imports

@Entity("store_releases")
@Index(["project_id", "status"])
@Index(["organization_id", "status"])
export class StoreRelease extends BaseEntity {
  @Column({ type: "integer" })
  project_id!: number;

  @Column({ type: "integer" })
  organization_id!: number;

  @Column({ type: "integer" })
  build_id!: number;

  @Column({ type: "varchar", length: 20 })
  store!: ReleaseStoreType;

  @Column({ type: "varchar", length: 30 })
  track!: ReleaseTrackType;

  @Column({ type: "varchar", length: 30, default: "pending" })
  status!: ReleaseStatusType;

  @Column({ type: "varchar", length: 255, nullable: true })
  provider_submission_id!: string | null;

  @Column({ type: "text", nullable: true })
  artifact_url!: string | null;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  submitted_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  review_completed_at!: Date | null;

  @Column({ type: "boolean", default: false })
  auto_triggered!: boolean;

  @ManyToOne("Project", { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne("Organization", { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;

  @ManyToOne("Build", { onDelete: "CASCADE" })
  @JoinColumn({ name: "build_id" })
  build!: Build;
}
