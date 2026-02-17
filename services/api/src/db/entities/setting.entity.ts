import { Entity, Column, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Organization } from "./organization.entity";

export type SettingCategory = "app" | "ai" | "billing" | "preview" | "security" | "general";
export type SettingVisibility = "public" | "private" | "internal";
export type SettingValueType = "string" | "number" | "boolean" | "json";

@Entity("settings")
@Unique(["organization_id", "slug"])
export class Setting extends BaseEntity {
  @Column({ type: "integer", nullable: true, default: null })
  organization_id!: number | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization!: Organization | null;

  @Column({ type: "varchar", length: 100 })
  slug!: string;

  @Column({ type: "text" })
  value!: string;

  @Column({
    type: "enum",
    enum: ["string", "number", "boolean", "json"],
    default: "string",
  })
  value_type!: SettingValueType;

  @Column({
    type: "enum",
    enum: ["app", "ai", "billing", "preview", "security", "general"],
    default: "general",
  })
  category!: SettingCategory;

  @Column({
    type: "enum",
    enum: ["public", "private", "internal"],
    default: "private",
  })
  visibility!: SettingVisibility;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "boolean", default: false })
  is_encrypted!: boolean;
}
