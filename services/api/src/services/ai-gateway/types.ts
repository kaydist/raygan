export type AIProvider = "anthropic" | "openai" | "xai" | "google" | "mistral" | "deepseek";

export type MessageRole = "user" | "assistant" | "system";

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ImageBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
}

export type MessageContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ImageBlock;

export interface Message {
  role: MessageRole;
  content: string | MessageContentBlock[];
}

export function getMessageText(content: string | MessageContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface GenerateRequest {
  provider: AIProvider;
  model: string;
  messages: Message[];
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  stop_sequences?: string[];
  tools?: ToolDefinition[];
  metadata?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface GenerateResponse {
  id: string;
  provider: AIProvider;
  model: string;
  content: string;
  finish_reason: "stop" | "max_tokens" | "error";
  usage: TokenUsage;
  generation_time_ms: number;
}

export interface StreamChunkToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamChunk {
  type: "text_delta" | "usage" | "done" | "error" | "tool_use_start" | "tool_use_delta" | "tool_use_end";
  content?: string;
  usage?: TokenUsage;
  error?: string;
  finish_reason?: "stop" | "max_tokens" | "error" | "tool_use";
  tool_use?: StreamChunkToolUse;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface CostEstimate {
  provider: AIProvider;
  model: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost_usd: number;
}

export interface ModelInfo {
  id: string;
  provider: AIProvider;
  name: string;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  supports_vision: boolean;
  supports_tools: boolean;
}

export interface AdapterConfig {
  api_key: string;
  base_url?: string;
  timeout_ms?: number;
  max_retries?: number;
}

export interface AIAdapter {
  readonly provider: AIProvider;

  generate(request: GenerateRequest): Promise<GenerateResponse>;

  stream(request: GenerateRequest): AsyncIterable<StreamChunk>;

  validateConnection(): Promise<boolean>;

  estimateCost(request: GenerateRequest): CostEstimate;

  getAvailableModels(): ModelInfo[];
}
