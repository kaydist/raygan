import type {
  ProjectResponse,
  ProjectDetailResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  PaginationParams,
} from "@staq/shared";

import { axiosInstance, extractData } from "../client";

export type ProjectStatus = "draft" | "deployed" | "archived";

export interface ProjectListParams extends PaginationParams {
  organization_id?: number;
  status?: ProjectStatus;
}

export const projectsApi = {
  list: async (params?: ProjectListParams): Promise<ProjectResponse[]> => {
    const response = await axiosInstance.get("/api/v1/projects", { params });
    return extractData(response);
  },

  get: async (
    uuid: string,
    params?: { include_ast?: boolean; include_files?: boolean }
  ): Promise<ProjectDetailResponse> => {
    const response = await axiosInstance.get(`/api/v1/projects/${uuid}`, { params });
    return extractData(response);
  },

  create: async (data: CreateProjectRequest): Promise<ProjectResponse> => {
    const response = await axiosInstance.post("/api/v1/projects", data);
    return extractData(response);
  },

  update: async (uuid: string, data: UpdateProjectRequest): Promise<ProjectResponse> => {
    const response = await axiosInstance.patch(`/api/v1/projects/${uuid}`, data);
    return extractData(response);
  },

  delete: async (uuid: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/projects/${uuid}`);
  },

  archive: async (uuid: string): Promise<ProjectResponse> => {
    const response = await axiosInstance.patch(`/api/v1/projects/${uuid}`, {
      status: "archived" as ProjectStatus,
    });
    return extractData(response);
  },

  unarchive: async (uuid: string): Promise<ProjectResponse> => {
    const response = await axiosInstance.patch(`/api/v1/projects/${uuid}`, {
      status: "draft" as ProjectStatus,
    });
    return extractData(response);
  },

  updateStatus: async (uuid: string, status: ProjectStatus): Promise<ProjectResponse> => {
    const response = await axiosInstance.patch(`/api/v1/projects/${uuid}`, {
      status,
    });
    return extractData(response);
  },
};
