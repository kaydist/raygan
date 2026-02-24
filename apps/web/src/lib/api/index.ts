export { api } from "./api-client";

export { axiosInstance, extractData } from "./client";

export {
  authApi,
  projectsApi,
  filesApi,
  conversationsApi,
  modelsApi,
  usersApi,
  organizationsApi,
  settingsApi,
  healthApi,
} from "./routes";

export type {
  ProjectListParams,
  ProjectFileResponse,
  SnackFilesResponse,
  FileTreeNode,
  CreateFileRequest,
  UpdateFileRequest,
  BulkCreateFilesRequest,
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
  useResendVerification,
  useVerifyEmail,
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
  useProjectFiles,
  useSnackFiles,
  useFileTree,
  useFile,
  useCreateFile,
  useUpdateFile,
  useDeleteFile,
  useBulkCreateFiles,
  useConversations,
  useConversation,
  useModels,
  useModel,
  useSettings,
  useHealthCheck,
} from "./queries";

export { socketClient } from "./socket-client";

export { createSSEStream } from "./sse-client";
export type { SSECallbacks, FileUpdate, ASTSnapshot, CodeBlock } from "./sse-client";
