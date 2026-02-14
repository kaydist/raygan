import { axiosInstance, extractData } from "../client";

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export const healthApi = {
  check: async (): Promise<HealthCheckResponse> => {
    const response = await axiosInstance.get("/api/v1/health");
    return extractData(response);
  },
};
