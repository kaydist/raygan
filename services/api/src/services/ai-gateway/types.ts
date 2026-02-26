export type AIProvider = "anthropic" | "openai" | "xai" | "google" | "mistral" | "deepseek";

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface GenerateRequest {
  provider: AIProvider;
  model: string;
  messages: Message[];
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  stop_sequences?: string[];
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

export interface StreamChunk {
  type: "text_delta" | "usage" | "done" | "error";
  content?: string;
  usage?: TokenUsage;
  error?: string;
  finish_reason?: "stop" | "max_tokens" | "error";
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
