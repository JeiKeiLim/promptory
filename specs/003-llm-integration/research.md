# Research: Direct LLM Integration for Prompts

**Feature**: 003-llm-integration  
**Date**: 2025-11-19  
**Purpose**: Research findings for technical decisions and implementation patterns

---

## 1. Ollama API Integration

### Decision
Use native `fetch` API for Ollama communication (no external library).

### Rationale
- Ollama provides a simple REST API compatible with OpenAI's format
- No authentication required for local instances
- Native fetch reduces dependencies and bundle size
- TypeScript types can be defined locally

### API Endpoints Used
```typescript
POST http://localhost:11434/api/generate
POST http://localhost:11434/api/chat
GET  http://localhost:11434/api/tags  // List available models
```

### Request Format (Generate)
```typescript
interface OllamaGenerateRequest {
  model: string;           // e.g., "llama2", "mistral"
  prompt: string;          // The actual prompt text
  stream?: boolean;        // false for MVP
  options?: {
    temperature?: number;
    top_p?: number;
  };
}
```

### Response Format
```typescript
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;        // The generated text
  done: boolean;
  context?: number[];      // For multi-turn (not MVP)
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}
```

### Error Handling
- Connection refused: Ollama not running → Guide user to start Ollama
- Model not found: Model not pulled → Guide user to `ollama pull <model>`
- Timeout: Use per-provider timeout (default 120s for Ollama)

### Best Practices
- Always validate model name before API call
- Handle both `/api/generate` (completion) and `/api/chat` (conversation) endpoints
- Store base URL as configurable (default: `http://localhost:11434`)
- Implement retry logic for transient failures

### Alternatives Considered
- **Ollama JavaScript library**: Not mature enough, limited TypeScript support
- **OpenAI SDK with Ollama base URL**: Possible but adds unnecessary dependency for local-only MVP

---

## 2. OpenAI SDK Integration

### Decision
Use official `openai` npm package (v4.x).

### Rationale
- Official SDK with excellent TypeScript support
- Handles authentication, retries, and rate limiting automatically
- Same package supports both OpenAI and Azure OpenAI
- Well-maintained with regular updates
- Built-in streaming support for future enhancement

### Installation
```bash
pnpm add openai
```

### Basic Usage
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // From safeStorage
});

const completion = await client.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.7,
});

const response = completion.choices[0].message.content;
```

### Azure OpenAI Support
```typescript
const client = new OpenAI({
  apiKey: azureApiKey,
  baseURL: `https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}`,
  defaultQuery: { 'api-version': '2023-05-15' },
  defaultHeaders: { 'api-key': azureApiKey },
});
```

### Error Handling
- `401`: Invalid API key → Prompt user to update credentials
- `429`: Rate limit exceeded → Show user-friendly error with retry suggestion
- `timeout`: Use per-provider timeout (default 120s)
- Network errors: Allow retry with exponential backoff

### Token Usage Tracking
```typescript
const usage = completion.usage;
// usage.prompt_tokens
// usage.completion_tokens
// usage.total_tokens
```

### Best Practices
- Store API keys in Electron safeStorage (never in files)
- Use streaming for future enhancement (`stream: true`)
- Implement timeout using AbortController
- Cache client instances (don't recreate for each request)

### Alternatives Considered
- **Manual fetch calls**: Rejected due to lack of automatic retry, rate limiting, and error handling
- **Other SDKs (langchain, etc.)**: Too heavyweight for simple API calls

---

## 3. Google Generative AI SDK

### Decision
Use official `@google/generative-ai` npm package.

### Rationale
- Official Google SDK with TypeScript support
- Handles API key authentication
- Built-in safety settings and error handling
- Streaming support available

### Installation
```bash
pnpm add @google/generative-ai
```

### Basic Usage
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const result = await model.generateContent(prompt);
const response = result.response.text();
```

### Error Handling
- Invalid API key: `GoogleGenerativeAIError` → Prompt credential update
- Quota exceeded: Handle gracefully with user-friendly message
- Safety blocks: Gemini may refuse unsafe content → Display reason

### Token Usage
```typescript
const usage = result.response.usageMetadata;
// usage.promptTokenCount
// usage.candidatesTokenCount
// usage.totalTokenCount
```

### Best Practices
- Reuse `GoogleGenerativeAI` instance
- Handle safety settings appropriately
- Implement timeout wrapper (SDK doesn't have built-in timeout)
- Store API key in safeStorage

### Alternatives Considered
- **Manual REST API**: Rejected due to complexity of request format and safety handling

---

## 4. Electron safeStorage for Credentials

### Decision
Use Electron's built-in `safeStorage` API for storing cloud provider API credentials.

### Rationale
- Native Electron API (no external dependencies)
- Uses OS-level encryption:
  - **macOS**: Keychain
  - **Windows**: DPAPI (Data Protection API)
  - **Linux**: Secret Service API (libsecret)
- Automatic encryption/decryption
- Secure against file system access

### Usage Pattern
```typescript
// Main process only
import { safeStorage } from 'electron';

// Check if encryption is available
if (safeStorage.isEncryptionAvailable()) {
  // Store credential
  const encrypted = safeStorage.encryptString(apiKey);
  // Store encrypted buffer in app settings or SQLite
  
  // Retrieve credential
  const apiKey = safeStorage.decryptString(encryptedBuffer);
}
```

### Implementation Strategy
1. Store encrypted credentials in SQLite `provider_configurations` table
2. Field: `encrypted_credentials` (BLOB type)
3. Never log or display actual credentials
4. Decrypt only when needed for API calls
5. Handle cases where encryption unavailable (rare, mostly Linux without libsecret)

### Best Practices
- Always check `isEncryptionAvailable()` first
- Store encrypted Buffer in database, not base64 string (wastes space)
- Never pass credentials to renderer process (use IPC requests)
- Clear credentials from memory after use
- Handle encryption failure gracefully (prompt user for alternate storage)

### Alternatives Considered
- **node-keytar**: External dependency, requires native compilation
- **Plain SQLite with AES**: Custom encryption adds complexity and risk
- **Environment variables**: Not persistent, user-unfriendly

---

## 5. Sequential Queue Management

### Decision
Implement FIFO queue with single-request processing using async queue pattern.

### Rationale
- Prevents rate limiting issues with cloud providers
- Simplifies error handling (no concurrent failures)
- Easier to implement cancellation
- Avoids resource contention
- Users can still submit multiple requests (they queue automatically)

### Implementation Pattern
```typescript
class LLMRequestQueue {
  private queue: LLMRequest[] = [];
  private processing: boolean = false;
  
  async enqueue(request: LLMRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...request, resolve, reject });
      this.processNext();
    });
  }
  
  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const request = this.queue.shift()!;
    
    try {
      const response = await this.executeRequest(request);
      request.resolve(response);
    } catch (error) {
      request.reject(error);
    } finally {
      this.processing = false;
      this.processNext();  // Process next in queue
    }
  }
  
  cancelAll() {
    // Cancel current + clear queue
    this.abortController?.abort();
    this.queue.forEach(req => req.reject(new Error('Cancelled')));
    this.queue = [];
  }
}
```

### Best Practices
- Emit events for queue state changes (for UI updates)
- Store queue state in Zustand (renderer can display position)
- Use AbortController for cancellation
- Persist queue to disk on app close (optional, for recovery)

### Alternatives Considered
- **Concurrent processing (limit 3)**: More complex, benefits minimal for LLM calls
- **Priority queue**: Not needed for MVP, all requests equal priority
- **Per-prompt queues**: Overcomplicates, global queue simpler

---

## 6. Hybrid Storage Pattern (SQLite + File System)

### Decision
Store metadata in SQLite, response content in Markdown files.

### Rationale
- **Performance**: SQLite enables fast queries, filtering, sorting by timestamp/provider
- **Transparency**: Markdown files are human-readable, editable, backupable
- **Alignment**: Follows File-Based Transparency principle
- **Flexibility**: Users can manage response files manually if needed

### SQLite Schema
```sql
CREATE TABLE llm_responses (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  parameters TEXT,  -- JSON
  created_at INTEGER NOT NULL,
  token_usage_prompt INTEGER,
  token_usage_completion INTEGER,
  token_usage_total INTEGER,
  cost_estimate REAL,
  response_time_ms INTEGER,
  status TEXT NOT NULL,  -- 'pending', 'completed', 'failed', 'cancelled'
  file_path TEXT NOT NULL,  -- Relative path to .md file
  error_message TEXT,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

CREATE INDEX idx_llm_responses_prompt_id ON llm_responses(prompt_id);
CREATE INDEX idx_llm_responses_created_at ON llm_responses(created_at DESC);
```

### File Structure
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
id: response-id-123
prompt_id: prompt-456
provider: ollama
model: llama2
created_at: 2025-11-19T10:30:00Z
parameters:
  name: John
  topic: TypeScript
token_usage:
  prompt: 45
  completion: 312
  total: 357
---

# LLM Response

[The actual response content goes here, preserving all markdown formatting, code blocks, etc.]
```

### Sync Strategy
1. **On save**: Write both SQLite entry and .md file atomically
2. **On load**: SQLite query for metadata, lazy-load .md content when user clicks
3. **On render**: Real-time file existence check (`fs.existsSync`), filter missing files
4. **On app start**: Background cleanup removes orphaned SQLite entries (no corresponding .md)

### Best Practices
- Use UUIDs for response IDs (collision-free)
- Atomic writes: Write .md first, then SQLite (easier rollback)
- Handle file system errors gracefully (disk full, permissions)
- Sanitize prompt IDs for directory names (alphanumeric + hyphens)
- Limit directory size (1000 files per prompt)

### Alternatives Considered
- **Pure SQLite**: Rejected, violates transparency principle
- **Pure file system with manifest**: Slower queries, more complex filtering
- **JSON files instead of Markdown**: Less readable, harder to edit manually

---

## 7. Badge and Indicator System

### Decision
Two separate indicators: per-prompt badges and global queue indicator.

### Rationale
- Clear separation of concerns
- Per-prompt badges: "You have new results for THIS prompt"
- Global queue: "System is busy with N requests"
- Different lifecycles: prompt badge clears on modal open, queue clears when empty

### Implementation
```typescript
// Zustand store
interface LLMState {
  // Per-prompt badges
  newResultCounts: Record<string, number>;  // { promptId: count }
  
  // Global queue
  queuedRequests: number;
  
  // Actions
  incrementNewResults: (promptId: string) => void;
  clearNewResults: (promptId: string) => void;
  setQueuedRequests: (count: number) => void;
}
```

### UI Components
1. **LLMBadge**: Small badge on prompt list items (`{count} new`)
2. **LLMQueueIndicator**: App header/status bar (`{count} queued`, Cancel All button)

### Best Practices
- Update badge immediately on response complete (even if modal closed)
- Clear badge on modal open (user acknowledged)
- Animate queue indicator on state change
- Show "Cancel All" only when queue > 0

---

## 8. Error Handling Strategy

### Decision
Three-tier error handling: validation → API errors → recovery

### Error Categories

**1. Validation Errors (Pre-flight)**
- Missing parameters → Highlight in UI, prevent API call
- Model name invalid → Show format hint
- Token limit exceeded → Show character count warning

**2. API Errors (Runtime)**
- Network errors → Retry button
- Timeout → Adjust timeout suggestion
- Auth errors → Update credentials link
- Rate limits → Wait and retry suggestion

**3. Recovery (Post-failure)**
- Temporary failures → Automatic retry option
- Permanent failures → User intervention required
- Partial failures → Save what succeeded

### Implementation Pattern
```typescript
async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  try {
    // Validate
    validateRequest(request);
    
    // Call API
    const response = await provider.generate(request);
    
    // Save
    await saveResponse(response);
    
    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new UserFriendlyError('validation', error.message);
    } else if (error instanceof NetworkError) {
      throw new UserFriendlyError('network', 'Connection failed. Retry?');
    } else if (error instanceof TimeoutError) {
      throw new UserFriendlyError('timeout', `Timeout after ${timeout}s. Adjust in settings?`);
    } else {
      throw new UserFriendlyError('unknown', 'Unexpected error. Check logs.');
    }
  }
}
```

### Best Practices
- Never show raw error stack traces to users
- Log full errors to console (dev) or file (prod)
- Provide actionable recovery steps
- Distinguish between user errors and system errors
- Preserve context (which prompt, which provider, what parameters)

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Ollama API | Native fetch (no library) | Simple REST API, reduces dependencies |
| OpenAI | Official `openai` SDK | Type safety, automatic retries, Azure support |
| Gemini | Official `@google/generative-ai` | Official SDK, safety handling |
| Credentials | Electron safeStorage | OS-level encryption, no dependencies |
| Queue | Sequential FIFO | Prevents rate limiting, simpler error handling |
| Storage | Hybrid (SQLite + .md files) | Performance + transparency |
| Badges | Two separate indicators | Clear UX, different lifecycles |
| Errors | Three-tier (validate → API → recover) | User-friendly, actionable recovery |

---

## Next Steps

1. **Phase 1**: Design data model (SQLite schema, TypeScript interfaces)
2. **Phase 1**: Define API contracts (IPC channels, service interfaces)
3. **Phase 1**: Create quickstart guide for developers
4. **Phase 2**: Generate detailed tasks (/speckit.tasks)

