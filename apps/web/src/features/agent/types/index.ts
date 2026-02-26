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

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface AgentTask {
  id: string;
  name: string;
  status: TaskStatus;
  files: Array<{ filename: string; language: string }>;
}

export interface TaskListState {
  tasks: AgentTask[];
  completedCount: number;
  totalCount: number;
}

export interface TextSegment {
  type: "text";
  content: string;
}

export interface TaskListSegment {
  type: "task_list";
  tasks: AgentTask[];
}

export type MessageSegment = TextSegment | TaskListSegment;
