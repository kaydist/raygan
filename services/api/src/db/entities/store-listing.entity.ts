import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";

import { BaseEntity } from "./base.entity";
import type { Project } from "./project.entity";
import type { Organization } from "./organization.entity";

export type StoreListingStoreType = "google_play" | "apple_app_store";

@Entity("store_listings")
@Unique(["project_id", "store"])
@Index(["project_id"])
export class StoreListing extends BaseEntity {
  @Column({ type: "integer" })
  project_id!: number;

  @Column({ type: "integer" })
  organization_id!: number;

  @Column({ type: "varchar", length: 20 })
  store!: StoreListingStoreType;

  @Column({ type: "varchar", length: 50 })
  title!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  short_description!: string | null;

  @Column({ type: "text", nullable: true })
  full_description!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  category!: string | null;

  @Column({ type: "text", nullable: true })
  privacy_policy_url!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  support_email!: string | null;

  @Column({ type: "jsonb", default: [] })
  screenshots!: string[];

  @Column({ type: "text", nullable: true })
  feature_graphic_url!: string | null;

  @ManyToOne("Project", { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne("Organization", { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;
}
