import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  filesApi,
  type ProjectFileResponse,
  type SnackFilesResponse,
  type FileTreeNode,
  type CreateFileRequest,
  type UpdateFileRequest,
  type BulkCreateFilesRequest,
} from "../routes/files";
import { queryKeys } from "./query-keys";

export function useProjectFiles(projectId: string) {
  return useQuery<ProjectFileResponse[]>({
    queryKey: queryKeys.files.list(projectId),
    queryFn: () => filesApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useSnackFiles(projectId: string) {
  return useQuery<SnackFilesResponse>({
    queryKey: queryKeys.files.snack(projectId),
    queryFn: () => filesApi.listForSnack(projectId),
    enabled: !!projectId,
  });
}

export function useFileTree(projectId: string) {
  return useQuery<FileTreeNode[]>({
    queryKey: queryKeys.files.tree(projectId),
    queryFn: () => filesApi.getTree(projectId),
    enabled: !!projectId,
  });
}

export function useFile(projectId: string, fileId: string) {
  return useQuery<ProjectFileResponse>({
    queryKey: queryKeys.files.detail(projectId, fileId),
    queryFn: () => filesApi.get(projectId, fileId),
    enabled: !!projectId && !!fileId,
  });
}

export function useCreateFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFileRequest) => filesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.snack(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.tree(projectId) });
    },
  });
}

export function useUpdateFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: UpdateFileRequest }) =>
      filesApi.update(projectId, fileId, data),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.detail(projectId, fileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.snack(projectId) });
    },
  });
}

export function useDeleteFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => filesApi.delete(projectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.snack(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.tree(projectId) });
    },
  });
}

export function useBulkCreateFiles(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateFilesRequest) => filesApi.bulkCreate(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.snack(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.tree(projectId) });
    },
  });
}
