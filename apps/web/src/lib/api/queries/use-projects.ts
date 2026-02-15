import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectResponse,
  ProjectDetailResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@staq/shared";

import { projectsApi, ProjectListParams } from "../routes/projects";
import { queryKeys } from "./query-keys";

export function useProjects(params?: ProjectListParams) {
  return useQuery<ProjectResponse[]>({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectsApi.list(params),
  });
}

export function useProject(
  uuid: string,
  options?: { include_ast?: boolean; include_files?: boolean }
) {
  return useQuery<ProjectDetailResponse>({
    queryKey: queryKeys.projects.detail(uuid),
    queryFn: () => projectsApi.get(uuid, options),
    enabled: !!uuid,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: UpdateProjectRequest }) =>
      projectsApi.update(uuid, data),
    onSuccess: (_, { uuid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(uuid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => projectsApi.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => projectsApi.archive(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(uuid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => projectsApi.unarchive(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(uuid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
