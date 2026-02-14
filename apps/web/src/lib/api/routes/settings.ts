import type { SettingsResponse } from "@staq/shared";

import { axiosInstance, extractData } from "../client";

export const settingsApi = {
  get: async (): Promise<SettingsResponse> => {
    const response = await axiosInstance.get("/api/v1/settings");
    return extractData(response);
  },
};
