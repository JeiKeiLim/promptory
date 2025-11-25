# Data Model: Direct LLM Integration for Prompts

**Feature**: 003-llm-integration  
**Date**: 2025-11-19  
**Purpose**: Define entities, schemas, and data relationships

---

## Overview

The LLM integration feature uses hybrid storage:
- **SQLite**: Metadata, provider configurations, request/response metadata
- **File System**: Response content as Markdown files (`.promptory/llm_results/{prompt-id}/{response-id}.md`)

---

## Entity Relationship Diagram

```
┌─────────────────────────┐
│ Prompt (existing)       │
│ - id: string            │
└───────────┬─────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────┐
│ LLM Response            │
│ - id: string (PK)       │
│ - prompt_id: string (FK)│
│ - provider: string      │
│ - model: string         │
│ - file_path: string     │
│ - created_at: timestamp │
│ - status: enum          │
└───────────┬─────────────┘
            │
            │ N:1
            ▼
┌─────────────────────────┐
│ Provider Configuration  │
│ - id: string (PK)       │
│ - provider_type: enum   │
│ - base_url: string?     │
│ - encrypted_creds: blob?│
│ - timeout_seconds: int  │
└─────────────────────────┘

┌─────────────────────────┐
│ Request Queue (in-mem)  │
│ - request_id: string    │
│ - prompt_id: string     │
│ - status: enum          │
│ - position: number      │
└─────────────────────────┘
```

---

## SQLite Schema

### 1. provider_configurations

Stores LLM provider settings and encrypted credentials.

```sql
CREATE TABLE IF NOT EXISTS provider_configurations (
  id TEXT PRIMARY KEY,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('ollama', 'openai', 'azure_openai', 'gemini')),
  display_name TEXT NOT NULL,
  
  -- Connection settings
  base_url TEXT,  -- For Ollama and Azure OpenAI
  model_name TEXT,  -- Default model for this provider
  
  -- Security (encrypted via Electron safeStorage)
  encrypted_credentials BLOB,  -- Encrypted API key/token
  
  -- Configuration
  timeout_seconds INTEGER DEFAULT 120,
  is_active BOOLEAN DEFAULT 0,  -- Only one provider active at a time
  
  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_validated_at INTEGER,
  
  -- Validation
  UNIQUE(provider_type)
);

CREATE INDEX idx_provider_active ON provider_configurations(is_active) WHERE is_active = 1;
```

**Notes**:
- `provider_type` is unique (only one configuration per provider type)
- `encrypted_credentials` stores Electron safeStorage encrypted Buffer
- `base_url` used for Ollama (http://localhost:11434) and Azure OpenAI (custom endpoint)
- Only one provider can be active at a time (`is_active = 1`)

---

### 2. llm_responses

Stores metadata for all LLM API responses. Content stored in .md files.

```sql
CREATE TABLE IF NOT EXISTS llm_responses (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  
  -- Provider info
  provider TEXT NOT NULL CHECK(provider IN ('ollama', 'openai', 'azure_openai', 'gemini')),
  model TEXT NOT NULL,
  
  -- Request parameters (JSON)
  parameters TEXT,  -- Serialized { key: value } pairs from prompt
  
  -- Timing
  created_at INTEGER NOT NULL,
  response_time_ms INTEGER,
  
  -- Token usage
  token_usage_prompt INTEGER,
  token_usage_completion INTEGER,
  token_usage_total INTEGER,
  cost_estimate REAL,  -- In USD
  
  -- Status
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Storage
  file_path TEXT NOT NULL,  -- Relative path: {prompt-id}/{response-id}.md
  
  -- Error handling
  error_code TEXT,
  error_message TEXT,
  
  -- Foreign key (cascade delete when prompt deleted)
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_llm_responses_prompt_id ON llm_responses(prompt_id);
CREATE INDEX idx_llm_responses_created_at ON llm_responses(created_at DESC);
CREATE INDEX idx_llm_responses_status ON llm_responses(status);
CREATE INDEX idx_llm_responses_provider ON llm_responses(provider);
```

**Notes**:
- `prompt_id` references existing prompts table
- `parameters` stored as JSON string for flexibility
- `file_path` is relative to `.promptory/llm_results/` directory
- `status` tracks request lifecycle
- Cascade delete ensures cleanup when prompt is deleted

---

## TypeScript Interfaces

### Shared Types (`src/shared/types/llm.ts`)

```typescript
/**
 * Supported LLM providers
 */
export type LLMProviderType = 'ollama' | 'openai' | 'azure_openai' | 'gemini';

/**
 * Request/response status
 */
export type LLMRequestStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

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
```

---

## File System Structure

### Directory Layout

```
.promptory/llm_results/
├── {prompt-id-1}/
│   ├── {response-id-1}.md
│   ├── {response-id-2}.md
│   └── {response-id-3}.md
└── {prompt-id-2}/
    ├── {response-id-1}.md
    └── {response-id-2}.md
```

### Markdown File Format

```markdown
---
id: response-id-123abc
prompt_id: prompt-456def
provider: ollama
model: llama2
created_at: 2025-11-19T10:30:00.000Z
response_time_ms: 3452
prompt: |
  This is the full prompt that was sent to the LLM.
  It can be very long and span multiple lines.
  All formatting is preserved using YAML literal block scalar (|).
  Special characters and indentation are maintained.
parameters:
  name: John Doe
  topic: TypeScript
token_usage:
  prompt: 45
  completion: 312
  total: 357
cost_estimate: 0.00042
status: completed
---

# LLM Response

This is the actual response content from the LLM.
It preserves all markdown formatting, including:

## Code blocks

​```typescript
function example() {
  return "hello";
}
​```

## Lists

- Item 1
- Item 2
- Item 3

## Emphasis

**Bold text** and *italic text* are preserved.
```

**Notes**:
- YAML frontmatter contains metadata (duplicates SQLite for transparency)
- **`prompt` field**: Full substituted prompt stored as YAML literal block scalar (`|`) to preserve all formatting, newlines, and special characters
- Content follows standard Markdown format
- File name is `{response-id}.md` for direct lookup
- Encoding: UTF-8
- The prompt can be very long - YAML literal block scalars handle multi-line strings efficiently

---

## In-Memory State (Zustand Store)

### `useLLMStore.ts`

```typescript
interface LLMStore {
  // Provider configuration
  activeProvider: LLMProviderConfig | null;
  availableProviders: LLMProviderConfig[];
  
  // Request queue (UI state)
  queuedRequests: LLMRequest[];
  currentRequest: LLMRequest | null;
  
  // Per-prompt new result counts (for badges)
  newResultCounts: Record<string, number>;  // { promptId: count }
  
  // UI state
  isSidePanelOpen: boolean;
  selectedResponseId: string | null;
  
  // Actions
  setActiveProvider: (providerId: string) => Promise<void>;
  enqueueRequest: (request: LLMRequest) => Promise<void>;
  cancelRequest: (requestId: string) => void;
  cancelAllRequests: () => void;
  incrementNewResults: (promptId: string) => void;
  clearNewResults: (promptId: string) => void;
  openSidePanel: () => void;
  closeSidePanel: () => void;
}
```

**Important**: Queue state is **in-memory only** (not persisted to disk). On app quit:
- **Graceful quit**: All pending/in-progress requests are cancelled via `app.on('before-quit')`
- **Unexpected kill/crash**: On next app launch, `LLMService.initialize()` clears queue state and marks any 'pending' SQLite entries as 'cancelled'

---

## Data Flow

### 1. User Initiates LLM Call

```
User clicks "Call LLM"
  → ParameterInputModal validates parameters
  → Renderer: useLLMStore.enqueueRequest()
  → IPC: invoke('llm:call', request)
  → Main: LLMService.enqueue(request)
  → Queue: Add to FIFO queue
  → Main: Process next in queue
  → Provider-specific API call (Ollama/OpenAI/Gemini)
  → Save response (SQLite + .md file)
  → IPC: send('llm:response:complete', response)
  → Renderer: Update store, increment badge
  → UI: Show new result in side panel (if open)
```

### 2. User Opens Prompt (Modal)

```
User clicks prompt from list
  → ParameterInputModal opens
  → Renderer: Load responses for this prompt
  → IPC: invoke('llm:getHistory', promptId)
  → Main: SQLite query WHERE prompt_id = ?
  → Main: Filter out entries with missing .md files
  → Main: Return metadata array
  → Renderer: Display in side panel (truncated)
  → Renderer: Clear badge for this prompt
```

### 3. User Clicks Response in Side Panel

```
User clicks response item
  → Renderer: Check if content already loaded
  → If not: IPC invoke('llm:getResponse', responseId)
  → Main: Read .md file from disk
  → Main: Parse frontmatter + content
  → Main: Return full response
  → Renderer: Display in expanded modal view
```

### 4. User Deletes Response

```
User clicks delete button (with confirmation)
  → IPC: invoke('llm:deleteResponse', responseId)
  → Main: Delete SQLite entry
  → Main: Delete .md file
  → Main: Return success
  → Renderer: Remove from UI
  → Update badge if needed
```

---

## Validation Rules

### Provider Configuration

- `provider_type`: Must be one of supported types
- `base_url`: Required for Ollama and Azure, must be valid URL
- `model_name`: Required, alphanumeric + hyphens only
- `timeout_seconds`: Min 10, max 600 (10 minutes)
- `encrypted_credentials`: Required for cloud providers, not for Ollama

### LLM Request

- `promptContent`: Not empty after parameter substitution
- `parameters`: All required parameters must have values
- `model`: Valid format, matches provider's model list
- Total length: Must not exceed model's token limit (check before API call)

### LLM Response

- `file_path`: Must be relative path, sanitized (no ../ traversal)
- `token_usage`: All values non-negative
- `cost_estimate`: Non-negative
- `response_time_ms`: Non-negative
- `status`: Must transition in valid order (pending → completed/failed/cancelled)

---

## State Transitions

### LLM Request Status

```
pending → completed   (success)
pending → failed      (error)
pending → cancelled   (user cancelled)
```

**No transitions FROM** completed, failed, or cancelled (terminal states).

### Provider Active Status

```
When user selects new active provider:
  1. Set all providers is_active = false
  2. Set selected provider is_active = true
  
(Transaction ensures only one active)
```

---

## Data Retention and Cleanup

### Automatic Cleanup

1. **On app start**: Background task removes orphaned SQLite entries
   - Query all responses
   - Check file existence for each
   - Delete SQLite entries with missing files
   - Log count removed

2. **Per-prompt limit**: 1000 responses max
   - When saving new response for prompt
   - Count existing responses for that prompt
   - If ≥1000, delete oldest (by created_at)
   - Delete both SQLite entry and .md file

### Manual Cleanup

- User can delete individual responses (via UI)
- User can "Clear All Results" for a prompt (via UI)
- User can manually delete .md files (filtered out in UI, cleaned up on app start)

---

## Performance Considerations

### Indexes

- Primary keys: O(1) lookups by ID
- `prompt_id` index: Fast filtering by prompt
- `created_at` index: Fast sorting for recent responses
- `status` index: Fast filtering by status (for queue display)

### Lazy Loading

- Load metadata first (SQLite query, fast)
- Load content only when user clicks (file read, lazy)
- Cache recently viewed responses in memory (LRU cache)

### File System

- Max 1000 files per prompt directory (OS friendly)
- Use UUID v4 for response IDs (collision-free)
- Sanitize prompt IDs for directory names (alphanumeric + hyphens)

---

## Migration Strategy

No existing data to migrate (new feature). Schema created on first launch:

```typescript
// Main process initialization
await db.exec(`
  CREATE TABLE IF NOT EXISTS provider_configurations (...);
  CREATE TABLE IF NOT EXISTS llm_responses (...);
  CREATE INDEX IF NOT EXISTS ...;
`);

// Create file system directory
await fs.mkdir('.promptory/llm_results', { recursive: true });
```

---

## Summary

| Component | Storage | Purpose |
|-----------|---------|---------|
| Provider configs | SQLite | Fast provider switching, credential management |
| Response metadata | SQLite | Fast queries, filtering, sorting |
| Response content | .md files | Human-readable, transparent, editable |
| Request queue | In-memory (Zustand) | Real-time UI updates, no persistence needed |
| Badges | In-memory (Zustand) | UI state, cleared on acknowledge |

**Key Design Principles**:
- ✅ Hybrid storage balances performance + transparency
- ✅ SQLite for queryable metadata
- ✅ File system for user-accessible content
- ✅ Graceful handling of manual file operations
- ✅ Per-prompt isolation (1:N relationship)

