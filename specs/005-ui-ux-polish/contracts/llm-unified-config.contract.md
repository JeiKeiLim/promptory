# IPC Contract: Unified LLM Settings

**Channel**: `llm:unified-config:*`  
**Purpose**: Manage unified LLM configuration for both LLM calls and title generation  
**Version**: 1.0

---

## Channels

### 1. `llm:unified-config:get`

**Direction**: Renderer → Main  
**Purpose**: Retrieve current unified LLM configuration

**Request**:
```typescript
{
  // No parameters needed - returns current active config
}
```

**Response**:
```typescript
{
  success: boolean;
  config?: UnifiedLLMConfig;
  error?: string;
}

interface UnifiedLLMConfig {
  provider: 'ollama' | 'openai' | 'azure_openai' | 'gemini';
  llmCall: {
    model: string;
    timeout: number; // 1-999
  };
  titleGeneration: {
    enabled: boolean;
    model: string;
    timeout: number; // 1-999
  };
}
```

**Success Example**:
```json
{
  "success": true,
  "config": {
    "provider": "ollama",
    "llmCall": {
      "model": "gemma3",
      "timeout": 60
    },
    "titleGeneration": {
      "enabled": true,
      "model": "gemma3:1b",
      "timeout": 30
    }
  }
}
```

**Error Example**:
```json
{
  "success": false,
  "error": "Failed to load configuration: File not found"
}
```

**Error Conditions**:
- Configuration file not found → Returns default config
- Configuration file corrupted → Returns error with details
- File system permission error → Returns error

---

### 2. `llm:unified-config:save`

**Direction**: Renderer → Main  
**Purpose**: Save unified LLM configuration

**Request**:
```typescript
{
  config: UnifiedLLMConfig;
}
```

**Response**:
```typescript
{
  success: boolean;
  error?: string;
  validationErrors?: string[];
}
```

**Success Example**:
```json
{
  "success": true
}
```

**Validation Error Example**:
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "LLM call timeout must be between 1 and 999 seconds",
    "Title generation model is required"
  ]
}
```

**Error Conditions**:
- Validation failure (timeout out of range, empty models) → Returns validation errors
- File system write error → Returns error
- Concurrent modification detected → Returns conflict error

**Validation Rules** (enforced in main process):
1. Provider must be non-empty
2. LLM call model must be non-empty string
3. LLM call timeout must be integer 1-999
4. Title generation model must be non-empty string
5. Title generation timeout must be integer 1-999

---

### 3. `llm:unified-config:validate`

**Direction**: Renderer → Main  
**Purpose**: Validate configuration without saving (for real-time feedback)

**Request**:
```typescript
{
  config: UnifiedLLMConfig;
}
```

**Response**:
```typescript
{
  valid: boolean;
  errors: string[];
}
```

**Success Example**:
```json
{
  "valid": true,
  "errors": []
}
```

**Validation Error Example**:
```json
{
  "valid": false,
  "errors": [
    "LLM call timeout must be between 1 and 999 seconds",
    "Title generation model is required"
  ]
}
```

---

## Migration Channel

### 4. `llm:config:migrate`

**Direction**: Main → Internal (Auto-triggered)  
**Purpose**: Migrate existing separate configs to unified config on first launch

**Note**: This is an internal operation, not directly called by renderer. Triggered automatically by main process on app startup if unified config doesn't exist.

**Migration Logic**:
```typescript
async function migrateToUnifiedConfig() {
  // Check if already migrated
  if (await exists('llm-unified.json')) {
    return; // Already migrated
  }
  
  // Load existing configs
  const llmProvider = await loadJSON('llm-provider.json') || {};
  const titleConfig = await loadJSON('title-generation.json') || {};
  
  // Build unified config with defaults
  const unified: UnifiedLLMConfig = {
    provider: llmProvider.providerType || 'ollama',
    llmCall: {
      model: llmProvider.modelName || 'gemma3',
      timeout: llmProvider.timeoutSeconds || 60
    },
    titleGeneration: {
      enabled: titleConfig.enabled !== false,
      model: titleConfig.selectedModel || 'gemma3:1b',
      timeout: titleConfig.timeoutSeconds || 30
    }
  };
  
  // Validate migrated config
  const validation = validateUnifiedConfig(unified);
  if (!validation.valid) {
    console.error('Migration failed validation:', validation.errors);
    // Fall back to defaults
    unified = DEFAULT_UNIFIED_CONFIG;
  }
  
  // Save unified config
  await saveJSON('llm-unified.json', unified);
  
  // Keep backups for rollback
  await rename('llm-provider.json', 'llm-provider.json.backup');
  await rename('title-generation.json', 'title-generation.json.backup');
}
```

---

## Deprecated Channels

**These channels are replaced by unified config channels and should be marked deprecated**:

### ~~`LLM_PROVIDER_SAVE`~~
**Replacement**: `llm:unified-config:save`  
**Migration Path**: Renderer should update to use unified config channel

### ~~`LLM_TITLE_CONFIG_SET`~~
**Replacement**: `llm:unified-config:save`  
**Migration Path**: Renderer should update to use unified config channel

### ~~`LLM_TITLE_CONFIG_GET`~~
**Replacement**: `llm:unified-config:get`  
**Migration Path**: Renderer should update to use unified config channel

**Deprecation Timeline**:
- v0.3.0: Add unified channels alongside existing channels
- v0.4.0: Mark old channels as deprecated in code comments
- v0.5.0: Remove old channels entirely

---

## Type Definitions

```typescript
// src/shared/constants/ipcChannels.ts

export const IPC_CHANNELS = {
  // ... existing channels ...
  
  // Unified LLM Config
  LLM_UNIFIED_CONFIG_GET: 'llm:unified-config:get',
  LLM_UNIFIED_CONFIG_SAVE: 'llm:unified-config:save',
  LLM_UNIFIED_CONFIG_VALIDATE: 'llm:unified-config:validate',
  
  // Deprecated (to be removed in v0.5.0)
  // LLM_PROVIDER_SAVE: 'llm:provider:save', // Use LLM_UNIFIED_CONFIG_SAVE
  // LLM_TITLE_CONFIG_SET: 'llm:title-config:set', // Use LLM_UNIFIED_CONFIG_SAVE
  // LLM_TITLE_CONFIG_GET: 'llm:title-config:get', // Use LLM_UNIFIED_CONFIG_GET
} as const;
```

---

## Handler Implementation (Main Process)

```typescript
// src/main/handlers/llmUnifiedConfigHandler.ts

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { UnifiedLLMConfig } from '@shared/types/llm';

export function registerUnifiedLLMConfigHandlers() {
  // GET
  ipcMain.handle(IPC_CHANNELS.LLM_UNIFIED_CONFIG_GET, async () => {
    try {
      const config = await llmConfigService.getUnifiedConfig();
      return { success: true, config };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  // SAVE
  ipcMain.handle(IPC_CHANNELS.LLM_UNIFIED_CONFIG_SAVE, async (_, config: UnifiedLLMConfig) => {
    try {
      // Validate
      const validation = validateUnifiedConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors
        };
      }
      
      // Save
      await llmConfigService.saveUnifiedConfig(config);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  // VALIDATE
  ipcMain.handle(IPC_CHANNELS.LLM_UNIFIED_CONFIG_VALIDATE, async (_, config: UnifiedLLMConfig) => {
    const validation = validateUnifiedConfig(config);
    return validation;
  });
}

function validateUnifiedConfig(config: UnifiedLLMConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.provider) {
    errors.push('Provider is required');
  }
  
  if (!config.llmCall.model || config.llmCall.model.trim() === '') {
    errors.push('LLM call model is required');
  }
  
  if (config.llmCall.timeout < 1 || config.llmCall.timeout > 999) {
    errors.push('LLM call timeout must be between 1 and 999 seconds');
  }
  
  if (!config.titleGeneration.model || config.titleGeneration.model.trim() === '') {
    errors.push('Title generation model is required');
  }
  
  if (config.titleGeneration.timeout < 1 || config.titleGeneration.timeout > 999) {
    errors.push('Title generation timeout must be between 1 and 999 seconds');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Usage Example (Renderer)

```typescript
// src/renderer/components/settings/LLMSettings.tsx

import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { UnifiedLLMConfig } from '@shared/types/llm';

export const LLMSettings: React.FC = () => {
  const [config, setConfig] = useState<UnifiedLLMConfig | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const result = await window.electronAPI.invoke(IPC_CHANNELS.LLM_UNIFIED_CONFIG_GET);
      if (result.success) {
        setConfig(result.config);
      }
    };
    loadConfig();
  }, []);
  
  // Real-time validation
  const handleFieldChange = async (field: string, value: any) => {
    const updatedConfig = { ...config, /* update field */ };
    setConfig(updatedConfig);
    
    // Validate
    const validation = await window.electronAPI.invoke(
      IPC_CHANNELS.LLM_UNIFIED_CONFIG_VALIDATE,
      updatedConfig
    );
    setValidationErrors(validation.errors);
  };
  
  // Save
  const handleSave = async () => {
    const result = await window.electronAPI.invoke(
      IPC_CHANNELS.LLM_UNIFIED_CONFIG_SAVE,
      config
    );
    
    if (result.success) {
      toast.success('Settings saved');
    } else {
      if (result.validationErrors) {
        setValidationErrors(result.validationErrors);
      }
      toast.error(result.error || 'Failed to save settings');
    }
  };
  
  return (/* UI */);
};
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/handlers/llmUnifiedConfigHandler.test.ts

describe('Unified LLM Config Handler', () => {
  it('should validate timeout range', () => {
    const config = { /* invalid timeout */ };
    const result = validateUnifiedConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('timeout must be between 1 and 999');
  });
  
  it('should require both model fields', () => {
    const config = { /* missing models */ };
    const result = validateUnifiedConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('model is required');
  });
});
```

### Integration Tests

```typescript
// tests/integration/llm-unified-config.test.ts

describe('Unified LLM Config IPC', () => {
  it('should save and retrieve config', async () => {
    const config: UnifiedLLMConfig = { /* valid config */ };
    
    // Save
    const saveResult = await ipcRenderer.invoke(
      IPC_CHANNELS.LLM_UNIFIED_CONFIG_SAVE,
      config
    );
    expect(saveResult.success).toBe(true);
    
    // Retrieve
    const getResult = await ipcRenderer.invoke(IPC_CHANNELS.LLM_UNIFIED_CONFIG_GET);
    expect(getResult.success).toBe(true);
    expect(getResult.config).toEqual(config);
  });
});
```

---

## Error Handling

**Renderer Side**:
- Display validation errors inline next to form fields
- Show toast notification for save success/failure
- Disable save button while validation errors exist
- Rollback optimistic updates on failure (not applicable for settings - no optimistic updates)

**Main Process Side**:
- Log all errors to console with stack traces
- Return structured error responses to renderer
- Never crash on validation failure (return error response)
- Ensure atomic writes (write to temp file, then rename)

---

## Performance Considerations

**Debouncing Real-time Validation**:
```typescript
const debouncedValidate = debounce(async (config: UnifiedLLMConfig) => {
  const validation = await window.electronAPI.invoke(
    IPC_CHANNELS.LLM_UNIFIED_CONFIG_VALIDATE,
    config
  );
  setValidationErrors(validation.errors);
}, 300); // 300ms debounce
```

**Caching Config in Renderer**:
- Load config once on settings modal open
- Keep in local state during editing
- Only save to main process when user clicks Save button
- Reduces IPC round-trips during typing

---

## Summary

**New IPC Channels**: 3 (`get`, `save`, `validate`)  
**Deprecated Channels**: 3 (old separate config channels)  
**Migration**: Automatic on first launch  
**Validation**: Comprehensive server-side validation with client-side feedback  
**Error Handling**: Structured error responses, never crash  
**Testing**: Unit tests for validation, integration tests for IPC flow
