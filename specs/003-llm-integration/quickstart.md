# Developer Quickstart: LLM Integration

**Feature**: 003-llm-integration  
**Date**: 2025-11-19  
**Purpose**: Step-by-step guide for implementing the LLM integration feature

---

## Prerequisites

1. Read the [spec.md](./spec.md) for requirements
2. Review [research.md](./research.md) for technical decisions
3. Understand [data-model.md](./data-model.md) for database schema
4. Review [contracts/](./contracts/) for API interfaces

---

## Phase 1: Dependencies and Setup

### 1.1 Install NPM Packages

```bash
pnpm add openai @google/generative-ai
```

**Rationale**:
- `openai`: Official OpenAI SDK (supports both OpenAI and Azure OpenAI)
- `@google/generative-ai`: Official Google Gemini SDK
- Ollama uses native fetch (no package needed)

### 1.2 Update SQLite Schema

Add to `src/main/database/schema.sql`:

```sql
-- Provider configurations
CREATE TABLE IF NOT EXISTS provider_configurations (
  id TEXT PRIMARY KEY,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('ollama', 'openai', 'azure_openai', 'gemini')),
  display_name TEXT NOT NULL,
  base_url TEXT,
  model_name TEXT,
  encrypted_credentials BLOB,
  timeout_seconds INTEGER DEFAULT 120,
  is_active BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_validated_at INTEGER,
  UNIQUE(provider_type)
);

CREATE INDEX idx_provider_active ON provider_configurations(is_active) WHERE is_active = 1;

-- LLM response metadata
CREATE TABLE IF NOT EXISTS llm_responses (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('ollama', 'openai', 'azure_openai', 'gemini')),
  model TEXT NOT NULL,
  parameters TEXT,
  created_at INTEGER NOT NULL,
  response_time_ms INTEGER,
  token_usage_prompt INTEGER,
  token_usage_completion INTEGER,
  token_usage_total INTEGER,
  cost_estimate REAL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
  file_path TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

CREATE INDEX idx_llm_responses_prompt_id ON llm_responses(prompt_id);
CREATE INDEX idx_llm_responses_created_at ON llm_responses(created_at DESC);
CREATE INDEX idx_llm_responses_status ON llm_responses(status);
CREATE INDEX idx_llm_responses_provider ON llm_responses(provider);
```

### 1.3 Create File System Directory

Main process initialization:

```typescript
// In main.ts or service initialization
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const userDataPath = app.getPath('userData');
const llmResultsPath = path.join(userDataPath, '.promptory', 'llm_results');

await fs.mkdir(llmResultsPath, { recursive: true });
```

---

## Phase 2: Shared Types

### 2.1 Create `src/shared/types/llm.ts`

```typescript
export type LLMProviderType = 'ollama' | 'openai' | 'azure_openai' | 'gemini';
export type LLMRequestStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface LLMProviderConfig {
  id: string;
  providerType: LLMProviderType;
  displayName: string;
  baseUrl?: string;
  modelName?: string;
  encryptedCredentials?: Buffer;
  timeoutSeconds: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  lastValidatedAt?: number;
}

export interface LLMRequest {
  id: string;
  promptId: string;
  promptContent: string;
  parameters: Record<string, string>;
  provider: LLMProviderType;
  model: string;
  status: LLMRequestStatus;
  createdAt: number;
}

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
  costEstimate?: number;
  status: LLMRequestStatus;
  filePath: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface LLMResponse extends LLMResponseMetadata {
  content: string;
}

export type LLMErrorCode =
  | 'VALIDATION_ERROR'
  | 'CONNECTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'MODEL_NOT_FOUND'
  | 'INSUFFICIENT_QUOTA'
  | 'UNKNOWN_ERROR';

export interface LLMError {
  code: LLMErrorCode;
  message: string;
  provider: LLMProviderType;
  recoveryAction?: string;
}
```

### 2.2 Update `src/shared/constants/ipcChannels.ts`

```typescript
export const IPC_CHANNELS = {
  // ... existing channels
  
  // LLM channels
  LLM_PROVIDER_LIST: 'llm:provider:list',
  LLM_PROVIDER_SAVE: 'llm:provider:save',
  LLM_PROVIDER_SET_ACTIVE: 'llm:provider:setActive',
  LLM_PROVIDER_DELETE: 'llm:provider:delete',
  
  LLM_CALL: 'llm:call',
  LLM_CANCEL: 'llm:cancel',
  LLM_CANCEL_ALL: 'llm:cancelAll',
  
  LLM_RESPONSE_GET_HISTORY: 'llm:response:getHistory',
  LLM_RESPONSE_GET: 'llm:response:get',
  LLM_RESPONSE_DELETE: 'llm:response:delete',
  LLM_RESPONSE_DELETE_ALL: 'llm:response:deleteAll',
  
  // Events
  LLM_QUEUE_UPDATED: 'llm:queue:updated',
  LLM_RESPONSE_COMPLETE: 'llm:response:complete',
  LLM_RESPONSE_ERROR: 'llm:response:error',
} as const;
```

---

## Phase 3: Main Process Services

### 3.1 Create `src/main/services/CredentialService.ts`

```typescript
import { safeStorage } from 'electron';

export class CredentialService {
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
  
  encrypt(plainText: string): Buffer {
    if (!this.isAvailable()) {
      throw new Error('Encryption unavailable on this system');
    }
    return safeStorage.encryptString(plainText);
  }
  
  decrypt(encryptedBuffer: Buffer): string {
    return safeStorage.decryptString(encryptedBuffer);
  }
}
```

### 3.2 Create `src/main/services/providers/OllamaProvider.ts`

```typescript
import type { LLMProviderType } from '@shared/types/llm';

export class OllamaProvider {
  readonly type: LLMProviderType = 'ollama';
  readonly name = 'Ollama';
  
  constructor(
    private baseUrl: string = 'http://localhost:11434',
    private timeoutMs: number = 120000
  ) {}
  
  async validate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error('Ollama server not responding');
      }
    } catch (error) {
      throw new Error(`Cannot connect to Ollama at ${this.baseUrl}`);
    }
  }
  
  async generate(
    prompt: string,
    options: { model: string },
    signal?: AbortSignal
  ): Promise<{
    content: string;
    tokenUsage: { prompt: number; completion: number; total: number };
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          prompt,
          stream: false,
        }),
        signal: signal || controller.signal,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ollama API error');
      }
      
      const data = await response.json();
      
      return {
        content: data.response,
        tokenUsage: {
          prompt: data.prompt_eval_count || 0,
          completion: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

### 3.3 Create `src/main/services/providers/OpenAIProvider.ts`

```typescript
import OpenAI from 'openai';
import type { LLMProviderType } from '@shared/types/llm';

export class OpenAIProvider {
  readonly type: LLMProviderType = 'openai';
  readonly name = 'OpenAI';
  private client: OpenAI;
  
  constructor(
    private apiKey: string,
    private timeoutMs: number = 120000
  ) {
    this.client = new OpenAI({
      apiKey,
      timeout: timeoutMs,
    });
  }
  
  async validate(): Promise<void> {
    try {
      await this.client.models.list();
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      }
      throw error;
    }
  }
  
  async generate(
    prompt: string,
    options: { model: string },
    signal?: AbortSignal
  ) {
    const completion = await this.client.chat.completions.create(
      {
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal }
    );
    
    const content = completion.choices[0].message.content || '';
    const usage = completion.usage;
    
    return {
      content,
      tokenUsage: {
        prompt: usage?.prompt_tokens || 0,
        completion: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0,
      },
    };
  }
}
```

### 3.4 Create `src/main/services/LLMStorageService.ts`

```typescript
import type { Database } from 'better-sqlite3';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { LLMResponseMetadata, LLMProviderConfig } from '@shared/types/llm';

export class LLMStorageService {
  constructor(
    private db: Database,
    private llmResultsPath: string
  ) {}
  
  // Provider config methods
  async saveProviderConfig(config: LLMProviderConfig): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO provider_configurations 
      (id, provider_type, display_name, base_url, model_name, encrypted_credentials, 
       timeout_seconds, is_active, created_at, updated_at, last_validated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      config.id,
      config.providerType,
      config.displayName,
      config.baseUrl || null,
      config.modelName || null,
      config.encryptedCredentials || null,
      config.timeoutSeconds,
      config.isActive ? 1 : 0,
      config.createdAt,
      config.updatedAt,
      config.lastValidatedAt || null
    );
  }
  
  // Response metadata methods
  async saveResponseMetadata(metadata: LLMResponseMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO llm_responses 
      (id, prompt_id, provider, model, parameters, created_at, response_time_ms,
       token_usage_prompt, token_usage_completion, token_usage_total, 
       cost_estimate, status, file_path, error_code, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      metadata.id,
      metadata.promptId,
      metadata.provider,
      metadata.model,
      JSON.stringify(metadata.parameters),
      metadata.createdAt,
      metadata.responseTimeMs || null,
      metadata.tokenUsage?.prompt || null,
      metadata.tokenUsage?.completion || null,
      metadata.tokenUsage?.total || null,
      metadata.costEstimate || null,
      metadata.status,
      metadata.filePath,
      metadata.errorCode || null,
      metadata.errorMessage || null
    );
  }
  
  // File content methods
  async saveResponseContent(
    responseId: string,
    promptId: string,
    content: string,
    metadata: LLMResponseMetadata
  ): Promise<string> {
    const promptDir = path.join(this.llmResultsPath, promptId);
    await fs.mkdir(promptDir, { recursive: true });
    
    const filePath = path.join(promptDir, `${responseId}.md`);
    const relativePath = path.relative(this.llmResultsPath, filePath);
    
    // Create markdown with frontmatter
    const frontmatter = `---
id: ${metadata.id}
prompt_id: ${metadata.promptId}
provider: ${metadata.provider}
model: ${metadata.model}
created_at: ${new Date(metadata.createdAt).toISOString()}
parameters:
${Object.entries(metadata.parameters).map(([k, v]) => `  ${k}: ${v}`).join('\n')}
token_usage:
  prompt: ${metadata.tokenUsage?.prompt || 0}
  completion: ${metadata.tokenUsage?.completion || 0}
  total: ${metadata.tokenUsage?.total || 0}
---

# LLM Response

${content}
`;
    
    await fs.writeFile(filePath, frontmatter, 'utf-8');
    return relativePath;
  }
  
  async readResponseContent(relativeFilePath: string): Promise<string> {
    const fullPath = path.join(this.llmResultsPath, relativeFilePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Strip frontmatter
    const match = content.match(/^---\n(.|\n)*?\n---\n\n((.|\n)*)$/);
    return match ? match[2] : content;
  }
  
  async checkFileExists(relativeFilePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.llmResultsPath, relativeFilePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Mark all 'pending' requests as 'cancelled' (for app quit/crash recovery)
   */
  async markPendingAsCancelled(): Promise<number> {
    const stmt = this.db.prepare(`
      UPDATE llm_responses 
      SET status = 'cancelled', 
          error_message = 'App was closed before request completed'
      WHERE status = 'pending'
    `);
    const result = stmt.run();
    return result.changes || 0;
  }
}
```

### 3.5 Create `src/main/services/LLMService.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { LLMRequest, LLMResponse, LLMProviderConfig } from '@shared/types/llm';
import { CredentialService } from './CredentialService';
import { LLMStorageService } from './LLMStorageService';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';

export class LLMService {
  private queue: LLMRequest[] = [];
  private processing = false;
  private currentAbortController: AbortController | null = null;
  
  constructor(
    private storage: LLMStorageService,
    private credential: CredentialService
  ) {}
  
  async initialize(): Promise<void> {
    // Run cleanup on startup
    await this.cleanupOrphanedEntries();
    
    // Clear any orphaned queue state (from unexpected kill/crash)
    // Queue is in-memory only, so just reset state
    this.queue = [];
    this.processing = false;
    this.currentAbortController = null;
    
    // Mark any 'pending' requests in SQLite as 'cancelled'
    await this.markPendingAsCancelled();
  }
  
  private async markPendingAsCancelled(): Promise<void> {
    // Update any requests that were 'pending' when app crashed
    // This is a safety measure for unexpected kills
    await this.storage.markPendingAsCancelled();
  }
  
  /**
   * Cleanup on app quit - cancel all pending/in-progress requests
   */
  async cleanupOnQuit(): Promise<void> {
    // Cancel current request if in progress
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    
    // Clear queue
    this.queue = [];
    this.processing = false;
    this.currentAbortController = null;
    
    // Mark any 'pending' requests in SQLite as 'cancelled'
    await this.markPendingAsCancelled();
  }
  
  async enqueueRequest(request: Omit<LLMRequest, 'id' | 'createdAt' | 'status'>): Promise<{
    requestId: string;
    queuePosition: number;
  }> {
    const fullRequest: LLMRequest = {
      ...request,
      id: uuidv4(),
      createdAt: Date.now(),
      status: 'pending',
    };
    
    this.queue.push(fullRequest);
    const position = this.queue.length;
    
    // Start processing if not already
    this.processNext();
    
    return {
      requestId: fullRequest.id,
      queuePosition: position,
    };
  }
  
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const request = this.queue.shift()!;
    this.currentAbortController = new AbortController();
    
    try {
      const response = await this.executeRequest(request, this.currentAbortController.signal);
      // Emit success event
    } catch (error) {
      // Emit error event
    } finally {
      this.processing = false;
      this.currentAbortController = null;
      this.processNext();  // Process next in queue
    }
  }
  
  private async executeRequest(request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // Get active provider
    const providerConfig = await this.storage.getActiveProviderConfig();
    if (!providerConfig) {
      throw new Error('No active provider configured');
    }
    
    // Create provider instance
    const provider = this.createProvider(providerConfig);
    
    // Call API
    const result = await provider.generate(request.promptContent, { model: request.model }, signal);
    
    // Save response
    const responseMetadata = {
      id: uuidv4(),
      promptId: request.promptId,
      provider: request.provider,
      model: request.model,
      parameters: request.parameters,
      createdAt: Date.now(),
      responseTimeMs: Date.now() - startTime,
      tokenUsage: result.tokenUsage,
      costEstimate: this.estimateCost(request.provider, result.tokenUsage),
      status: 'completed' as const,
      filePath: '',  // Will be set by saveResponseContent
    };
    
    const filePath = await this.storage.saveResponseContent(
      responseMetadata.id,
      request.promptId,
      result.content,
      responseMetadata
    );
    
    responseMetadata.filePath = filePath;
    await this.storage.saveResponseMetadata(responseMetadata);
    
    return {
      ...responseMetadata,
      content: result.content,
    };
  }
  
  private createProvider(config: LLMProviderConfig) {
    switch (config.providerType) {
      case 'ollama':
        return new OllamaProvider(config.baseUrl, config.timeoutSeconds * 1000);
      case 'openai':
        const apiKey = this.credential.decrypt(config.encryptedCredentials!);
        return new OpenAIProvider(apiKey, config.timeoutSeconds * 1000);
      // ... other providers
      default:
        throw new Error(`Unsupported provider: ${config.providerType}`);
    }
  }
  
  async cancelAllRequests(): Promise<number> {
    const count = this.queue.length + (this.processing ? 1 : 0);
    
    // Abort current request
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    
    // Clear queue
    this.queue = [];
    
    return count;
  }
  
  private async cleanupOrphanedEntries(): Promise<number> {
    // Get all responses from SQLite
    const allResponses = await this.storage.getAllResponses();
    let cleanedCount = 0;
    
    // Check each file
    for (const response of allResponses) {
      const exists = await this.storage.checkFileExists(response.filePath);
      if (!exists) {
        await this.storage.deleteResponseMetadata(response.id);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
  
  private estimateCost(provider: string, tokenUsage: any): number {
    // Simplified cost estimation
    const costs = {
      openai: { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },  // GPT-3.5 pricing
      // ... other providers
    };
    
    const pricing = costs[provider as keyof typeof costs];
    if (!pricing) return 0;
    
    return (tokenUsage.prompt * pricing.prompt) + (tokenUsage.completion * pricing.completion);
  }
}
```

---

## Phase 4: IPC Handlers

### 4.1 Create `src/main/handlers/llmHandlers.ts`

```typescript
import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { LLMService } from '../services/LLMService';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

export function registerLLMHandlers(llmService: LLMService) {
  // Provider operations
  ipcMain.handle(IPC_CHANNELS.LLM_PROVIDER_LIST, async () => {
    try {
      const providers = await llmService.listProviders();
      return { success: true, data: providers };
    } catch (error: any) {
      return { success: false, error: { code: 'DATABASE_ERROR', message: error.message } };
    }
  });
  
  // LLM call
  ipcMain.handle(IPC_CHANNELS.LLM_CALL, async (_, request) => {
    try {
      const result = await llmService.enqueueRequest(request);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } };
    }
  });
  
  // Cancel all
  ipcMain.handle(IPC_CHANNELS.LLM_CANCEL_ALL, async () => {
    try {
      const count = await llmService.cancelAllRequests();
      return { success: true, data: { cancelled_count: count } };
    } catch (error: any) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error.message } };
    }
  });
  
  // Response history
  ipcMain.handle(IPC_CHANNELS.LLM_RESPONSE_GET_HISTORY, async (_, request) => {
    try {
      const history = await llmService.getResponseHistory(request.prompt_id, request.limit, request.offset);
      return { success: true, data: history };
    } catch (error: any) {
      return { success: false, error: { code: 'DATABASE_ERROR', message: error.message } };
    }
  });
  
  // ... other handlers
}
```

### 4.2 Register in `src/main/main.ts`

```typescript
import { app } from 'electron';
import { registerLLMHandlers } from './handlers/llmHandlers';
import { LLMService } from './services/LLMService';

// After creating services
const llmService = new LLMService(storageService, credentialService);
await llmService.initialize();

registerLLMHandlers(llmService);

// Handle app quit - cancel all pending requests
app.on('before-quit', async (event) => {
  // Cancel all pending/in-progress LLM requests
  await llmService.cleanupOnQuit();
  // App will continue to quit normally
});
```

---

## Phase 5: Preload Script

### 5.1 Update `src/preload/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

contextBridge.exposeInMainWorld('llm', {
  provider: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_PROVIDER_LIST),
    save: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_PROVIDER_SAVE, req),
    setActive: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_PROVIDER_SET_ACTIVE, req),
    delete: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_PROVIDER_DELETE, req),
  },
  
  call: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_CALL, req),
  cancelAll: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CANCEL_ALL),
  
  response: {
    getHistory: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_RESPONSE_GET_HISTORY, req),
    get: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_RESPONSE_GET, req),
    delete: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_RESPONSE_DELETE, req),
    deleteAll: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.LLM_RESPONSE_DELETE_ALL, req),
  },
  
  events: {
    onQueueUpdated: (callback: any) => {
      ipcRenderer.on(IPC_CHANNELS.LLM_QUEUE_UPDATED, (_, data) => callback(data));
      return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_QUEUE_UPDATED, callback);
    },
    onResponseComplete: (callback: any) => {
      ipcRenderer.on(IPC_CHANNELS.LLM_RESPONSE_COMPLETE, (_, data) => callback(data));
      return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_RESPONSE_COMPLETE, callback);
    },
    onResponseError: (callback: any) => {
      ipcRenderer.on(IPC_CHANNELS.LLM_RESPONSE_ERROR, (_, data) => callback(data));
      return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_RESPONSE_ERROR, callback);
    },
  },
});

// TypeScript declaration
declare global {
  interface Window {
    llm: typeof window.llm;
  }
}
```

---

## Phase 6: Renderer Components and Store

### 6.1 Create Zustand Store `src/renderer/stores/useLLMStore.ts`

```typescript
import { create } from 'zustand';
import type { LLMProviderConfig, LLMResponseMetadata } from '@shared/types/llm';

interface LLMStore {
  // Provider state
  activeProvider: LLMProviderConfig | null;
  availableProviders: LLMProviderConfig[];
  
  // Queue state
  queueLength: number;
  
  // Per-prompt badge counts
  newResultCounts: Record<string, number>;
  
  // Actions
  setActiveProvider: (provider: LLMProviderConfig | null) => void;
  setAvailableProviders: (providers: LLMProviderConfig[]) => void;
  setQueueLength: (length: number) => void;
  incrementNewResults: (promptId: string) => void;
  clearNewResults: (promptId: string) => void;
}

export const useLLMStore = create<LLMStore>((set) => ({
  activeProvider: null,
  availableProviders: [],
  queueLength: 0,
  newResultCounts: {},
  
  setActiveProvider: (provider) => set({ activeProvider: provider }),
  setAvailableProviders: (providers) => set({ availableProviders: providers }),
  setQueueLength: (length) => set({ queueLength: length }),
  incrementNewResults: (promptId) => set((state) => ({
    newResultCounts: {
      ...state.newResultCounts,
      [promptId]: (state.newResultCounts[promptId] || 0) + 1,
    },
  })),
  clearNewResults: (promptId) => set((state) => ({
    newResultCounts: {
      ...state.newResultCounts,
      [promptId]: 0,
    },
  })),
}));
```

### 6.2 Create API Wrapper `src/renderer/utils/llmApi.ts`

```typescript
export const llmApi = {
  provider: {
    list: () => window.llm.provider.list(),
    save: (req: any) => window.llm.provider.save(req),
    setActive: (req: any) => window.llm.provider.setActive(req),
    delete: (req: any) => window.llm.provider.delete(req),
  },
  
  call: (req: any) => window.llm.call(req),
  cancelAll: () => window.llm.cancelAll(),
  
  response: {
    getHistory: (req: any) => window.llm.response.getHistory(req),
    get: (req: any) => window.llm.response.get(req),
    delete: (req: any) => window.llm.response.delete(req),
    deleteAll: (req: any) => window.llm.response.deleteAll(req),
  },
  
  events: window.llm.events,
};
```

### 6.3 Create Hook `src/renderer/hooks/useLLMEvents.ts`

```typescript
import { useEffect } from 'react';
import { useLLMStore } from '../stores/useLLMStore';
import { llmApi } from '../utils/llmApi';

export function useLLMEvents() {
  const { setQueueLength, incrementNewResults } = useLLMStore();
  
  useEffect(() => {
    // Queue updated
    const unsubQueue = llmApi.events.onQueueUpdated((data) => {
      setQueueLength(data.queue_length);
    });
    
    // Response complete
    const unsubResponse = llmApi.events.onResponseComplete((data) => {
      incrementNewResults(data.prompt_id);
      // Show toast notification
    });
    
    // Response error
    const unsubError = llmApi.events.onResponseError((data) => {
      // Show error toast
    });
    
    return () => {
      unsubQueue();
      unsubResponse();
      unsubError();
    };
  }, []);
}
```

### 6.4 Create Component `src/renderer/components/llm/LLMQueueIndicator.tsx`

```typescript
import React from 'react';
import { useLLMStore } from '../../stores/useLLMStore';
import { llmApi } from '../../utils/llmApi';

export function LLMQueueIndicator() {
  const queueLength = useLLMStore((state) => state.queueLength);
  
  const handleCancelAll = async () => {
    if (confirm('Cancel all pending LLM requests?')) {
      await llmApi.cancelAll();
    }
  };
  
  if (queueLength === 0) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm">
      <span>{queueLength} queued</span>
      <button
        onClick={handleCancelAll}
        className="text-blue-600 hover:text-blue-800"
        title="Cancel all"
      >
        ✕
      </button>
    </div>
  );
}
```

---

## Phase 7: Testing

### 7.1 Unit Test Example: `tests/unit/services/LLMService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '@main/services/LLMService';

describe('LLMService', () => {
  let service: LLMService;
  let mockStorage: any;
  let mockCredential: any;
  
  beforeEach(() => {
    mockStorage = {
      saveResponseMetadata: vi.fn(),
      saveResponseContent: vi.fn().mockResolvedValue('path/to/file.md'),
    };
    mockCredential = {
      decrypt: vi.fn().mockReturnValue('fake-api-key'),
    };
    
    service = new LLMService(mockStorage, mockCredential);
  });
  
  it('should enqueue request and return queue position', async () => {
    const request = {
      promptId: 'test-1',
      promptContent: 'Test prompt',
      parameters: {},
      provider: 'ollama' as const,
      model: 'llama2',
    };
    
    const result = await service.enqueueRequest(request);
    
    expect(result.requestId).toBeDefined();
    expect(result.queuePosition).toBe(1);
  });
});
```

### 7.2 Integration Test Example: `tests/integration/ipc/llmHandlers.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';

describe('LLM IPC Handlers', () => {
  it('should list providers', async () => {
    const response = await ipcRenderer.invoke(IPC_CHANNELS.LLM_PROVIDER_LIST);
    
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });
  
  it('should handle LLM call', async () => {
    const request = {
      prompt_id: 'test-prompt-1',
      prompt_content: 'Hello, world!',
      parameters: {},
    };
    
    const response = await ipcRenderer.invoke(IPC_CHANNELS.LLM_CALL, request);
    
    expect(response.success).toBe(true);
    expect(response.data.request_id).toBeDefined();
  });
});
```

---

## Phase 8: i18n

### 8.1 Add Translation Keys

Update `src/renderer/i18n/locales/en.json`:

```json
{
  "llm": {
    "callButton": "Call LLM",
    "cancelAll": "Cancel All",
    "newResults": "{{count}} new",
    "queuedCalls": "{{count}} queued",
    "providers": {
      "ollama": "Ollama (Local)",
      "openai": "OpenAI",
      "azure": "Azure OpenAI",
      "gemini": "Google Gemini"
    },
    "errors": {
      "timeout": "Request timed out after {{seconds}}s. Adjust timeout in settings?",
      "connection": "Cannot connect to {{provider}}. Please check your configuration.",
      "auth": "Invalid API key for {{provider}}. Update credentials in settings.",
      "modelNotFound": "Model '{{model}}' not found. Please check model name."
    },
    "success": {
      "responseCopied": "Response copied to clipboard",
      "providerSaved": "Provider configuration saved"
    }
  }
}
```

---

## Testing Checklist

- [ ] SQLite schema created successfully
- [ ] Provider configurations can be saved/loaded
- [ ] Ollama provider can make API calls (with local Ollama running)
- [ ] OpenAI provider can validate API keys
- [ ] Requests are queued and processed sequentially
- [ ] Responses are saved to both SQLite and .md files
- [ ] .md files have correct frontmatter
- [ ] Per-prompt badges show correct counts
- [ ] Global queue indicator shows correct count
- [ ] "Cancel All" button works
- [ ] Response history loads correctly
- [ ] Individual response deletion works
- [ ] "Clear All Results" for prompt works
- [ ] Manual .md file deletion is handled gracefully
- [ ] Orphaned entries are cleaned up on app start
- [ ] Pending requests are cancelled on graceful app quit
- [ ] Orphaned queue state is cleared on app launch (handles unexpected kills)
- [ ] All IPC channels respond correctly
- [ ] Events are emitted correctly
- [ ] UI updates in real-time
- [ ] Error messages are user-friendly and translated

---

## Common Issues and Solutions

### Issue: safeStorage not available

**Solution**: Check OS support. On Linux, ensure libsecret is installed:
```bash
sudo apt-get install libsecret-1-dev
```

### Issue: Ollama connection refused

**Solution**: Ensure Ollama is running:
```bash
ollama serve
```

### Issue: SQLite foreign key constraint error

**Solution**: Enable foreign keys in SQLite:
```typescript
db.pragma('foreign_keys = ON');
```

### Issue: File not found when reading response

**Solution**: Use relative paths and check existence before reading:
```typescript
const exists = await storage.checkFileExists(filePath);
if (!exists) {
  // Handle missing file
}
```

### Issue: Queue state persists after app crash

**Solution**: Queue is in-memory only. On app launch, `LLMService.initialize()` clears queue state and marks any 'pending' SQLite entries as 'cancelled'. This handles both graceful quit and unexpected kills.

---

## Next Steps

1. Complete implementation following this guide
2. Run tests: `pnpm test`
3. Build app: `pnpm build`
4. Test manually with Ollama (MVP)
5. Generate detailed tasks: `/speckit.tasks`
6. Implement in order of user story priority (US1 → US2 → US3 → US4 → US5)

---

**Ready to implement!** 🚀

