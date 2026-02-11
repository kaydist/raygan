import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
} from "typeorm";

/**
 * Base entity with standard audit columns
 * All entities extend this class
 *
 * Properties use snake_case to match database columns directly
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid!: string;

  @Column({ type: "jsonb", default: {} })
  meta!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  created_on!: Date;

  @Column({ type: "integer", nullable: true })
  created_by!: number | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_on!: Date;

  @Column({ type: "integer", nullable: true })
  updated_by!: number | null;

  @Column({ type: "boolean", default: false })
  deleted_flag!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  deleted_on!: Date | null;

  @Column({ type: "integer", nullable: true })
  deleted_by!: number | null;
}
