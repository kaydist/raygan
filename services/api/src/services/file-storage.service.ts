import { createHash } from "crypto";

import { AppDataSource, ProjectFile, type FileType } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import { logger } from "../config";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";

export interface CreateFileInput {
  project_id: number;
  path: string;
  content: string;
  file_type?: FileType;
  language?: string;
  conversation_id?: number;
}

export interface UpdateFileInput {
  content: string;
  language?: string;
  conversation_id?: number;
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: "file" | "directory";
  language?: string;
  size?: number;
  children?: FileTreeNode[];
}

export interface SnackFile {
  type: "CODE" | "ASSET";
  contents: string;
}

export interface SnackFiles {
  [path: string]: SnackFile;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
};

const ASSET_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];

export class FileStorageService {
  private files = new BaseRepository(ProjectFile);

  async findByProjectId(projectId: number): Promise<ProjectFile[]> {
    const cacheKey = CACHE_KEYS.projectFiles.all(projectId);
    const cached = await CacheService.get<ProjectFile[]>(cacheKey);
    if (cached) {
      logger.debug({ projectId }, "Project files served from cache");
      return cached;
    }

    const files = await this.files.findAll({
      where: { project_id: projectId },
      order: { path: "ASC" },
    });

    await CacheService.set(cacheKey, files, CACHE_TTL.PROJECT_FILES);
    return files;
  }

  async findByPath(projectId: number, path: string): Promise<ProjectFile | null> {
    const cacheKey = CACHE_KEYS.projectFiles.byPath(projectId, path);
    const cached = await CacheService.get<ProjectFile>(cacheKey);
    if (cached) {
      return cached;
    }

    const file = await this.files.findOne({
      where: { project_id: projectId, path },
    });

    if (file) {
      await CacheService.set(cacheKey, file, CACHE_TTL.PROJECT_FILES);
    }

    return file;
  }

  async findByUuid(uuid: string): Promise<ProjectFile | null> {
    return this.files.findByUuid(uuid);
  }

  async createOrUpdate(input: CreateFileInput, userId: number): Promise<ProjectFile> {
    const existing = await this.findByPath(input.project_id, input.path);

    if (existing) {
      return this.update(existing.id, {
        content: input.content,
        language: input.language,
        conversation_id: input.conversation_id,
      }, userId);
    }

    return this.create(input, userId);
  }

  async create(input: CreateFileInput, userId: number): Promise<ProjectFile> {
    const name = input.path.split("/").pop() || input.path;
    const language = input.language || this.inferLanguage(input.path);
    const contentHash = this.hashContent(input.content);
    const sizeBytes = Buffer.byteLength(input.content, "utf8");
    const isAsset = this.isAssetFile(input.path);

    const file = await this.files.create({
      project_id: input.project_id,
      path: input.path,
      name,
      file_type: input.file_type || (isAsset ? "asset" : "code"),
      content: input.content,
      language,
      size_bytes: sizeBytes,
      content_hash: contentHash,
      is_directory: false,
      version: 1,
      conversation_id: input.conversation_id,
    }, userId);

    await CacheService.invalidateProjectFiles(input.project_id);

    logger.info({
      projectId: input.project_id,
      path: input.path,
      fileId: file.id,
    }, "File created");

    return file;
  }

  async update(id: number, input: UpdateFileInput, userId: number): Promise<ProjectFile> {
    const existing = await this.files.findById(id);
    if (!existing) {
      throw new Error(`File with id ${id} not found`);
    }

    const contentHash = this.hashContent(input.content);
    const sizeBytes = Buffer.byteLength(input.content, "utf8");

    const repo = AppDataSource.getRepository(ProjectFile);
    await repo.update(id, {
      content: input.content,
      language: input.language || existing.language,
      content_hash: contentHash,
      size_bytes: sizeBytes,
      version: existing.version + 1,
      conversation_id: input.conversation_id || existing.conversation_id,
      updated_by: userId,
      updated_on: new Date(),
    });

    const updated = await this.files.findById(id);
    if (!updated) {
      throw new Error(`File with id ${id} not found after update`);
    }

    await CacheService.invalidateProjectFile(
      existing.project_id,
      id,
      existing.path
    );

    logger.info({
      fileId: id,
      path: updated.path,
      version: updated.version,
    }, "File updated");

    return updated;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const file = await this.files.findById(id);
    if (!file) return false;

    const result = await this.files.softDelete(id, userId);
    if (result) {
      await CacheService.invalidateProjectFile(file.project_id, id, file.path);
    }
    return result;
  }

  async deleteByPath(projectId: number, path: string, userId: number): Promise<boolean> {
    const file = await this.findByPath(projectId, path);
    if (!file) return false;

    const result = await this.files.softDelete(file.id, userId);
    if (result) {
      await CacheService.invalidateProjectFile(projectId, file.id, path);
    }
    return result;
  }

  async bulkCreateOrUpdate(
    projectId: number,
    files: Array<{ path: string; content: string; language?: string }>,
    userId: number,
    conversationId?: number
  ): Promise<ProjectFile[]> {
    const results: ProjectFile[] = [];

    for (const file of files) {
      const result = await this.createOrUpdate({
        project_id: projectId,
        path: file.path,
        content: file.content,
        language: file.language,
        conversation_id: conversationId,
      }, userId);
      results.push(result);
    }

    await CacheService.invalidateProjectFiles(projectId);

    logger.info({
      projectId,
      fileCount: results.length,
      paths: results.map(f => f.path),
    }, "Bulk file operation completed");

    return results;
  }

  async getFileTree(projectId: number): Promise<FileTreeNode[]> {
    const cacheKey = CACHE_KEYS.projectFiles.tree(projectId);
    const cached = await CacheService.get<FileTreeNode[]>(cacheKey);
    if (cached) {
      logger.debug({ projectId }, "File tree served from cache");
      return cached;
    }

    const files = await this.findByProjectId(projectId);
    const tree = this.buildFileTree(files);

    await CacheService.set(cacheKey, tree, CACHE_TTL.PROJECT_FILE_TREE);
    return tree;
  }

  async getSnackFiles(projectId: number): Promise<SnackFiles> {
    const cacheKey = CACHE_KEYS.projectFiles.snack(projectId);
    const cached = await CacheService.get<SnackFiles>(cacheKey);
    if (cached) {
      logger.debug({ projectId }, "Snack files served from cache");
      return cached;
    }

    const files = await this.findByProjectId(projectId);
    const snackFiles: SnackFiles = {};

    for (const file of files) {
      if (file.is_directory || !file.content) continue;

      const normalizedPath = this.normalizePathForSnack(file.path);
      const isAsset = this.isAssetFile(file.path);

      snackFiles[normalizedPath] = {
        type: isAsset ? "ASSET" : "CODE",
        contents: file.content,
      };
    }

    await CacheService.set(cacheKey, snackFiles, CACHE_TTL.PROJECT_FILES);
    return snackFiles;
  }

  async getFilesForFrontend(projectId: number): Promise<Array<{
    uuid: string;
    path: string;
    name: string;
    type: "file" | "directory";
    content: string | null;
    language: string | null;
    size_bytes: number;
    version: number;
    updated_on: Date;
  }>> {
    const files = await this.findByProjectId(projectId);
    return files.map(f => ({
      uuid: f.uuid,
      path: f.path,
      name: f.name,
      type: f.is_directory ? "directory" : "file",
      content: f.content,
      language: f.language,
      size_bytes: f.size_bytes,
      version: f.version,
      updated_on: f.updated_on,
    }));
  }

  private buildFileTree(files: ProjectFile[]): FileTreeNode[] {
    const tree: FileTreeNode[] = [];
    const directoryMap = new Map<string, FileTreeNode>();

    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sortedFiles) {
      const parts = file.path.split("/");
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        const isLast = i === parts.length - 1;
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          const node: FileTreeNode = {
            path: file.path,
            name: file.name,
            type: file.is_directory ? "directory" : "file",
            language: file.language || undefined,
            size: file.size_bytes,
          };

          if (parentPath && directoryMap.has(parentPath)) {
            const parent = directoryMap.get(parentPath)!;
            parent.children = parent.children || [];
            parent.children.push(node);
          } else {
            tree.push(node);
          }
        } else {
          if (!directoryMap.has(currentPath)) {
            const dirNode: FileTreeNode = {
              path: currentPath,
              name: part,
              type: "directory",
              children: [],
            };
            directoryMap.set(currentPath, dirNode);

            if (parentPath && directoryMap.has(parentPath)) {
              const parent = directoryMap.get(parentPath)!;
              parent.children = parent.children || [];
              parent.children.push(dirNode);
            } else {
              tree.push(dirNode);
            }
          }
        }
      }
    }

    return tree;
  }

  private normalizePathForSnack(path: string): string {
    let normalized = path.startsWith("/") ? path.slice(1) : path;
    normalized = normalized.startsWith("src/") ? normalized.slice(4) : normalized;
    return normalized;
  }

  private inferLanguage(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return LANGUAGE_MAP[ext] || "plaintext";
  }

  private isAssetFile(path: string): boolean {
    return ASSET_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
  }

  private hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }
}
