import type {
  ConversationResponse,
  CreateConversationRequest,
  PaginationParams,
} from "@staq/shared";

import { axiosInstance, extractData } from "../client";

export const conversationsApi = {
  list: async (
    projectId: string,
    params?: PaginationParams
  ): Promise<ConversationResponse[]> => {
    const response = await axiosInstance.get(
      `/api/v1/projects/${projectId}/conversations`,
      { params }
    );
    return extractData(response);
  },

  get: async (conversationId: string): Promise<ConversationResponse> => {
    const response = await axiosInstance.get(
      `/api/v1/conversations/${conversationId}`
    );
    return extractData(response);
  },

  create: async (
    projectId: string,
    data: Omit<CreateConversationRequest, "project_id">
  ): Promise<ConversationResponse> => {
    const response = await axiosInstance.post(
      `/api/v1/projects/${projectId}/conversations`,
      data
    );
    return extractData(response);
  },

  update: async (
    conversationId: string,
    data: Partial<{ content: string }>
  ): Promise<ConversationResponse> => {
    const response = await axiosInstance.patch(
      `/api/v1/conversations/${conversationId}`,
      data
    );
    return extractData(response);
  },

  delete: async (conversationId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/conversations/${conversationId}`);
  },
};
