// Agent feature types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  astOperations?: unknown[];
  createdAt: Date;
}

export interface StreamingState {
  isGenerating: boolean;
  currentContent: string;
  error: string | null;
}
