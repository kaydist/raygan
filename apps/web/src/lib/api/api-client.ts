import { axiosInstance } from "./client";
import {
  authApi,
  projectsApi,
  conversationsApi,
  modelsApi,
  usersApi,
  organizationsApi,
  settingsApi,
  healthApi,
} from "./routes";

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    axiosInstance.get<T>(path, { params }).then((res) => res.data),

  post: <T>(path: string, data?: unknown) =>
    axiosInstance.post<T>(path, data).then((res) => res.data),

  put: <T>(path: string, data?: unknown) =>
    axiosInstance.put<T>(path, data).then((res) => res.data),

  patch: <T>(path: string, data?: unknown) =>
    axiosInstance.patch<T>(path, data).then((res) => res.data),

  delete: <T>(path: string) =>
    axiosInstance.delete<T>(path).then((res) => res.data),

  auth: authApi,
  projects: projectsApi,
  conversations: conversationsApi,
  models: modelsApi,
  users: usersApi,
  organizations: organizationsApi,
  settings: settingsApi,
  health: healthApi,
};
