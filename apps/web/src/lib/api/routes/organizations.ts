import type {
  OrganizationResponse,
  OrganizationWithRole,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from "@raygan/shared";

import { axiosInstance, extractData } from "../client";

export const organizationsApi = {
  list: async (): Promise<OrganizationWithRole[]> => {
    const response = await axiosInstance.get("/api/v1/organizations");
    return extractData(response);
  },

  get: async (uuid: string): Promise<OrganizationResponse> => {
    const response = await axiosInstance.get(`/api/v1/organizations/${uuid}`);
    return extractData(response);
  },

  create: async (data: CreateOrganizationRequest): Promise<OrganizationResponse> => {
    const response = await axiosInstance.post("/api/v1/organizations", data);
    return extractData(response);
  },

  update: async (
    uuid: string,
    data: UpdateOrganizationRequest
  ): Promise<OrganizationResponse> => {
    const response = await axiosInstance.patch(`/api/v1/organizations/${uuid}`, data);
    return extractData(response);
  },

  delete: async (uuid: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/organizations/${uuid}`);
  },
};
