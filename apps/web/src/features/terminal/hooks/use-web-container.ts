"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer, type WebContainerProcess, type FileSystemTree } from "@webcontainer/api";

import { useProjectStore } from "@/stores";

export interface WebContainerState {
  status: "idle" | "booting" | "ready" | "error";
  error: string | null;
  url: string | null;
}

export interface UseWebContainerReturn {
  state: WebContainerState;
  instance: WebContainer | null;
  boot: () => Promise<void>;
  spawn: (command: string, args?: string[]) => Promise<WebContainerProcess | null>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  mkdir: (path: string) => Promise<void>;
  rm: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  mountFiles: () => Promise<void>;
  installDependencies: () => Promise<WebContainerProcess | null>;
  startDevServer: () => Promise<WebContainerProcess | null>;
}

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebContainer(): UseWebContainerReturn {
  const [state, setState] = useState<WebContainerState>({
    status: "idle",
    error: null,
    url: null,
  });

  const instanceRef = useRef<WebContainer | null>(null);
  const files = useProjectStore((s) => s.files);

  const boot = useCallback(async () => {
    if (webContainerInstance) {
      instanceRef.current = webContainerInstance;
      setState({ status: "ready", error: null, url: state.url });
      return;
    }

    if (bootPromise) {
      try {
        const instance = await bootPromise;
        instanceRef.current = instance;
        setState({ status: "ready", error: null, url: null });
      } catch (err) {
        setState({
          status: "error",
          error: err instanceof Error ? err.message : "Failed to boot WebContainer",
          url: null,
        });
      }
      return;
    }

    setState({ status: "booting", error: null, url: null });

    try {
      bootPromise = WebContainer.boot();
      const instance = await bootPromise;
      webContainerInstance = instance;
      instanceRef.current = instance;

      instance.on("server-ready", (_port, url) => {
        setState((prev) => ({ ...prev, url }));
      });

      instance.on("error", (error) => {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error.message,
        }));
      });

      setState({ status: "ready", error: null, url: null });
    } catch (err) {
      bootPromise = null;
      setState({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to boot WebContainer",
        url: null,
      });
    }
  }, [state.url]);

  const spawn = useCallback(
    async (command: string, args: string[] = []): Promise<WebContainerProcess | null> => {
      if (!instanceRef.current) {
        console.error("WebContainer not ready");
        return null;
      }

      try {
        return await instanceRef.current.spawn(command, args);
      } catch (err) {
        console.error("Failed to spawn process:", err);
        return null;
      }
    },
    []
  );

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    if (!instanceRef.current) {
      throw new Error("WebContainer not ready");
    }
    await instanceRef.current.fs.writeFile(path, content);
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    if (!instanceRef.current) {
      throw new Error("WebContainer not ready");
    }
    return await instanceRef.current.fs.readFile(path, "utf-8");
  }, []);

  const mkdir = useCallback(async (path: string): Promise<void> => {
    if (!instanceRef.current) {
      throw new Error("WebContainer not ready");
    }
    await instanceRef.current.fs.mkdir(path, { recursive: true });
  }, []);

  const rm = useCallback(
    async (path: string, options?: { recursive?: boolean }): Promise<void> => {
      if (!instanceRef.current) {
        throw new Error("WebContainer not ready");
      }
      await instanceRef.current.fs.rm(path, options);
    },
    []
  );

  const mountFiles = useCallback(async (): Promise<void> => {
    if (!instanceRef.current) {
      throw new Error("WebContainer not ready");
    }

    const fileTree: FileSystemTree = {};

    const createPackageJson = () => ({
      name: "expo-app",
      version: "1.0.0",
      main: "node_modules/expo/AppEntry.js",
      scripts: {
        start: "expo start",
        android: "expo start --android",
        ios: "expo start --ios",
        web: "expo start --web",
      },
      dependencies: {
        expo: "~51.0.0",
        "expo-status-bar": "~1.12.1",
        react: "18.2.0",
        "react-native": "0.74.5",
        "expo-router": "~3.5.0",
        "react-native-safe-area-context": "4.10.1",
        "react-native-screens": "3.31.1",
      },
      devDependencies: {
        "@babel/core": "^7.24.0",
        "@types/react": "~18.2.0",
        typescript: "^5.3.0",
      },
    });

    fileTree["package.json"] = {
      file: {
        contents: JSON.stringify(createPackageJson(), null, 2),
      },
    };

    fileTree["app.json"] = {
      file: {
        contents: JSON.stringify(
          {
            expo: {
              name: "MyApp",
              slug: "my-app",
              version: "1.0.0",
              orientation: "portrait",
              scheme: "myapp",
              web: { bundler: "metro" },
            },
          },
          null,
          2
        ),
      },
    };

    fileTree["tsconfig.json"] = {
      file: {
        contents: JSON.stringify(
          {
            extends: "expo/tsconfig.base",
            compilerOptions: {
              strict: true,
              paths: { "@/*": ["./*"] },
            },
            include: ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
          },
          null,
          2
        ),
      },
    };

    files.forEach((file, path) => {
      if (file.type !== "file" || !file.content) return;

      const parts = path.split("/");
      let current = fileTree;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        const dir = current[part];
        if ("directory" in dir) {
          current = dir.directory;
        }
      }

      const fileName = parts[parts.length - 1]!;
      current[fileName] = {
        file: { contents: file.content },
      };
    });

    await instanceRef.current.mount(fileTree);
  }, [files]);

  const installDependencies = useCallback(async (): Promise<WebContainerProcess | null> => {
    if (!instanceRef.current) return null;
    return spawn("npm", ["install"]);
  }, [spawn]);

  const startDevServer = useCallback(async (): Promise<WebContainerProcess | null> => {
    if (!instanceRef.current) return null;
    return spawn("npm", ["run", "start"]);
  }, [spawn]);

  useEffect(() => {
    return () => {
      // WebContainer persists across component mounts for performance
    };
  }, []);

  return {
    state,
    instance: instanceRef.current,
    boot,
    spawn,
    writeFile,
    readFile,
    mkdir,
    rm,
    mountFiles,
    installDependencies,
    startDevServer,
  };
}

export function getWebContainerInstance(): WebContainer | null {
  return webContainerInstance;
}
