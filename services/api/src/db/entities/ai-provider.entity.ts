import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { AIModel } from "./ai-model.entity";

export type ProviderSlug = "anthropic" | "openai" | "xai" | "google" | "mistral" | "deepseek";

@Entity("ai_providers")
export class AIProvider extends BaseEntity {
  @Column({ type: "varchar", length: 50, unique: true })
  slug!: ProviderSlug;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  base_url!: string | null;

  @Column({ type: "text", nullable: true })
  api_key_encrypted!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  api_key_header!: string | null;

  @Column({ type: "integer", default: 120000 })
  timeout_ms!: number;

  @Column({ type: "integer", default: 3 })
  max_retries!: number;

  @Column({ type: "boolean", default: true })
  is_enabled!: boolean;

  @Column({ type: "integer", default: 0 })
  priority!: number;

  @OneToMany(() => AIModel, (model) => model.provider)
  models!: AIModel[];
}
