// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type SegmentType = 'reasoning' | 'text' | 'tool_call' | 'warning';

export interface Segment {
  type: SegmentType;
  /** 用于 reasoning / text / warning */
  content?: string;
  /** 用于 tool_call */
  toolName?: string;
  toolCallId?: string;
  arguments?: string;
  status?: 'calling' | 'completed';
  result?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  segments: Segment[];
  timestamp: number;
  files?: { file_name: string; file_path: string }[];
}

export interface AiChatProps {
  visible: boolean;
  onClose: () => void;
}

export interface AiProviderConfig {
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  enable_reasoning?: boolean;
  max_tokens?: number;
  timeout_seconds?: number;
  temperature?: number;
  max_retries?: number;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}
