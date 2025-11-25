# IPC Contract: Title Generation

**Feature**: 004-llm-response-titles  
**Phase**: 1 (Design)  
**Date**: 2025-11-25

## Overview

This contract defines IPC communication channels between the renderer process (React UI) and main process (Electron backend) for title generation functionality.

## Channels

### 1. `llm:title:config:get`

**Direction**: Renderer → Main → Renderer  
**Purpose**: Retrieve current title generation configuration

**Request**:
```typescript
{
  channel: 'llm:title:config:get',
  payload: null  // No parameters needed
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    enabled: boolean;
    selectedModel: string;
    selectedProvider: 'ollama' | 'openai' | 'azure_openai' | 'gemini';
    timeoutSeconds: number;
  }
}

// Error response
{
  success: false,
  error: string;
}
```

**Example**:
```typescript
// Renderer
const config = await window.electron.llm.getTitleConfig();

// Main handler
ipcMain.handle('llm:title:config:get', async () => {
  const config = settingsService.getTitleGenerationConfig();
  return { success: true, data: config };
});
```

---

### 2. `llm:title:config:set`

**Direction**: Renderer → Main → Renderer  
**Purpose**: Update title generation configuration

**Request**:
```typescript
{
  channel: 'llm:title:config:set',
  payload: {
    enabled?: boolean;           // Optional: Update enabled state
    selectedModel?: string;      // Optional: Update model
    selectedProvider?: string;   // Optional: Update provider
    timeoutSeconds?: number;     // Optional: Update timeout (10-120)
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    enabled: boolean;
    selectedModel: string;
    selectedProvider: string;
    timeoutSeconds: number;
  }
}

// Error response (validation failed)
{
  success: false,
  error: 'Invalid timeout: must be between 10 and 120 seconds'
}
```

**Validation Rules**:
- `timeoutSeconds`: If provided, must be 10 ≤ value ≤ 120
- `selectedProvider`: If provided, must be valid provider type
- `selectedModel`: If provided, must be non-empty string

**Example**:
```typescript
// Renderer
const result = await window.electron.llm.setTitleConfig({
  enabled: true,
  timeoutSeconds: 45
});

// Main handler
ipcMain.handle('llm:title:config:set', async (_event, updates) => {
  if (updates.timeoutSeconds !== undefined && 
      (updates.timeoutSeconds < 10 || updates.timeoutSeconds > 120)) {
    return { success: false, error: 'Invalid timeout: must be between 10 and 120 seconds' };
  }
  const config = settingsService.updateTitleGenerationConfig(updates);
  return { success: true, data: config };
});
```

---

### 3. `llm:title:generate` (Internal - Main process only)

**Direction**: Main (LLM handler) → Main (TitleGenerationService)  
**Purpose**: Trigger title generation after main response completes

**Note**: This is NOT an IPC channel exposed to renderer. It's an internal service call within the main process.

**Method Signature**:
```typescript
// In TitleGenerationService.ts
async generateTitle(
  responseId: string,
  responseContent: string
): Promise<{ success: boolean; title?: string; error?: string }>
```

**Parameters**:
- `responseId`: UUID of the response to generate title for
- `responseContent`: First ~500 characters of response content

**Return Value**:
```typescript
// Success
{
  success: true,
  title: "React Component Best Practices"
}

// Failure (timeout, error, etc.)
{
  success: false,
  error: "Title generation timeout after 30s"
}
```

**Flow**:
```typescript
// In llmHandlers.ts, after main response completes
const response = await providerService.generate(request);
await fileService.saveResponse(response);

// Trigger title generation (if enabled)
if (titleConfig.enabled) {
  await titleGenerationService.generateTitle(response.id, response.content);
}
```

---

### 4. `llm:title:status` (Event - Main → Renderer)

**Direction**: Main → Renderer (one-way event)  
**Purpose**: Notify renderer of title generation status changes

**Event Name**: `llm:title:status`

**Payload**:
```typescript
{
  responseId: string;
  status: 'pending' | 'completed' | 'failed';
  title?: string;                // Present only when status = 'completed'
  generatedAt?: number;          // Unix timestamp, present when status = 'completed'
  model?: string;                // Model used, present when status = 'completed'
}
```

**Examples**:

**Pending** (title generation started):
```typescript
{
  responseId: 'abc-123',
  status: 'pending'
}
```

**Completed** (title generated successfully):
```typescript
{
  responseId: 'abc-123',
  status: 'completed',
  title: 'Python Data Analysis Tutorial',
  generatedAt: 1732499500,
  model: 'gemma3:1b'
}
```

**Failed** (timeout or error):
```typescript
{
  responseId: 'abc-123',
  status: 'failed'
}
```

**Listener Setup**:
```typescript
// Renderer (in useLLMStore or hook)
useEffect(() => {
  const unlisten = window.electron.llm.onTitleStatus((event) => {
    if (event.status === 'pending') {
      setTitleLoading(event.responseId, true);
    } else if (event.status === 'completed') {
      updateResponseTitle(event.responseId, event.title);
      setTitleLoading(event.responseId, false);
    } else if (event.status === 'failed') {
      setTitleLoading(event.responseId, false);
    }
  });
  
  return () => unlisten();
}, []);

// Main process (in TitleGenerationService)
private notifyStatusChange(event: TitleStatusEvent) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('llm:title:status', event);
  });
}
```

---

## Preload API Extensions

**File**: `src/preload/llm.ts` (extend existing)

```typescript
// Extend existing llm API
export const llmApi = {
  // ... existing methods ...
  
  // Title generation config
  getTitleConfig: () => ipcRenderer.invoke('llm:title:config:get'),
  setTitleConfig: (updates: Partial<TitleGenerationConfig>) => 
    ipcRenderer.invoke('llm:title:config:set', updates),
  
  // Title generation status listener
  onTitleStatus: (callback: (event: TitleStatusEvent) => void) => {
    const listener = (_event: any, data: TitleStatusEvent) => callback(data);
    ipcRenderer.on('llm:title:status', listener);
    return () => ipcRenderer.removeListener('llm:title:status', listener);
  }
};
```

---

## Type Definitions

**File**: `src/shared/types/llm-ipc.ts` (extend existing)

```typescript
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
 * Title generation status event
 */
export interface TitleStatusEvent {
  responseId: string;
  status: 'pending' | 'completed' | 'failed';
  title?: string;
  generatedAt?: number;
  model?: string;
}

/**
 * IPC response wrapper
 */
export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Security Considerations

### Input Validation

**All IPC handlers MUST validate inputs:**

```typescript
// Example: Validate timeout setting
ipcMain.handle('llm:title:config:set', async (_event, updates) => {
  // Validate timeout range
  if (updates.timeoutSeconds !== undefined) {
    if (typeof updates.timeoutSeconds !== 'number' ||
        updates.timeoutSeconds < 10 || 
        updates.timeoutSeconds > 120) {
      return { 
        success: false, 
        error: 'Invalid timeout: must be between 10 and 120 seconds' 
      };
    }
  }
  
  // Validate provider type
  if (updates.selectedProvider !== undefined) {
    const validProviders = ['ollama', 'openai', 'azure_openai', 'gemini'];
    if (!validProviders.includes(updates.selectedProvider)) {
      return { 
        success: false, 
        error: 'Invalid provider type' 
      };
    }
  }
  
  // ... proceed with update
});
```

### Context Isolation

- All IPC channels use `contextBridge.exposeInMainWorld` via preload script
- No direct `nodeIntegration` in renderer process
- Renderer cannot call arbitrary main process code

### Error Handling

- Never expose internal error details to renderer (security risk)
- Log detailed errors in main process only
- Return user-friendly error messages via IPC

---

## Testing Strategy

### Unit Tests (Handler Logic)

```typescript
// tests/unit/handlers/titleGenerationHandlers.test.ts
describe('Title Generation IPC Handlers', () => {
  it('should get title config', async () => {
    const config = await ipcRenderer.invoke('llm:title:config:get');
    expect(config.success).toBe(true);
    expect(config.data.enabled).toBeDefined();
  });
  
  it('should reject invalid timeout', async () => {
    const result = await ipcRenderer.invoke('llm:title:config:set', {
      timeoutSeconds: 200  // Invalid: > 120
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid timeout');
  });
});
```

### Integration Tests (Full Flow)

```typescript
// tests/integration/title-generation-flow.test.ts
describe('Title Generation E2E', () => {
  it('should generate title after response completes', async () => {
    // 1. Make LLM call
    const response = await generateLLMResponse(prompt);
    
    // 2. Wait for title status event
    const statusEvent = await waitForEvent('llm:title:status');
    expect(statusEvent.status).toBe('completed');
    expect(statusEvent.title).toBeTruthy();
    
    // 3. Verify title in database
    const metadata = await llmStorageService.getResponse(response.id);
    expect(metadata.generatedTitle).toBe(statusEvent.title);
  });
});
```

---

## Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `TITLE_TIMEOUT` | Title generation exceeded timeout | None (silent failure, fallback to model name) |
| `TITLE_PROVIDER_ERROR` | Provider returned error | None (silent failure) |
| `TITLE_CONFIG_INVALID` | Configuration validation failed | Fix configuration in settings |
| `TITLE_RESPONSE_NOT_FOUND` | Response ID not found | Regenerate response |

---

**Status**: IPC contracts complete. All channels defined with request/response schemas, validation rules, and security considerations. Ready for quickstart document.
