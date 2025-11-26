/**
 * LLM Integration Types
 * 
 * Defines all TypeScript interfaces and types for LLM provider integration
 */

/**
 * Supported LLM providers
 */
export type LLMProviderType = 'ollama' | 'openai' | 'azure_openai' | 'gemini';

/**
 * Request/response status
 */
export type LLMRequestStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

/**
 * Title generation status
 */
export type TitleGenerationStatus = 'pending' | 'completed' | 'failed';

/**
 * Provider configuration
 */
export interface LLMProviderConfig {
  id: string;
  providerType: LLMProviderType;
  displayName: string;
  
  // Connection
  baseUrl?: string;  // For Ollama and Azure
  modelName?: string;  // Default model
  
  // Security (encrypted in DB, decrypted in main process only)
  encryptedCredentials?: Buffer;
  
  // Configuration
  timeoutSeconds: number;  // Default: 120
  isActive: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastValidatedAt?: number;
}

/**
 * LLM request (in queue)
 */
export interface LLMRequest {
  id: string;
  promptId: string;
  promptName: string;  // For human-readable directory names
  promptContent: string;  // After parameter substitution
  parameters: Record<string, string>;
  provider: LLMProviderType;
  model: string;
  status: LLMRequestStatus;
  createdAt: number;
}

/**
 * LLM response metadata
 */
export interface LLMResponseMetadata {
  id: string;
  promptId: string;
  provider: LLMProviderType;
  model: string;
  parameters: Record<string, string>;
  createdAt: number;
  responseTimeMs?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  costEstimate?: number;  // USD
  status: LLMRequestStatus;
  filePath: string;  // Relative path
  errorCode?: string;
  errorMessage?: string;
  
  // Title generation (optional for backward compatibility)
  generatedTitle?: string;
  titleGenerationStatus?: TitleGenerationStatus;
  titleGeneratedAt?: number;
  titleModel?: string;
}

/**
 * Complete LLM response (with content)
 */
export interface LLMResponse extends LLMResponseMetadata {
  content: string;  // Loaded from .md file
}

/**
 * Token usage information
 */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

/**
 * Error types for LLM operations
 */
export type LLMErrorCode =
  | 'VALIDATION_ERROR'
  | 'CONNECTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'MODEL_NOT_FOUND'
  | 'INSUFFICIENT_QUOTA'
  | 'UNKNOWN_ERROR';

/**
 * User-friendly error with recovery guidance
 */
export interface LLMError {
  code: LLMErrorCode;
  message: string;
  provider: LLMProviderType;
  recoveryAction?: string;
}

/**
 * Model definition
 */
export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: LLMProviderType;
  contextWindow: number;
  costPerToken?: {
    prompt: number;
    completion: number;
  };
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
  };
}

/**
 * Generation options
 */
export interface GenerateOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  signal?: AbortSignal;
}

/**
 * Generation result
 */
export interface GenerateResult {
  content: string;
  tokenUsage?: TokenUsage;
  model: string;
  finishReason?: string;
}

/**
 * Title generation configuration
 */
export interface TitleGenerationConfig {
  enabled: boolean;
  selectedModel: string;
  selectedProvider: LLMProviderType;
  timeoutSeconds: number;
}

/**
 * LLM call settings for unified configuration
 */
export interface LLMCallSettings {
  model: string;
  timeout: number; // 1-999 seconds
}

/**
 * Title generation settings for unified configuration
 */
export interface TitleGenerationSettings {
  enabled: boolean;
  model: string;
  timeout: number; // 1-999 seconds
}

/**
 * Unified LLM configuration combining LLM calls and title generation
 */
export interface UnifiedLLMConfig {
  provider: LLMProviderType;
  llmCall: LLMCallSettings;
  titleGeneration: TitleGenerationSettings;
}

/**
 * Validation result for unified LLM configuration
 */
export interface UnifiedLLMConfigValidation {
  valid: boolean;
  errors: string[];
}

