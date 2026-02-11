import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";

import { BaseEntity } from "./base.entity";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

@Entity("organization_members")
export class OrganizationMember extends BaseEntity {
  @Column({ type: "integer" })
  organization_id!: number;

  @Column({ type: "integer" })
  user_id!: number;

  @Column({ type: "varchar", length: 20, default: "member" })
  role!: OrgRole;

  @Column({ type: "integer", nullable: true })
  invited_by!: number | null;

  @Column({ type: "timestamptz", nullable: true })
  invited_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  joined_at!: Date | null;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: string;

  // Relations
  @ManyToOne(() => Organization, (org) => org.members)
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;

  @ManyToOne(() => User, (user) => user.organization_memberships)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "invited_by" })
  inviter!: User | null;
}
