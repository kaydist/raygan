import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProfileResponse, UpdateUserRequest } from "@raygan/shared";

import { usersApi } from "../routes/users";
import { queryKeys } from "./query-keys";

export function useCurrentUser() {
  return useQuery<UserProfileResponse>({
    queryKey: queryKeys.users.me(),
    queryFn: () => usersApi.me(),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) => usersApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}
