import type { UserProfileResponse, UpdateUserRequest } from "@raygan/shared";

import { axiosInstance, extractData } from "../client";

export interface SwitchOrganizationResponse {
  current_organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export const usersApi = {
  me: async (): Promise<UserProfileResponse> => {
    const response = await axiosInstance.get("/api/v1/users/me");
    return extractData(response);
  },

  update: async (data: UpdateUserRequest): Promise<UserProfileResponse> => {
    const response = await axiosInstance.patch("/api/v1/users/me", data);
    return extractData(response);
  },

  switchOrganization: async (organizationId: string): Promise<SwitchOrganizationResponse> => {
    const response = await axiosInstance.post("/api/v1/users/me/switch-organization", {
      organization_id: organizationId,
    });
    return extractData(response);
  },
};
