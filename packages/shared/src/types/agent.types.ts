export type AgentToolName =
  | "list_files"
  | "read_file"
  | "search_code"
  | "propose_plan"
  | "create_file"
  | "modify_file"
  | "delete_file"
  | "validate_project";

export type AgentSSEEventType =
  | "text"
  | "code_block"
  | "ast_operation"
  | "ast_snapshot"
  | "file_update"
  | "usage"
  | "done"
  | "error"
  | "tool_call"
  | "tool_result"
  | "plan_proposed"
  | "plan_approved"
  | "plan_rejected"
  | "file_created"
  | "file_modified"
  | "file_deleted";

export interface AgentToolCall {
  id: string;
  name: AgentToolName;
  input: Record<string, unknown>;
}

export interface AgentToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
  side_effects?: AgentSideEffect[];
}

export type AgentSideEffect =
  | { type: "file_created"; path: string; content: string }
  | { type: "file_modified"; path: string; content: string }
  | { type: "file_deleted"; path: string }
  | { type: "plan_proposed"; plan: AgentPlan };

export interface ProposedChange {
  action: "create" | "modify" | "delete";
  path: string;
  description: string;
}

export interface AgentPlan {
  plan_id: string;
  summary: string;
  changes: ProposedChange[];
}
