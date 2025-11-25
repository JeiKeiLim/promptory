# IPC API Contracts: LLM Integration

**Feature**: 003-llm-integration  
**Date**: 2025-11-19  
**Purpose**: Define all IPC channels for communication between renderer and main processes

---

## Channel Naming Convention

Format: `{domain}:{action}`

- **Domain**: `llm` (all LLM-related operations)
- **Action**: Verb describing the operation (e.g., `call`, `cancel`, `getHistory`)

---

## Provider Configuration Channels

### `llm:provider:list`

Get all configured LLM providers.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
// No parameters
```

**Response**:
```typescript
interface ListProvidersResponse {
  success: boolean;
  data?: LLMProviderConfig[];
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `DATABASE_ERROR`: SQLite query failed

---

### `llm:provider:save`

Save or update a provider configuration.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface SaveProviderRequest {
  provider_type: LLMProviderType;
  display_name: string;
  base_url?: string;  // For Ollama and Azure
  model_name?: string;
  credentials?: string;  // Plain text, will be encrypted
  timeout_seconds?: number;
}
```

**Response**:
```typescript
interface SaveProviderResponse {
  success: boolean;
  data?: {
    id: string;
    provider_type: LLMProviderType;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `VALIDATION_ERROR`: Invalid input (e.g., bad URL format)
- `ENCRYPTION_UNAVAILABLE`: safeStorage not available
- `DATABASE_ERROR`: SQLite write failed

**Side Effects**:
- Encrypts credentials using Electron safeStorage
- Stores encrypted credentials in SQLite
- Updates `updated_at` timestamp

---

### `llm:provider:setActive`

Set which provider is currently active.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface SetActiveProviderRequest {
  provider_id: string;
}
```

**Response**:
```typescript
interface SetActiveProviderResponse {
  success: boolean;
  data?: {
    provider_id: string;
    provider_type: LLMProviderType;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `PROVIDER_NOT_FOUND`: Provider ID doesn't exist
- `DATABASE_ERROR`: SQLite update failed

**Side Effects**:
- Sets `is_active = false` for all other providers
- Sets `is_active = true` for selected provider
- Uses transaction for atomicity

---

### `llm:provider:delete`

Delete a provider configuration.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface DeleteProviderRequest {
  provider_id: string;
}
```

**Response**:
```typescript
interface DeleteProviderResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `PROVIDER_NOT_FOUND`: Provider ID doesn't exist
- `PROVIDER_IN_USE`: Cannot delete active provider
- `DATABASE_ERROR`: SQLite delete failed

---

## LLM Call Channels

### `llm:call`

Initiate an LLM API call. Request is added to queue and processed sequentially.

**Direction**: Renderer → Main → Renderer (async)  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface LLMCallRequest {
  prompt_id: string;
  prompt_content: string;  // After parameter substitution
  parameters: Record<string, string>;
  provider?: LLMProviderType;  // Optional, uses active if not specified
  model?: string;  // Optional, uses provider default if not specified
}
```

**Response**:
```typescript
interface LLMCallResponse {
  success: boolean;
  data?: {
    request_id: string;
    queue_position: number;
  };
  error?: {
    code: LLMErrorCode;
    message: string;
    recovery_action?: string;
  };
}
```

**Error Codes**:
- `VALIDATION_ERROR`: Missing parameters, invalid prompt content
- `NO_ACTIVE_PROVIDER`: No provider configured/active
- `CONNECTION_ERROR`: Cannot reach provider (Ollama not running, network down)
- `AUTH_ERROR`: Invalid credentials
- `TOKEN_LIMIT_EXCEEDED`: Prompt too long for model

**Side Effects**:
- Adds request to queue
- Triggers queue processing
- Emits `llm:queue:updated` event

---

### `llm:cancel`

Cancel a specific LLM request (if pending or in-progress).

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface CancelRequestRequest {
  request_id: string;
}
```

**Response**:
```typescript
interface CancelRequestResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `REQUEST_NOT_FOUND`: Request ID doesn't exist
- `REQUEST_ALREADY_COMPLETED`: Cannot cancel completed request

**Side Effects**:
- Aborts ongoing API call (if in-progress)
- Removes from queue (if pending)
- Marks request as `cancelled` in memory
- Emits `llm:queue:updated` event

---

### `llm:cancelAll`

Cancel all pending and in-progress LLM requests globally.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
// No parameters
```

**Response**:
```typescript
interface CancelAllRequestsResponse {
  success: boolean;
  data?: {
    cancelled_count: number;
  };
}
```

**Side Effects**:
- Aborts current API call
- Clears entire queue
- Marks all as `cancelled`
- Emits `llm:queue:updated` event (queue now empty)

---

## Response History Channels

### `llm:response:getHistory`

Get all LLM responses for a specific prompt (metadata only, no content).

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface GetHistoryRequest {
  prompt_id: string;
  limit?: number;  // Default: 100
  offset?: number;  // Default: 0
}
```

**Response**:
```typescript
interface GetHistoryResponse {
  success: boolean;
  data?: {
    responses: LLMResponseMetadata[];
    total_count: number;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `PROMPT_NOT_FOUND`: Prompt ID doesn't exist
- `DATABASE_ERROR`: SQLite query failed

**Side Effects**:
- Performs real-time file existence check
- Filters out responses with missing .md files
- Returns only responses with existing files

---

### `llm:response:get`

Get full LLM response including content from .md file.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface GetResponseRequest {
  response_id: string;
}
```

**Response**:
```typescript
interface GetResponseResponse {
  success: boolean;
  data?: LLMResponse;  // Includes content field
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `RESPONSE_NOT_FOUND`: Response ID doesn't exist in SQLite
- `FILE_NOT_FOUND`: .md file missing
- `FILE_READ_ERROR`: Cannot read .md file (permissions, corruption)

**Side Effects**:
- Reads .md file from disk
- Parses frontmatter and content
- Returns complete response object

---

### `llm:response:delete`

Delete a single LLM response (both SQLite entry and .md file).

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface DeleteResponseRequest {
  response_id: string;
}
```

**Response**:
```typescript
interface DeleteResponseResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `RESPONSE_NOT_FOUND`: Response ID doesn't exist
- `FILE_DELETE_ERROR`: Cannot delete .md file
- `DATABASE_ERROR`: SQLite delete failed

**Side Effects**:
- Deletes SQLite entry
- Deletes .md file
- Transaction ensures both succeed or both fail

---

### `llm:response:deleteAll`

Delete all LLM responses for a specific prompt.

**Direction**: Renderer → Main → Renderer  
**Type**: `ipcRenderer.invoke`

**Request**:
```typescript
interface DeleteAllResponsesRequest {
  prompt_id: string;
}
```

**Response**:
```typescript
interface DeleteAllResponsesResponse {
  success: boolean;
  data?: {
    deleted_count: number;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes**:
- `PROMPT_NOT_FOUND`: Prompt ID doesn't exist
- `FILE_DELETE_ERROR`: Some .md files couldn't be deleted
- `DATABASE_ERROR`: SQLite delete failed

**Side Effects**:
- Deletes all SQLite entries for prompt
- Deletes all .md files in prompt directory
- May delete empty directory
- Returns count of deleted responses

---

## Event Channels (Main → Renderer)

### `llm:queue:updated`

Emitted whenever queue state changes (request added, completed, cancelled).

**Direction**: Main → Renderer  
**Type**: `ipcRenderer.on`

**Payload**:
```typescript
interface QueueUpdatedEvent {
  queue_length: number;
  current_request: {
    id: string;
    prompt_id: string;
    position: 1;  // Always 1 for current
  } | null;
}
```

**When Emitted**:
- Request added to queue
- Request starts processing
- Request completes/fails/cancelled
- All requests cancelled

---

### `llm:response:complete`

Emitted when an LLM response is successfully saved.

**Direction**: Main → Renderer  
**Type**: `ipcRenderer.on`

**Payload**:
```typescript
interface ResponseCompleteEvent {
  response_id: string;
  prompt_id: string;
  provider: LLMProviderType;
  model: string;
  token_usage?: TokenUsage;
  cost_estimate?: number;
  response_time_ms: number;
}
```

**When Emitted**:
- After successful API call
- After saving to SQLite and .md file

**Renderer Actions**:
- Increment badge for prompt
- Show toast notification (if modal closed)
- Update side panel (if open)

---

### `llm:response:error`

Emitted when an LLM request fails.

**Direction**: Main → Renderer  
**Type**: `ipcRenderer.on`

**Payload**:
```typescript
interface ResponseErrorEvent {
  request_id: string;
  prompt_id: string;
  error: LLMError;
}
```

**When Emitted**:
- After API call failure
- After timeout
- After validation error

**Renderer Actions**:
- Show error toast
- Update UI with error state
- Provide retry option

---

## IPC Channel Summary Table

| Channel | Direction | Type | Purpose |
|---------|-----------|------|---------|
| `llm:provider:list` | R→M→R | invoke | List all providers |
| `llm:provider:save` | R→M→R | invoke | Save/update provider |
| `llm:provider:setActive` | R→M→R | invoke | Set active provider |
| `llm:provider:delete` | R→M→R | invoke | Delete provider |
| `llm:call` | R→M→R | invoke | Initiate LLM call |
| `llm:cancel` | R→M→R | invoke | Cancel single request |
| `llm:cancelAll` | R→M→R | invoke | Cancel all requests |
| `llm:response:getHistory` | R→M→R | invoke | Get response history |
| `llm:response:get` | R→M→R | invoke | Get full response |
| `llm:response:delete` | R→M→R | invoke | Delete response |
| `llm:response:deleteAll` | R→M→R | invoke | Delete all for prompt |
| `llm:queue:updated` | M→R | on | Queue state changed |
| `llm:response:complete` | M→R | on | Response saved |
| `llm:response:error` | M→R | on | Request failed |

**Legend**: R = Renderer, M = Main

---

## Security Considerations

### 1. Credential Handling

- ❌ NEVER send decrypted credentials to renderer
- ✅ Credentials only decrypted in main process
- ✅ Use Electron safeStorage for encryption
- ✅ Store encrypted Buffer in SQLite

### 2. Path Validation

- ✅ All file paths validated through PathValidator
- ✅ No directory traversal allowed (../)
- ✅ Prompt IDs sanitized for directory names

### 3. IPC Whitelisting

- ✅ All channels explicitly registered in preload script
- ✅ Context isolation enabled
- ✅ NodeIntegration disabled

### 4. Input Sanitization

- ✅ Validate all user input before API calls
- ✅ Sanitize model names (alphanumeric + hyphens)
- ✅ Check parameter lengths against token limits

---

## Error Response Format

All IPC responses follow this standard format:

```typescript
interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**Error Codes** are categorized:
- `VALIDATION_*`: User input errors
- `CONNECTION_*`: Network/API errors
- `AUTH_*`: Authentication errors
- `DATABASE_*`: SQLite errors
- `FILE_*`: File system errors
- `UNKNOWN_*`: Unexpected errors

---

## Implementation Notes

### Main Process (Handlers)

Create `src/main/handlers/llmHandlers.ts`:
```typescript
export function registerLLMHandlers(ipcMain: IpcMain, llmService: LLMService) {
  ipcMain.handle('llm:provider:list', async () => {
    // Implementation
  });
  
  ipcMain.handle('llm:call', async (_, request: LLMCallRequest) => {
    // Implementation
  });
  
  // ... other handlers
}
```

### Preload Script

Expose safe IPC API in `src/preload/preload.ts`:
```typescript
contextBridge.exposeInMainWorld('llm', {
  // Provider operations
  listProviders: () => ipcRenderer.invoke('llm:provider:list'),
  saveProvider: (req) => ipcRenderer.invoke('llm:provider:save', req),
  setActiveProvider: (req) => ipcRenderer.invoke('llm:provider:setActive', req),
  deleteProvider: (req) => ipcRenderer.invoke('llm:provider:delete', req),
  
  // LLM operations
  call: (req) => ipcRenderer.invoke('llm:call', req),
  cancel: (req) => ipcRenderer.invoke('llm:cancel', req),
  cancelAll: () => ipcRenderer.invoke('llm:cancelAll'),
  
  // Response operations
  getHistory: (req) => ipcRenderer.invoke('llm:response:getHistory', req),
  getResponse: (req) => ipcRenderer.invoke('llm:response:get', req),
  deleteResponse: (req) => ipcRenderer.invoke('llm:response:delete', req),
  deleteAllResponses: (req) => ipcRenderer.invoke('llm:response:deleteAll', req),
  
  // Event listeners
  onQueueUpdated: (callback) => ipcRenderer.on('llm:queue:updated', (_, data) => callback(data)),
  onResponseComplete: (callback) => ipcRenderer.on('llm:response:complete', (_, data) => callback(data)),
  onResponseError: (callback) => ipcRenderer.on('llm:response:error', (_, data) => callback(data)),
});
```

### Renderer (API Wrapper)

Create `src/renderer/utils/llmApi.ts`:
```typescript
export const llmApi = {
  provider: {
    list: () => window.llm.listProviders(),
    save: (req) => window.llm.saveProvider(req),
    setActive: (req) => window.llm.setActiveProvider(req),
    delete: (req) => window.llm.deleteProvider(req),
  },
  
  call: (req) => window.llm.call(req),
  cancel: (req) => window.llm.cancel(req),
  cancelAll: () => window.llm.cancelAll(),
  
  response: {
    getHistory: (req) => window.llm.getHistory(req),
    get: (req) => window.llm.getResponse(req),
    delete: (req) => window.llm.deleteResponse(req),
    deleteAll: (req) => window.llm.deleteAllResponses(req),
  },
  
  events: {
    onQueueUpdated: (callback) => window.llm.onQueueUpdated(callback),
    onResponseComplete: (callback) => window.llm.onResponseComplete(callback),
    onResponseError: (callback) => window.llm.onResponseError(callback),
  },
};
```

---

## Testing Strategy

### Unit Tests

- Mock IPC handlers
- Test request validation
- Test error handling
- Test response formatting

### Integration Tests

- Test full IPC round-trip
- Test event emission
- Test queue management
- Test file operations

### Example Test

```typescript
describe('llm:call handler', () => {
  it('should enqueue request and return queue position', async () => {
    const request = {
      prompt_id: 'test-prompt-1',
      prompt_content: 'Test prompt',
      parameters: { name: 'Test' },
    };
    
    const response = await ipcRenderer.invoke('llm:call', request);
    
    expect(response.success).toBe(true);
    expect(response.data?.queue_position).toBe(1);
  });
  
  it('should emit queue:updated event', async () => {
    const listener = jest.fn();
    ipcRenderer.on('llm:queue:updated', listener);
    
    await ipcRenderer.invoke('llm:call', request);
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ queue_length: 1 })
    );
  });
});
```

---

## Summary

- **14 IPC channels** defined (11 invoke, 3 events)
- **Standard error format** for consistency
- **Type-safe** interfaces for all requests/responses
- **Security-first** design (credentials never exposed to renderer)
- **Event-driven** UI updates (queue, responses, errors)

