"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpsertProjectSettingRequest, StoreType } from "@raygan/shared";

import { storeReleasesApi } from "@/lib/api/routes";
import { queryKeys } from "@/lib/api/queries";

const CREDENTIAL_SLUGS: Record<StoreType, string> = {
  google_play: "google_play_service_account",
  apple_app_store: "apple_asc_api_key",
};

export function useStoreCredential(projectId: string, store: StoreType) {
  const slug = CREDENTIAL_SLUGS[store];

  return useQuery({
    queryKey: queryKeys.projectSettings.bySlug(projectId, "store_credentials", slug),
    queryFn: () => storeReleasesApi.getSetting(projectId, "store_credentials", slug),
    enabled: !!projectId,
    retry: false,
  });
}

export function useUpsertStoreCredential(projectId: string, store: StoreType) {
  const queryClient = useQueryClient();
  const slug = CREDENTIAL_SLUGS[store];

  return useMutation({
    mutationFn: (data: UpsertProjectSettingRequest) =>
      storeReleasesApi.upsertSetting(projectId, "store_credentials", slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSettings.bySlug(projectId, "store_credentials", slug),
      });
    },
  });
}

export function useVerifyStoreCredential(projectId: string, store: StoreType) {
  const queryClient = useQueryClient();
  const slug = CREDENTIAL_SLUGS[store];

  return useMutation({
    mutationFn: () => storeReleasesApi.verifySetting(projectId, "store_credentials", slug),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSettings.bySlug(projectId, "store_credentials", slug),
      });
    },
  });
}

export function useDeleteStoreCredential(projectId: string, store: StoreType) {
  const queryClient = useQueryClient();
  const slug = CREDENTIAL_SLUGS[store];

  return useMutation({
    mutationFn: () => storeReleasesApi.deleteSetting(projectId, "store_credentials", slug),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSettings.bySlug(projectId, "store_credentials", slug),
      });
    },
  });
}
