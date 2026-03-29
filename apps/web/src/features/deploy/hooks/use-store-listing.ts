"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpsertStoreListingRequest, StoreType } from "@raygan/shared";

import { storeReleasesApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";

export function useStoreListing(projectId: string, store: StoreType) {
  return useQuery({
    queryKey: queryKeys.storeListings.byStore(projectId, store),
    queryFn: () => storeReleasesApi.getListing(projectId, store),
    enabled: !!projectId,
    retry: false,
  });
}

export function useUpsertStoreListing(projectId: string, store: StoreType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertStoreListingRequest) =>
      storeReleasesApi.upsertListing(projectId, store, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.storeListings.byStore(projectId, store),
      });
    },
  });
}
