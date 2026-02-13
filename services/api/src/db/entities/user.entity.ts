import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";

import { BaseEntity } from "./base.entity";
import type { OrganizationMember } from "./organization-member.entity";
import type { Organization } from "./organization.entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ type: "uuid", unique: true })
  auth_user_id!: string;

  @Column({ type: "varchar", length: 100 })
  first_name!: string;

  @Column({ type: "varchar", length: 100 })
  last_name!: string;

  @Column({ type: "varchar", length: 200 })
  display_name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  avatar_url!: string | null;

  @Column({ type: "boolean", default: false })
  activated_flag!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  activated_on!: Date | null;

  @Column({ type: "integer", nullable: true })
  activated_by!: number | null;

  @Column({ type: "boolean", default: false })
  onboarding_completed!: boolean;

  @Column({ type: "integer" })
  current_organization_id!: number;

  // Relations
  @OneToMany("OrganizationMember", "user")
  organization_memberships!: OrganizationMember[];

  @ManyToOne("Organization")
  @JoinColumn({ name: "current_organization_id" })
  current_organization!: Organization;
}
