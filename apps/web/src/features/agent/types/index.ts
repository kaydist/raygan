export interface ToolCallActivity {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  is_error?: boolean;
  timestamp: Date;
}

export interface AgentPlanState {
  plan_id: string;
  summary: string;
  changes: Array<{
    action: "create" | "modify" | "delete";
    path: string;
    description: string;
  }>;
  status: "pending" | "approved" | "rejected";
}

export interface ImageAttachment {
  id: string;
  file: File;
  preview: string;
  media_type: string;
  data: string;
}

export type MessageStatus = "pending" | "streaming" | "done" | "error" | "cancelled";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: MessageStatus;
  error?: string;
  isStreaming?: boolean;
  astOperations?: unknown[];
  toolCalls?: ToolCallActivity[];
  plan?: AgentPlanState;
  segments?: ContentSegment[];
  images?: ImageAttachment[];
  modelId?: string;
  createdAt: Date;
}

export interface StreamingState {
  isGenerating: boolean;
  currentContent: string;
  error: string | null;
  currentToolCall?: string;
  pendingPlan?: AgentPlanState;
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

export interface ToolCallSegment {
  type: "tool_call";
  toolCallId: string;
}

export interface PlanSegment {
  type: "plan";
}

export interface TaskListSegment {
  type: "task_list";
  tasks: AgentTask[];
}

export type ContentSegment = TextSegment | ToolCallSegment | PlanSegment;

export type MessageSegment = TextSegment | TaskListSegment;
