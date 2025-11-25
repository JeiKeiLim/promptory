/**
 * LLM IPC Types
 * 
 * Request/response interfaces for IPC communication between
 * renderer and main process for LLM operations
 */

import { LLMProviderConfig, LLMProviderType, LLMResponseMetadata, LLMResponse } from './llm';

// ==================== Provider Management ====================

export interface SaveProviderRequest {
  config: LLMProviderConfig;
  credentials?: string; // Plain text, will be encrypted in main process
}

export interface SaveProviderResponse {
  success: boolean;
  config?: LLMProviderConfig;
  error?: string;
}

export interface SetActiveProviderRequest {
  providerId: string;
}

export interface SetActiveProviderResponse {
  success: boolean;
  error?: string;
}

export interface ValidateProviderRequest {
  providerId: string;
}

export interface ValidateProviderResponse {
  valid: boolean;
  error?: string;
  message?: string; // Success message or error details
}

export interface ListProvidersResponse {
  providers: LLMProviderConfig[];
}

export interface DeleteProviderRequest {
  providerId: string;
}

export interface DeleteProviderResponse {
  success: boolean;
  error?: string;
}

// ==================== LLM Calls ====================

export interface CallLLMRequest {
  promptId: string;
  promptName: string; // For human-readable directory names
  promptContent: string;
  parameters: Record<string, string>;
  model?: string; // Optional model override
}

export interface CallLLMResponse {
  success: boolean;
  requestId?: string; // ID to track the request in queue
  error?: string;
}

export interface CancelLLMRequest {
  requestId: string;
}

export interface CancelLLMResponse {
  success: boolean;
  error?: string;
}

export interface CancelAllLLMResponse {
  success: boolean;
  cancelledCount: number;
  error?: string;
}

// ==================== Response Management ====================

export interface GetHistoryRequest {
  promptId: string;
}

export interface GetHistoryResponse {
  responses: LLMResponseMetadata[];
}

export interface GetResponseRequest {
  responseId: string;
}

export interface GetResponseResponse {
  response?: LLMResponse;
  error?: string;
}

export interface DeleteResponseRequest {
  responseId: string;
}

export interface DeleteResponseResponse {
  success: boolean;
  error?: string;
}

export interface DeleteAllResponsesRequest {
  promptId: string;
}

export interface DeleteAllResponsesResponse {
  success: boolean;
  count: number;
  error?: string;
}

// ==================== Model Management ====================

export interface ListModelsResponse {
  models: ModelInfo[];
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProviderType;
  contextWindow: number;
}

// ==================== Queue Status ====================

export interface QueueStatusResponse {
  queueSize: number;
  currentRequest?: {
    id: string;
    promptId: string;
    startedAt: number;
    elapsedMs: number;
  };
}

// ==================== Events (Main → Renderer) ====================

export interface LLMResponseCompleteEvent {
  requestId: string;
  responseId: string;
  promptId: string;
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface LLMQueueUpdatedEvent {
  queueSize: number;
  addedRequestId?: string;
  removedRequestId?: string;
}

export interface LLMRequestProgressEvent {
  requestId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  elapsedMs?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ==================== Title Generation ====================

export interface TitleStatusEvent {
  responseId: string;
  status: 'pending' | 'completed' | 'failed';
  title?: string;
  generatedAt?: number;
  model?: string;
}
