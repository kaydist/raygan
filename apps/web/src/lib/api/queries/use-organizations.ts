import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  OrganizationResponse,
  OrganizationWithRole,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from "@raygan/shared";

import { organizationsApi } from "../routes/organizations";
import { queryKeys } from "./query-keys";

export function useOrganizations() {
  return useQuery<OrganizationWithRole[]>({
    queryKey: queryKeys.organizations.list(),
    queryFn: () => organizationsApi.list(),
  });
}

export function useOrganization(uuid: string) {
  return useQuery<OrganizationResponse>({
    queryKey: queryKeys.organizations.detail(uuid),
    queryFn: () => organizationsApi.get(uuid),
    enabled: !!uuid,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => organizationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: UpdateOrganizationRequest }) =>
      organizationsApi.update(uuid, data),
    onSuccess: (_, { uuid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(uuid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => organizationsApi.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}
