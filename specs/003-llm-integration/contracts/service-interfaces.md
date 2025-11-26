# Service Interfaces: LLM Integration

**Feature**: 003-llm-integration  
**Date**: 2025-11-19  
**Purpose**: Define service layer interfaces for business logic

---

## LLMService Interface

Main service coordinating LLM operations, queue management, and provider communication.

**Location**: `src/main/services/LLMService.ts`

```typescript
interface ILLMService {
  /**
   * Initialize the service (load providers, setup queue, cleanup orphaned entries)
   */
  initialize(): Promise<void>;
  
  /**
   * Provider Management
   */
  listProviders(): Promise<LLMProviderConfig[]>;
  saveProvider(config: Partial<LLMProviderConfig> & { credentials?: string }): Promise<LLMProviderConfig>;
  setActiveProvider(providerId: string): Promise<LLMProviderConfig>;
  deleteProvider(providerId: string): Promise<void>;
  getActiveProvider(): LLMProviderConfig | null;
  
  /**
   * LLM Call Management
   */
  enqueueRequest(request: LLMRequest): Promise<{ requestId: string; queuePosition: number }>;
  cancelRequest(requestId: string): Promise<void>;
  cancelAllRequests(): Promise<number>;  // Returns cancelled count
  getQueueStatus(): { length: number; currentRequest: LLMRequest | null };
  
  /**
   * Response Management
   */
  getResponseHistory(promptId: string, limit?: number, offset?: number): Promise<{
    responses: LLMResponseMetadata[];
    totalCount: number;
  }>;
  getResponse(responseId: string): Promise<LLMResponse>;
  deleteResponse(responseId: string): Promise<void>;
  deleteAllResponses(promptId: string): Promise<number>;  // Returns deleted count
  
  /**
   * Cleanup and Maintenance
   */
  cleanupOrphanedEntries(): Promise<number>;  // Returns cleaned count
  enforcePromptLimit(promptId: string, limit: number): Promise<number>;  // Returns deleted count
}
```

---

## Provider Client Interfaces

### Base Provider Interface

All provider-specific clients implement this interface.

```typescript
interface ILLMProvider {
  /**
   * Provider identification
   */
  readonly type: LLMProviderType;
  readonly name: string;
  
  /**
   * Validate connection and credentials
   * @throws LLMError if validation fails
   */
  validate(): Promise<void>;
  
  /**
   * Generate completion from prompt
   * @param prompt - The input text
   * @param options - Generation options (model, temperature, etc.)
   * @param signal - AbortSignal for cancellation
   * @returns Generated text and metadata
   * @throws LLMError on failure
   */
  generate(
    prompt: string,
    options: GenerateOptions,
    signal?: AbortSignal
  ): Promise<GenerateResult>;
  
  /**
   * List available models for this provider
   * @returns Array of model definitions
   */
  listModels(): Promise<ModelDefinition[]>;
}

interface GenerateOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

interface GenerateResult {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
  finishReason?: string;
}

interface ModelDefinition {
  id: string;
  displayName: string;
  contextWindow: number;
  capabilities: {
    chat: boolean;
    completion: boolean;
    streaming: boolean;
  };
}
```

---

### Ollama Provider

```typescript
class OllamaProvider implements ILLMProvider {
  readonly type = 'ollama';
  readonly name = 'Ollama';
  
  constructor(
    private baseUrl: string = 'http://localhost:11434',
    private timeoutMs: number = 120000
  ) {}
  
  async validate(): Promise<void> {
    // Check if Ollama server is reachable
    // Throws CONNECTION_ERROR if unreachable
  }
  
  async generate(
    prompt: string,
    options: GenerateOptions,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    // POST to /api/generate
    // Handle timeouts, errors, cancellation
    // Return parsed response
  }
  
  async listModels(): Promise<ModelDefinition[]> {
    // GET /api/tags
    // Parse model list
    // Return formatted model definitions
  }
}
```

---

### OpenAI Provider

```typescript
class OpenAIProvider implements ILLMProvider {
  readonly type = 'openai';
  readonly name = 'OpenAI';
  
  constructor(
    private apiKey: string,
    private timeoutMs: number = 120000,
    private baseUrl?: string  // For Azure OpenAI
  ) {}
  
  async validate(): Promise<void> {
    // Test API key with lightweight call
    // Throws AUTH_ERROR if invalid
  }
  
  async generate(
    prompt: string,
    options: GenerateOptions,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    // Use OpenAI SDK
    // Handle rate limits, quotas, errors
    // Return parsed response with token usage
  }
  
  async listModels(): Promise<ModelDefinition[]> {
    // Return hardcoded list of common models
    // (OpenAI models endpoint requires separate call)
    return [
      { id: 'gpt-4', displayName: 'GPT-4', ... },
      { id: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', ... },
    ];
  }
}
```

---

### Gemini Provider

```typescript
class GeminiProvider implements ILLMProvider {
  readonly type = 'gemini';
  readonly name = 'Google Gemini';
  
  constructor(
    private apiKey: string,
    private timeoutMs: number = 120000
  ) {}
  
  async validate(): Promise<void> {
    // Test API key
    // Throws AUTH_ERROR if invalid
  }
  
  async generate(
    prompt: string,
    options: GenerateOptions,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    // Use @google/generative-ai SDK
    // Handle safety blocks, errors
    // Wrap with timeout using Promise.race
    // Return parsed response
  }
  
  async listModels(): Promise<ModelDefinition[]> {
    // Return hardcoded list of Gemini models
    return [
      { id: 'gemini-pro', displayName: 'Gemini Pro', ... },
      { id: 'gemini-pro-vision', displayName: 'Gemini Pro Vision', ... },
    ];
  }
}
```

---

## Storage Service Interface

### LLMStorageService

Handles SQLite and file system operations.

```typescript
interface ILLMStorageService {
  /**
   * Provider Configuration Storage
   */
  saveProviderConfig(config: LLMProviderConfig): Promise<void>;
  getProviderConfig(providerId: string): Promise<LLMProviderConfig | null>;
  getAllProviderConfigs(): Promise<LLMProviderConfig[]>;
  deleteProviderConfig(providerId: string): Promise<void>;
  setActiveProvider(providerId: string): Promise<void>;
  
  /**
   * Response Metadata Storage (SQLite)
   */
  saveResponseMetadata(metadata: LLMResponseMetadata): Promise<void>;
  getResponseMetadata(responseId: string): Promise<LLMResponseMetadata | null>;
  getResponsesByPrompt(promptId: string, limit?: number, offset?: number): Promise<{
    responses: LLMResponseMetadata[];
    totalCount: number;
  }>;
  deleteResponseMetadata(responseId: string): Promise<void>;
  deleteAllResponsesForPrompt(promptId: string): Promise<number>;
  
  /**
   * Response Content Storage (File System)
   */
  saveResponseContent(responseId: string, promptId: string, content: string, metadata: LLMResponseMetadata): Promise<string>;  // Returns file path
  readResponseContent(filePath: string): Promise<string>;
  deleteResponseFile(filePath: string): Promise<void>;
  checkFileExists(filePath: string): Promise<boolean>;
  
  /**
   * Maintenance
   */
  cleanupOrphanedMetadata(): Promise<number>;  // Returns cleaned count
  enforcePromptResponseLimit(promptId: string, limit: number): Promise<number>;  // Returns deleted count
}
```

---

## Request Queue Interface

### LLMRequestQueue

Manages sequential processing of LLM requests.

```typescript
interface ILLMRequestQueue {
  /**
   * Add request to queue
   * @returns Promise that resolves when request completes
   */
  enqueue(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Cancel specific request
   * @param requestId - ID of request to cancel
   * @returns true if cancelled, false if not found or already completed
   */
  cancel(requestId: string): boolean;
  
  /**
   * Cancel all pending and in-progress requests
   * @returns Count of cancelled requests
   */
  cancelAll(): number;
  
  /**
   * Get current queue status
   */
  getStatus(): {
    length: number;
    currentRequest: LLMRequest | null;
    pendingRequests: LLMRequest[];
  };
  
  /**
   * Event emitters
   */
  on(event: 'queue:updated', listener: (status: QueueStatus) => void): void;
  on(event: 'request:started', listener: (request: LLMRequest) => void): void;
  on(event: 'request:completed', listener: (response: LLMResponse) => void): void;
  on(event: 'request:failed', listener: (error: LLMError) => void): void;
  on(event: 'request:cancelled', listener: (requestId: string) => void): void;
}
```

---

## Credential Service Interface

### CredentialService

Handles encryption/decryption of API credentials.

```typescript
interface ICredentialService {
  /**
   * Check if encryption is available
   */
  isAvailable(): boolean;
  
  /**
   * Encrypt a credential string
   * @param plainText - API key or token
   * @returns Encrypted Buffer
   * @throws Error if encryption unavailable
   */
  encrypt(plainText: string): Buffer;
  
  /**
   * Decrypt a credential Buffer
   * @param encryptedBuffer - Encrypted credential
   * @returns Decrypted API key or token
   * @throws Error if decryption fails
   */
  decrypt(encryptedBuffer: Buffer): string;
}

class CredentialService implements ICredentialService {
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
  
  encrypt(plainText: string): Buffer {
    if (!this.isAvailable()) {
      throw new Error('Encryption unavailable');
    }
    return safeStorage.encryptString(plainText);
  }
  
  decrypt(encryptedBuffer: Buffer): string {
    return safeStorage.decryptString(encryptedBuffer);
  }
}
```

---

## Parameter Substitution Interface

### ParameterService

Handles parameter extraction and substitution in prompts.

```typescript
interface IParameterService {
  /**
   * Extract parameter placeholders from prompt text
   * @param promptText - Raw prompt with {{param}} placeholders
   * @returns Array of parameter names
   */
  extractParameters(promptText: string): string[];
  
  /**
   * Substitute parameters in prompt text
   * @param promptText - Raw prompt with {{param}} placeholders
   * @param values - Map of parameter name → value
   * @returns Prompt with all parameters substituted
   * @throws ValidationError if required parameters missing
   */
  substituteParameters(promptText: string, values: Record<string, string>): string;
  
  /**
   * Validate that all required parameters have values
   * @throws ValidationError with list of missing parameters
   */
  validateParameters(parameters: string[], values: Record<string, string>): void;
}
```

---

## Token Counter Interface

### TokenCounterService

Estimates token count for prompt validation.

```typescript
interface ITokenCounterService {
  /**
   * Estimate token count for text
   * @param text - Input text to count
   * @param model - Model name (different models have different tokenizers)
   * @returns Estimated token count
   */
  estimateTokens(text: string, model: string): number;
  
  /**
   * Check if text exceeds model's token limit
   * @param text - Input text
   * @param model - Model name
   * @returns true if within limit, false if exceeds
   */
  isWithinLimit(text: string, model: string): boolean;
  
  /**
   * Get token limit for model
   * @param model - Model name
   * @returns Maximum token count (including prompt + response)
   */
  getLimit(model: string): number;
}
```

---

## Error Handling

### LLMError Class

Custom error class for LLM operations.

```typescript
class LLMError extends Error {
  constructor(
    public code: LLMErrorCode,
    public message: string,
    public provider: LLMProviderType,
    public recoveryAction?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      provider: this.provider,
      recoveryAction: this.recoveryAction,
    };
  }
  
  static fromProviderError(error: any, provider: LLMProviderType): LLMError {
    // Map provider-specific errors to LLMError
    if (error.code === 'ECONNREFUSED') {
      return new LLMError(
        'CONNECTION_ERROR',
        provider === 'ollama' ? 'Ollama server not running' : 'Cannot connect to API',
        provider,
        provider === 'ollama' ? 'Start Ollama server' : 'Check network connection'
      );
    }
    // ... more mappings
  }
}
```

---

## Service Composition

### Main Service Setup

```typescript
// Main process initialization
class ServiceContainer {
  credential: CredentialService;
  storage: LLMStorageService;
  parameter: ParameterService;
  tokenCounter: TokenCounterService;
  queue: LLMRequestQueue;
  llm: LLMService;
  
  async initialize(db: Database) {
    this.credential = new CredentialService();
    this.storage = new LLMStorageService(db);
    this.parameter = new ParameterService();
    this.tokenCounter = new TokenCounterService();
    this.queue = new LLMRequestQueue();
    
    this.llm = new LLMService({
      storage: this.storage,
      credential: this.credential,
      parameter: this.parameter,
      tokenCounter: this.tokenCounter,
      queue: this.queue,
    });
    
    await this.llm.initialize();
  }
}
```

---

## Testing Interfaces

### Mock Providers

For testing, implement mock providers that don't make real API calls.

```typescript
class MockOllamaProvider implements ILLMProvider {
  readonly type = 'ollama';
  readonly name = 'Mock Ollama';
  
  async validate(): Promise<void> {
    // Always succeed
  }
  
  async generate(
    prompt: string,
    options: GenerateOptions,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    // Return fake response after short delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      content: `Mock response to: ${prompt.slice(0, 50)}...`,
      tokenUsage: { prompt: 10, completion: 20, total: 30 },
      model: options.model,
    };
  }
  
  async listModels(): Promise<ModelDefinition[]> {
    return [
      { id: 'mock-model', displayName: 'Mock Model', contextWindow: 4096, capabilities: { chat: true, completion: true, streaming: false } },
    ];
  }
}
```

---

## Summary

| Service | Responsibility | Dependencies |
|---------|----------------|--------------|
| LLMService | Orchestration, queue, providers | Storage, Credential, Parameter, TokenCounter, Queue |
| LLMStorageService | SQLite + file system operations | Database, File system |
| CredentialService | Encrypt/decrypt API keys | Electron safeStorage |
| ParameterService | Extract/substitute parameters | None |
| TokenCounterService | Estimate token counts | None |
| LLMRequestQueue | Sequential request processing | None (in-memory) |
| Provider (Ollama/OpenAI/Gemini) | API communication | HTTP client, SDK |

**Key Design Principles**:
- ✅ **Single Responsibility**: Each service has one clear purpose
- ✅ **Dependency Injection**: Services receive dependencies via constructor
- ✅ **Interface-based**: All services implement interfaces for testability
- ✅ **Error Handling**: Custom LLMError for consistent error reporting
- ✅ **Async/Await**: All I/O operations are async

