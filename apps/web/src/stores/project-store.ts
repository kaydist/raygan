import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

enableMapSet();

import type {
  ProjectResponse,
  ProjectDetailResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@staq/shared";

export interface FileEntry {
  path: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  language?: string;
  modified?: boolean;
  children?: FileEntry[];
}

export interface BackendSchema {
  provider: string;
  tables?: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  }>;
  functions?: Array<{
    name: string;
    params: Array<{ name: string; type: string }>;
    returnType: string;
  }>;
}

interface ProjectState {
  projects: ProjectResponse[];
  currentProject: ProjectDetailResponse | null;
  files: Map<string, FileEntry>;
  fileTree: FileEntry[];
  backendSchema: BackendSchema | null;
  connectedBackend: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface ProjectActions {
  setProjects: (
    projects: ProjectResponse[],
    pagination?: Partial<ProjectState["pagination"]>
  ) => void;
  addProject: (project: ProjectResponse) => void;
  updateProject: (uuid: string, updates: Partial<ProjectResponse>) => void;
  removeProject: (uuid: string) => void;
  setCurrentProject: (project: ProjectDetailResponse | null) => void;
  setFiles: (files: Map<string, FileEntry>) => void;
  updateFile: (path: string, content: string) => void;
  createFile: (path: string, content: string, type?: "file" | "folder") => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setFileTree: (tree: FileEntry[]) => void;
  setBackendSchema: (schema: BackendSchema | null) => void;
  setConnectedBackend: (provider: string | null) => void;
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setDeleting: (deleting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  getProject: (uuid: string) => ProjectResponse | undefined;
  getFileByPath: (path: string) => FileEntry | undefined;
}

type ProjectStore = ProjectState & ProjectActions;

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  files: new Map(),
  fileTree: [],
  backendSchema: null,
  connectedBackend: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  },
};

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    ...initialState,

    setProjects: (projects, pagination) =>
      set((state) => {
        state.projects = projects;
        if (pagination) {
          state.pagination = { ...state.pagination, ...pagination };
        }
      }),

    addProject: (project) =>
      set((state) => {
        state.projects.unshift(project);
        state.pagination.total += 1;
      }),

    updateProject: (uuid, updates) =>
      set((state) => {
        const index = state.projects.findIndex((p) => p.uuid === uuid);
        if (index !== -1 && state.projects[index]) {
          Object.assign(state.projects[index]!, updates);
        }
        if (state.currentProject?.uuid === uuid && state.currentProject) {
          Object.assign(state.currentProject, updates);
        }
      }),

    removeProject: (uuid) =>
      set((state) => {
        state.projects = state.projects.filter((p) => p.uuid !== uuid);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        if (state.currentProject?.uuid === uuid) {
          state.currentProject = null;
        }
      }),

    setCurrentProject: (project) =>
      set((state) => {
        state.currentProject = project;
        if (project?.file_tree) {
          state.fileTree = project.file_tree as FileEntry[];
        }
      }),

    setFiles: (files) =>
      set((state) => {
        state.files = files;
      }),

    updateFile: (path, content) =>
      set((state) => {
        const file = state.files.get(path);
        if (file) {
          state.files.set(path, { ...file, content, modified: true });
          console.log("[STAQ-DEBUG] Project files after updateFile:", {
            path,
            totalFiles: state.files.size,
            contentPreview: content?.substring(0, 200) + "...",
          });
        } else {
          console.warn("[STAQ-DEBUG] updateFile: file not found:", path);
        }
      }),

    createFile: (path, content, type = "file") =>
      set((state) => {
        const name = path.split("/").pop() || path;
        const entry: FileEntry = {
          path,
          name,
          type,
          content: type === "file" ? content : undefined,
          modified: type === "file",
        };
        state.files.set(path, entry);
        console.log("[STAQ-DEBUG] Project files after createFile:", {
          path,
          totalFiles: state.files.size,
          allPaths: Array.from(state.files.keys()),
          contentPreview: content?.substring(0, 200) + "...",
        });
      }),

    deleteFile: (path) =>
      set((state) => {
        state.files.delete(path);
        const deleteFromTree = (nodes: FileEntry[]): FileEntry[] => {
          return nodes.filter((node) => {
            if (node.path === path) return false;
            if (node.children) {
              node.children = deleteFromTree(node.children);
            }
            return true;
          });
        };
        state.fileTree = deleteFromTree(state.fileTree);
      }),

    renameFile: (oldPath, newPath) =>
      set((state) => {
        const file = state.files.get(oldPath);
        if (file) {
          const newName = newPath.split("/").pop() || newPath;
          state.files.delete(oldPath);
          state.files.set(newPath, { ...file, path: newPath, name: newName });
        }
      }),

    setFileTree: (tree) =>
      set((state) => {
        state.fileTree = tree;
      }),

    setBackendSchema: (schema) =>
      set((state) => {
        state.backendSchema = schema;
      }),

    setConnectedBackend: (provider) =>
      set((state) => {
        state.connectedBackend = provider;
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setCreating: (creating) =>
      set((state) => {
        state.isCreating = creating;
      }),

    setUpdating: (updating) =>
      set((state) => {
        state.isUpdating = updating;
      }),

    setDeleting: (deleting) =>
      set((state) => {
        state.isDeleting = deleting;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    reset: () => set(initialState),

    getProject: (uuid) => {
      return get().projects.find((p) => p.uuid === uuid);
    },

    getFileByPath: (path) => {
      return get().files.get(path);
    },
  }))
);

export type { CreateProjectRequest, UpdateProjectRequest, ProjectResponse, ProjectDetailResponse };
