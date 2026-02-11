import { Entity, Column, OneToMany } from "typeorm";

import { BaseEntity } from "./base.entity";
import type { OrganizationMember } from "./organization-member.entity";
import type { Project } from "./project.entity";

export type PlanTier = "free" | "starter" | "pro" | "team" | "enterprise";

@Entity("organizations")
export class Organization extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug!: string;

  @Column({ type: "text", nullable: true })
  logo_url!: string | null;

  @Column({ type: "varchar", length: 20, default: "free" })
  plan!: PlanTier;

  @Column({ type: "boolean", default: false })
  is_personal!: boolean;

  // Relations (lazy loaded to avoid circular dependencies)
  @OneToMany("OrganizationMember", "organization")
  members!: OrganizationMember[];

  @OneToMany("Project", "organization")
  projects!: Project[];
}
