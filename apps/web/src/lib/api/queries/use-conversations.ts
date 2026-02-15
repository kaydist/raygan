import { useQuery } from "@tanstack/react-query";
import type { ConversationResponse, ConversationThread } from "@staq/shared";

import { conversationsApi, ConversationListParams } from "../routes/conversations";
import { queryKeys } from "./query-keys";

export function useConversations(params: ConversationListParams) {
  return useQuery<ConversationResponse[]>({
    queryKey: queryKeys.conversations.list(params.project_id),
    queryFn: () => conversationsApi.list(params),
    enabled: !!params.project_id,
  });
}

export function useConversationThread(projectId: number) {
  return useQuery<ConversationThread>({
    queryKey: queryKeys.conversations.thread(projectId),
    queryFn: () => conversationsApi.getThread(projectId),
    enabled: !!projectId,
  });
}
