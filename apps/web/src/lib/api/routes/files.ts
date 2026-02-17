import { axiosInstance, extractData } from "../client";

export interface ProjectFileResponse {
  uuid: string;
  path: string;
  name: string;
  type: "file" | "directory";
  content: string | null;
  language: string | null;
  size_bytes: number;
  version: number;
  updated_on: string;
}

export interface SnackFilesResponse {
  [path: string]: {
    type: "CODE" | "ASSET";
    contents: string;
  };
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: "file" | "directory";
  language?: string;
  size?: number;
  children?: FileTreeNode[];
}

export interface CreateFileRequest {
  path: string;
  content: string;
  language?: string;
}

export interface UpdateFileRequest {
  content: string;
  language?: string;
}

export interface BulkCreateFilesRequest {
  files: Array<{
    path: string;
    content: string;
    language?: string;
  }>;
}

export const filesApi = {
  list: async (projectId: string): Promise<ProjectFileResponse[]> => {
    const response = await axiosInstance.get(`/api/v1/projects/${projectId}/files`);
    return extractData(response);
  },

  listForSnack: async (projectId: string): Promise<SnackFilesResponse> => {
    const response = await axiosInstance.get(`/api/v1/projects/${projectId}/files`, {
      params: { format: "snack" },
    });
    return extractData(response);
  },

  getTree: async (projectId: string): Promise<FileTreeNode[]> => {
    const response = await axiosInstance.get(`/api/v1/projects/${projectId}/files`, {
      params: { format: "tree" },
    });
    return extractData(response);
  },

  get: async (projectId: string, fileId: string): Promise<ProjectFileResponse> => {
    const response = await axiosInstance.get(`/api/v1/projects/${projectId}/files/${fileId}`);
    return extractData(response);
  },

  getByPath: async (projectId: string, path: string): Promise<ProjectFileResponse> => {
    const response = await axiosInstance.get(`/api/v1/projects/${projectId}/files/by-path`, {
      params: { path },
    });
    return extractData(response);
  },

  create: async (projectId: string, data: CreateFileRequest): Promise<ProjectFileResponse> => {
    const response = await axiosInstance.post(`/api/v1/projects/${projectId}/files`, data);
    return extractData(response);
  },

  update: async (
    projectId: string,
    fileId: string,
    data: UpdateFileRequest
  ): Promise<ProjectFileResponse> => {
    const response = await axiosInstance.patch(
      `/api/v1/projects/${projectId}/files/${fileId}`,
      data
    );
    return extractData(response);
  },

  delete: async (projectId: string, fileId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/projects/${projectId}/files/${fileId}`);
  },

  bulkCreate: async (
    projectId: string,
    data: BulkCreateFilesRequest
  ): Promise<ProjectFileResponse[]> => {
    const response = await axiosInstance.post(
      `/api/v1/projects/${projectId}/files/bulk`,
      data
    );
    return extractData(response);
  },
};
