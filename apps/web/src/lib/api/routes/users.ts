import type { UserProfileResponse, UpdateUserRequest } from "@staq/shared";

import { axiosInstance, extractData } from "../client";

export const usersApi = {
  me: async (): Promise<UserProfileResponse> => {
    const response = await axiosInstance.get("/api/v1/users/me");
    return extractData(response);
  },

  update: async (data: UpdateUserRequest): Promise<UserProfileResponse> => {
    const response = await axiosInstance.patch("/api/v1/users/me", data);
    return extractData(response);
  },
};
