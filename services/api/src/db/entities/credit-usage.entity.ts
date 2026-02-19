import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";
import { Project } from "./project.entity";
import { AIModel } from "./ai-model.entity";
import { Conversation } from "./conversation.entity";

@Entity("credit_usage")
@Index(["organization_id", "created_on"])
@Index(["user_id", "created_on"])
@Index(["project_id", "created_on"])
export class CreditUsage extends BaseEntity {
  @Column({ type: "integer" })
  organization_id!: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: "organization_id" })
  organization!: Organization;

  @Column({ type: "integer", nullable: true })
  user_id!: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User | null;

  @Column({ type: "integer", nullable: true })
  project_id!: number | null;

  @ManyToOne(() => Project)
  @JoinColumn({ name: "project_id" })
  project!: Project | null;

  @Column({ type: "integer", nullable: true })
  conversation_id!: number | null;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: "conversation_id" })
  conversation!: Conversation | null;

  @Column({ type: "integer" })
  model_id!: number;

  @ManyToOne(() => AIModel)
  @JoinColumn({ name: "model_id" })
  model!: AIModel;

  @Column({ type: "varchar", length: 100 })
  model_name!: string;

  @Column({ type: "varchar", length: 50 })
  provider_slug!: string;

  @Column({ type: "varchar", length: 50 })
  event_type!: "generation" | "streaming";

  @Column({ type: "integer" })
  input_tokens!: number;

  @Column({ type: "integer" })
  output_tokens!: number;

  @Column({ type: "integer" })
  total_tokens!: number;

  @Column({ type: "decimal", precision: 12, scale: 8 })
  cost_usd!: number;

  @Column({ type: "integer" })
  generation_time_ms!: number;

  @Column({ type: "boolean", default: false })
  used_fallback!: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  original_model!: string | null;

  @Column({ type: "varchar", length: 50 })
  finish_reason!: string;

  @Column({ type: "jsonb", default: {} })
  request_metadata!: Record<string, unknown>;
}
