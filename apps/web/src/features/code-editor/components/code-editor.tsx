"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Editor, { OnMount, BeforeMount, loader, Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { useProjectStore, useUIStore } from "@/stores";
import { useDebounce } from "@/hooks";
import { filesApi } from "@/lib/api";
import {
  loadTypeDefinitions,
  registerDefinitionProvider,
  registerSymbolDefinitionProvider,
} from "../utils";

interface CodeEditorProps {
  filePath: string;
  className?: string;
  readOnly?: boolean;
}

let monacoInstance: Monaco | null = null;
let modelsInitialized = false;
let providersRegistered = false;
let monacoInitialized = false;

async function initializeMonaco() {
  if (monacoInitialized) return;

  const monaco = await loader.init();

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: "React.createElement",
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    noEmit: true,
    lib: ["esnext", "dom"],
  });

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: "React.createElement",
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  });

  monacoInitialized = true;
  console.log("[CodeEditor] Monaco initialized with TypeScript support");
  console.log("[CodeEditor] Available languages:", monaco.languages.getLanguages().map((l: { id: string }) => l.id));
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
  scss: "scss",
  less: "less",
  yaml: "yaml",
  yml: "yaml",
};

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_MAP[ext] ?? "plaintext";
}


export function CodeEditor({
  filePath,
  className,
  readOnly = false,
}: CodeEditorProps) {
  const file = useProjectStore((s) => s.files.get(filePath));
  const updateFile = useProjectStore((s) => s.updateFile);
  const activeFileTab = useUIStore((s) => s.activeFileTab);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isMonacoReady, setIsMonacoReady] = useState(monacoInitialized);

  useEffect(() => {
    if (!isMonacoReady) {
      initializeMonaco().then(() => setIsMonacoReady(true));
    }
  }, [isMonacoReady]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && !readOnly) {
        updateFile(filePath, value);
      }
    },
    [filePath, updateFile, readOnly],
  );

  const handleSave = useCallback(
    async (path: string, content: string) => {
      if (readOnly) return;

      const state = useProjectStore.getState();
      const currentProject = state.currentProject;
      const file = state.files.get(path);
      if (!currentProject?.id) return;

      useProjectStore.setState((s) => {
        const f = s.files.get(path);
        if (f) {
          s.files.set(path, { ...f, content, modified: false });
        }
      });

      try {
        let fileUuid = file?.uuid;
        if (!fileUuid) {
          const fileData = await filesApi.getByPath(
            currentProject.id.toString(),
            path,
          );
          fileUuid = fileData.uuid;
          useProjectStore.setState((s) => {
            const f = s.files.get(path);
            if (f) {
              s.files.set(path, { ...f, uuid: fileUuid });
            }
          });
        }

        await filesApi.update(currentProject.id.toString(), fileUuid, {
          content,
          language: file?.language,
        });
      } catch (error) {
        console.error("Failed to save file to backend:", error);
        useProjectStore.setState((s) => {
          const f = s.files.get(path);
          if (f) {
            s.files.set(path, { ...f, modified: true });
          }
        });
      }
    },
    [readOnly],
  );

  const debouncedSave = useDebounce(handleSave, 300);

  useEffect(() => {
    if (readOnly || !file?.modified) return;
    debouncedSave(filePath, file.content ?? "");
  }, [file?.content, file?.modified, filePath, debouncedSave, readOnly]);

  const syncProjectFilesToMonaco = useCallback((monaco: Monaco) => {
    const files = useProjectStore.getState().files;

    files.forEach((file, path) => {
      if (file.type !== "file" || !file.content) return;

      const uri = monaco.Uri.parse(`file:///${path}`);
      const existingModel = monaco.editor.getModel(uri);

      if (!existingModel) {
        const language = getLanguageFromPath(path);
        monaco.editor.createModel(file.content, language, uri);
      }
    });
  }, []);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme("vs-dark-custom", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "569CD6" },
        { token: "keyword.control", foreground: "C586C0" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "regexp", foreground: "D16969" },
        { token: "type", foreground: "4EC9B0" },
        { token: "class", foreground: "4EC9B0" },
        { token: "function", foreground: "DCDCAA" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "variable.predefined", foreground: "4FC1FF" },
        { token: "constant", foreground: "4FC1FF" },
        { token: "parameter", foreground: "9CDCFE" },
        { token: "property", foreground: "9CDCFE" },
        { token: "punctuation", foreground: "D4D4D4" },
        { token: "operator", foreground: "D4D4D4" },
        { token: "tag", foreground: "569CD6" },
        { token: "attribute.name", foreground: "9CDCFE" },
        { token: "attribute.value", foreground: "CE9178" },
        { token: "delimiter", foreground: "D4D4D4" },
        { token: "delimiter.html", foreground: "808080" },
        { token: "delimiter.xml", foreground: "808080" },
        { token: "", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editor.foreground": "#D4D4D4",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#C6C6C6",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
        "editorIndentGuide.background1": "#404040",
        "editorIndentGuide.activeBackground1": "#707070",
      },
    });

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: "React.createElement",
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      noEmit: true,
      lib: ["esnext", "dom"],
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: "React.createElement",
      allowJs: true,
      checkJs: false,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    });
  }, []);

  const handleMount: OnMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco) => {
      editorRef.current = editor;
      monacoInstance = monaco;

      const model = editor.getModel();
      const expectedLanguage = getLanguageFromPath(filePath);
      console.log("[CodeEditor] Monaco mounted");
      console.log("[CodeEditor] filePath:", filePath);
      console.log("[CodeEditor] Expected language:", expectedLanguage);
      console.log("[CodeEditor] Model language:", model?.getLanguageId());
      const storeFile = useProjectStore.getState().files.get(filePath);
      console.log("[CodeEditor] file.language from store:", storeFile?.language);

      if (model && model.getLanguageId() !== expectedLanguage) {
        console.log("[CodeEditor] Language mismatch! Forcing language to:", expectedLanguage);
        monaco.editor.setModelLanguage(model, expectedLanguage);
      }

      editor.updateOptions({
        minimap: { enabled: false, scale: 1, showSlider: "mouseover" },
        fontSize: 13,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
        fontLigatures: true,
        lineHeight: 20,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        stickyScroll: { enabled: true },
        renderWhitespace: "selection",
        folding: true,
        foldingHighlight: true,
        showFoldingControls: "mouseover",
        gotoLocation: {
          multiple: "goto",
          multipleDefinitions: "goto",
          multipleTypeDefinitions: "goto",
          multipleDeclarations: "goto",
          multipleImplementations: "goto",
          multipleReferences: "goto",
        },
      });

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.languages.typescript.JsxEmit.React,
        jsxFactory: "React.createElement",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        noEmit: true,
        lib: ["esnext", "dom"],
        baseUrl: ".",
        paths: {
          "@/*": ["./*"],
        },
      });

      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.languages.typescript.JsxEmit.React,
        jsxFactory: "React.createElement",
        allowJs: true,
        checkJs: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      });

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });

      loadTypeDefinitions(monaco);

      if (!providersRegistered) {
        registerDefinitionProvider(
          monaco,
          () => Array.from(useProjectStore.getState().files.keys()),
          (filePath) => {
            useUIStore.getState().openFileTab(filePath);
          },
        );

        registerSymbolDefinitionProvider(monaco, () =>
          useProjectStore.getState().files,
        );

        providersRegistered = true;
      }

      if (!modelsInitialized) {
        syncProjectFilesToMonaco(monaco);
        modelsInitialized = true;
      }

      const editorService = (
        editor as unknown as { _codeEditorService: unknown }
      )._codeEditorService;
      const openEditorBase = (editorService as { openCodeEditor?: Function })
        .openCodeEditor;

      if (editorService && typeof openEditorBase === "function") {
        (editorService as { openCodeEditor: Function }).openCodeEditor = async (
          input: { resource: { path: string } },
          source: unknown,
        ) => {
          const path = input.resource.path.replace(/^\//, "");
          const files = useProjectStore.getState().files;

          if (files.has(path)) {
            useUIStore.getState().openFileTab(path);
            return null;
          }

          return openEditorBase.call(editorService, input, source);
        };
      }

      editor.onMouseDown((e) => {
        if (e.event.ctrlKey || e.event.metaKey) {
          const position = e.target.position;
          if (position) {
            editor.setPosition(position);
            editor.trigger("keyboard", "editor.action.revealDefinition", null);
          }
        }
      });
    },
    [syncProjectFilesToMonaco, filePath],
  );

  useEffect(() => {
    if (activeFileTab === filePath && editorRef.current) {
      editorRef.current.focus();
    }
  }, [activeFileTab, filePath]);

  useEffect(() => {
    if (monacoInstance) {
      syncProjectFilesToMonaco(monacoInstance);
    }
  }, [file, syncProjectFilesToMonaco]);

  useEffect(() => {
    const unsubscribe = useProjectStore.subscribe((state, prevState) => {
      if (state.files !== prevState.files && monacoInstance) {
        state.files.forEach((file, path) => {
          if (file.type !== "file" || !file.content) return;

          const uri = monacoInstance!.Uri.parse(`file:///${path}`);
          const existingModel = monacoInstance!.editor.getModel(uri);

          if (!existingModel) {
            const language = getLanguageFromPath(path);
            monacoInstance!.editor.createModel(file.content, language, uri);
          } else if (existingModel.getValue() !== file.content) {
            existingModel.setValue(file.content);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isMonacoReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Initializing editor...</span>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">File not found</p>
          <p className="text-xs text-muted-foreground/70">{filePath}</p>
        </div>
      </div>
    );
  }

  const detectedLanguage = getLanguageFromPath(filePath);
  console.log("[CodeEditor] filePath:", filePath, "| language:", detectedLanguage);

  return (
    <div className={className}>
      <Editor
        height="100%"
        defaultLanguage={detectedLanguage}
        language={detectedLanguage}
        value={file.content ?? ""}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        theme="vs-dark-custom"
        options={{
          readOnly,
          wordWrap: "off",
          tabSize: 2,
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          "semanticHighlighting.enabled": true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: "on",
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          parameterHints: {
            enabled: true,
            cycle: true,
          },
          suggest: {
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnumMembers: true,
            showEnums: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: true,
            insertMode: "replace",
            filterGraceful: true,
            localityBonus: true,
            shareSuggestSelections: true,
            showIcons: true,
            preview: true,
            previewMode: "subwordSmart",
          },
          inlineSuggest: {
            enabled: true,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">
                Loading editor...
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
}
