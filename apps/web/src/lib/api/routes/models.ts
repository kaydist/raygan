import type { AiModelConfig } from "@raygan/shared";

import { axiosInstance, extractData } from "../client";

export const modelsApi = {
  list: async (): Promise<AiModelConfig[]> => {
    const response = await axiosInstance.get("/api/v1/models");
    return extractData(response);
  },

  get: async (id: number): Promise<AiModelConfig> => {
    const response = await axiosInstance.get(`/api/v1/models/${id}`);
    return extractData(response);
  },
};
