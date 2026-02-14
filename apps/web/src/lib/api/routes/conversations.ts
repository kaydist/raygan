import type {
  ConversationResponse,
  ConversationThread,
  PaginationParams,
} from "@staq/shared";

import { axiosInstance, extractData } from "../client";

export interface ConversationListParams extends PaginationParams {
  project_id: number;
}

export const conversationsApi = {
  list: async (params: ConversationListParams): Promise<ConversationResponse[]> => {
    const response = await axiosInstance.get("/api/v1/conversations", { params });
    return extractData(response);
  },

  getThread: async (projectId: number): Promise<ConversationThread> => {
    const response = await axiosInstance.get(`/api/v1/conversations/thread/${projectId}`);
    return extractData(response);
  },
};
