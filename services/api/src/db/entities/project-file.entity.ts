import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";

import { BaseEntity } from "./base.entity";
import { Project } from "./project.entity";

export type FileType = "code" | "asset" | "config";

@Entity("project_files")
@Index(["project_id", "path"], { unique: true, where: '"deleted_flag" = false' })
export class ProjectFile extends BaseEntity {
  @Column({ type: "integer" })
  project_id!: number;

  @Column({ type: "varchar", length: 500 })
  path!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 20, default: "code" })
  file_type!: FileType;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  language!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  mime_type!: string | null;

  @Column({ type: "integer", default: 0 })
  size_bytes!: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  content_hash!: string | null;

  @Column({ type: "integer", nullable: true })
  parent_id!: number | null;

  @Column({ type: "boolean", default: false })
  is_directory!: boolean;

  @Column({ type: "integer", default: 0 })
  version!: number;

  @Column({ type: "integer", nullable: true })
  conversation_id!: number | null;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @ManyToOne(() => ProjectFile, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "parent_id" })
  parent!: ProjectFile | null;
}
