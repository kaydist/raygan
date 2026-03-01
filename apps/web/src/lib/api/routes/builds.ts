import type {
  BuildResponse,
  BuildListResponse,
  TriggerBuildRequest,
} from "@raygan/shared";

import { axiosInstance, extractData } from "../client";

export const buildsApi = {
  trigger: async (projectId: string, data: TriggerBuildRequest): Promise<BuildResponse> => {
    const response = await axiosInstance.post(
      `/api/v1/projects/${projectId}/builds`,
      data,
    );
    return extractData(response);
  },

  list: async (
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<BuildListResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/builds`,
      { params: { page, limit } },
    );
    const data = response.data;
    return {
      builds: data.data,
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? page,
      limit: data.meta?.limit ?? limit,
    };
  },

  get: async (projectId: string, buildId: string): Promise<BuildResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/builds/${buildId}`,
    );
    return extractData(response);
  },

  cancel: async (projectId: string, buildId: string): Promise<BuildResponse> => {
    const response = await axiosInstance.delete(
      `/api/v1/projects/${projectId}/builds/${buildId}`,
    );
    return extractData(response);
  },
};
