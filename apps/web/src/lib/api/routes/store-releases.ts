import type {
  ProjectSettingResponse,
  UpsertProjectSettingRequest,
  StoreListingResponse,
  UpsertStoreListingRequest,
  StoreReleaseResponse,
  StoreReleaseListResponse,
  CreateStoreReleaseRequest,
  StoreType,
} from "@raygan/shared";

import { axiosInstance, extractData } from "../client";

export const storeReleasesApi = {
  // Project Settings (Credentials)
  upsertSetting: async (
    projectId: string,
    category: string,
    slug: string,
    data: UpsertProjectSettingRequest,
  ): Promise<ProjectSettingResponse> => {
    const response = await axiosInstance.put(
      `/api/v1/projects/${projectId}/settings/${category}/${slug}`,
      data,
    );
    return extractData(response);
  },

  getSetting: async (
    projectId: string,
    category: string,
    slug: string,
  ): Promise<ProjectSettingResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/settings/${category}/${slug}`,
    );
    return extractData(response);
  },

  getSettingsByCategory: async (
    projectId: string,
    category: string,
  ): Promise<ProjectSettingResponse[]> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/settings/${category}`,
    );
    return extractData(response);
  },

  deleteSetting: async (
    projectId: string,
    category: string,
    slug: string,
  ): Promise<{ deleted: boolean }> => {
    const response = await axiosInstance.delete(
      `/api/v1/projects/${projectId}/settings/${category}/${slug}`,
    );
    return extractData(response);
  },

  verifySetting: async (
    projectId: string,
    category: string,
    slug: string,
  ): Promise<{ is_valid: boolean; last_verified_at: string | null }> => {
    const response = await axiosInstance.post(
      `/api/v1/projects/${projectId}/settings/${category}/${slug}/verify`,
    );
    return extractData(response);
  },

  // Store Listings
  upsertListing: async (
    projectId: string,
    store: StoreType,
    data: UpsertStoreListingRequest,
  ): Promise<StoreListingResponse> => {
    const response = await axiosInstance.put(
      `/api/v1/projects/${projectId}/store/listing/${store}`,
      data,
    );
    return extractData(response);
  },

  getListing: async (
    projectId: string,
    store: StoreType,
  ): Promise<StoreListingResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/store/listing/${store}`,
    );
    return extractData(response);
  },

  // Store Releases
  create: async (
    projectId: string,
    data: CreateStoreReleaseRequest,
  ): Promise<StoreReleaseResponse> => {
    const response = await axiosInstance.post(
      `/api/v1/projects/${projectId}/store/releases`,
      data,
    );
    return extractData(response);
  },

  list: async (
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<StoreReleaseListResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/store/releases`,
      { params: { page, limit } },
    );
    const data = response.data;
    return {
      releases: data.data,
      total: data.meta?.total ?? 0,
      page: data.meta?.page ?? page,
      limit: data.meta?.limit ?? limit,
    };
  },

  get: async (
    projectId: string,
    releaseId: string,
  ): Promise<StoreReleaseResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/store/releases/${releaseId}`,
    );
    return extractData(response);
  },

  cancel: async (
    projectId: string,
    releaseId: string,
  ): Promise<StoreReleaseResponse> => {
    const response = await axiosInstance.delete(
      `/api/v1/projects/${projectId}/store/releases/${releaseId}`,
    );
    return extractData(response);
  },
};
