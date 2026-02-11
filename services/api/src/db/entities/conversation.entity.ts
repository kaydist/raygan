import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";

import { BaseEntity } from "./base.entity";
import { Project } from "./project.entity";

export type MessageRole = "user" | "assistant" | "system";
export type ConversationStatus = "active" | "completed" | "error";

@Entity("conversations")
export class Conversation extends BaseEntity {
  @Column({ type: "integer" })
  project_id!: number;

  @Column({ type: "varchar", length: 20 })
  role!: MessageRole;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "integer", nullable: true })
  model_id!: number | null;

  @Column({ type: "integer", nullable: true })
  tokens_in!: number | null;

  @Column({ type: "integer", nullable: true })
  tokens_out!: number | null;

  @Column({ type: "integer", nullable: true })
  generation_time_ms!: number | null;

  @Column({ type: "numeric", precision: 10, scale: 6, nullable: true })
  cost_usd!: number | null;

  @Column({ type: "jsonb", nullable: true })
  ast_diff!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: ConversationStatus;

  // Relations
  @ManyToOne(() => Project, (project) => project.conversations)
  @JoinColumn({ name: "project_id" })
  project!: Project;
}
