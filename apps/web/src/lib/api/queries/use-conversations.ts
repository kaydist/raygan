import { useQuery } from "@tanstack/react-query";
import type { ConversationResponse, PaginationParams } from "@raygan/shared";

import { conversationsApi } from "../routes/conversations";
import { queryKeys } from "./query-keys";

export function useConversations(projectId: string, params?: PaginationParams) {
  return useQuery<ConversationResponse[]>({
    queryKey: queryKeys.conversations.list(projectId),
    queryFn: () => conversationsApi.list(projectId, params),
    enabled: !!projectId,
  });
}

export function useConversation(conversationId: string) {
  return useQuery<ConversationResponse>({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: () => conversationsApi.get(conversationId),
    enabled: !!conversationId,
  });
}
