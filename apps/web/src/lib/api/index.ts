export { api } from "./api-client";

export { axiosInstance, extractData } from "./client";

export {
  authApi,
  projectsApi,
  conversationsApi,
  modelsApi,
  usersApi,
  organizationsApi,
  settingsApi,
  healthApi,
} from "./routes";

export type {
  ProjectListParams,
  HealthCheckResponse,
} from "./routes";

export {
  queryKeys,
  useLogin,
  useRegister,
  useGoogleOAuth,
  useLogout,
  useForgotPassword,
  useResetPassword,
  useCurrentUser,
  useUpdateUser,
  useOrganizations,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useUnarchiveProject,
  useConversations,
  useConversation,
  useModels,
  useModel,
  useSettings,
  useHealthCheck,
} from "./queries";

export { socketClient } from "./socket-client";

export { createSSEStream } from "./sse-client";
export type { SSECallbacks } from "./sse-client";
