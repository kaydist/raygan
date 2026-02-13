import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { AIProvider } from "./ai-provider.entity";

@Entity("ai_models")
export class AIModel extends BaseEntity {
  @Column({ type: "integer" })
  provider_id!: number;

  @ManyToOne(() => AIProvider, (provider) => provider.models)
  @JoinColumn({ name: "provider_id" })
  provider!: AIProvider;

  @Column({ type: "varchar", length: 100 })
  model_id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "integer" })
  context_window!: number;

  @Column({ type: "integer" })
  max_output_tokens!: number;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  input_cost_per_1k!: number;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  output_cost_per_1k!: number;

  @Column({ type: "boolean", default: false })
  supports_vision!: boolean;

  @Column({ type: "boolean", default: false })
  supports_tools!: boolean;

  @Column({ type: "boolean", default: false })
  supports_streaming!: boolean;

  @Column({ type: "boolean", default: true })
  is_enabled!: boolean;

  @Column({ type: "boolean", default: false })
  is_default!: boolean;

  @Column({ type: "integer", default: 0 })
  priority!: number;

  @Column({ type: "jsonb", default: {} })
  capabilities!: Record<string, unknown>;
}
