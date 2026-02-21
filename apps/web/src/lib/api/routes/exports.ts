import { axiosInstance } from "../client";

export interface ExportOptions {
  includeBackendSDK?: boolean;
}

export const exportsApi = {
  downloadProjectZip: async (projectId: string, options?: ExportOptions): Promise<Blob> => {
    const params = new URLSearchParams();
    if (options?.includeBackendSDK) {
      params.set("includeBackendSDK", "true");
    }

    const queryString = params.toString();
    const url = `/api/v1/projects/${projectId}/export/zip${queryString ? `?${queryString}` : ""}`;

    const response = await axiosInstance.get(url, {
      responseType: "blob",
    });

    return response.data;
  },
};
