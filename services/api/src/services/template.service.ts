import { getExpoBaseTemplate, type TemplateFile } from "../templates/expo-base";
import { FileStorageService } from "./file-storage.service";
import { logger } from "../config";

export type TemplateType = "expo-base";

export class TemplateService {
  private fileStorage: FileStorageService;

  constructor() {
    this.fileStorage = new FileStorageService();
  }

  async initializeProject(
    projectId: number,
    projectName: string,
    projectSlug: string,
    templateType: TemplateType,
    userId: number
  ): Promise<number> {
    const templateFiles = this.getTemplateFiles(templateType, projectName, projectSlug);

    logger.info({
      projectId,
      templateType,
      fileCount: templateFiles.length,
    }, "Initializing project with template");

    const files = await this.fileStorage.bulkCreateOrUpdate(
      projectId,
      templateFiles.map((f) => ({
        path: f.path,
        content: f.content,
        language: f.language,
      })),
      userId
    );

    logger.info({
      projectId,
      createdFiles: files.length,
    }, "Project template initialized successfully");

    return files.length;
  }

  getTemplateFiles(
    templateType: TemplateType,
    projectName: string,
    projectSlug: string
  ): TemplateFile[] {
    switch (templateType) {
      case "expo-base":
        return getExpoBaseTemplate(projectName, projectSlug);
      default:
        return getExpoBaseTemplate(projectName, projectSlug);
    }
  }

  getAvailableTemplates(): Array<{
    type: TemplateType;
    name: string;
    description: string;
  }> {
    return [
      {
        type: "expo-base",
        name: "Expo Base",
        description: "Basic Expo project with navigation and TypeScript",
      },
    ];
  }
}
