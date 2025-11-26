# Data Model: UI/UX Polish

**Feature**: 005-ui-ux-polish  
**Date**: 2025-11-26  
**Purpose**: Define data structures for unified LLM settings and UI state changes

## Entities

### 1. UnifiedLLMConfig

**Purpose**: Consolidates LLM call settings and title generation settings under single provider selection

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `provider` | `LLMProviderType` | Required, enum: 'ollama' \| 'openai' \| 'azure_openai' \| 'gemini' | Single provider for both LLM calls and title generation |
| `llmCall` | `LLMCallSettings` | Required | Settings specific to LLM API calls |
| `titleGeneration` | `TitleGenerationSettings` | Required | Settings specific to title generation |

**Relationships**:
- Has one `LLMCallSettings`
- Has one `TitleGenerationSettings`
- Replaces separate `LLMProviderConfig` and `TitleGenerationConfig` structures

**Validation Rules**:
```typescript
validate(config: UnifiedLLMConfig): ValidationResult {
  errors = [];
  
  // Provider required
  if (!config.provider) {
    errors.push('Provider must be selected');
  }
  
  // LLM Call model required
  if (!config.llmCall.model || config.llmCall.model.trim() === '') {
    errors.push('LLM call model is required');
  }
  
  // LLM Call timeout: 1-999
  if (config.llmCall.timeout < 1 || config.llmCall.timeout > 999) {
    errors.push('LLM call timeout must be between 1 and 999 seconds');
  }
  
  // Title generation model required
  if (!config.titleGeneration.model || config.titleGeneration.model.trim() === '') {
    errors.push('Title generation model is required');
  }
  
  // Title generation timeout: 1-999
  if (config.titleGeneration.timeout < 1 || config.titleGeneration.timeout > 999) {
    errors.push('Title generation timeout must be between 1 and 999 seconds');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Default Values**:
```typescript
const DEFAULT_UNIFIED_CONFIG: UnifiedLLMConfig = {
  provider: 'ollama',
  llmCall: {
    model: 'gemma3',
    timeout: 60
  },
  titleGeneration: {
    enabled: true,
    model: 'gemma3:1b',
    timeout: 30
  }
};
```

---

### 2. LLMCallSettings

**Purpose**: Configuration for LLM API calls

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `model` | `string` | Required, non-empty | Model name for LLM API calls (e.g., 'gpt-4', 'gemma3') |
| `timeout` | `number` | Required, integer, 1-999 | Timeout in seconds for API calls |

**Validation Rules**:
- `model`: Must be non-empty string
- `timeout`: Must be integer between 1 and 999 inclusive

---

### 3. TitleGenerationSettings

**Purpose**: Configuration for automatic title generation

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `enabled` | `boolean` | Required | Whether title generation is enabled |
| `model` | `string` | Required, non-empty | Model name for title generation (e.g., 'gemma3:1b', 'gpt-3.5-turbo') |
| `timeout` | `number` | Required, integer, 1-999 | Timeout in seconds for title generation |

**Validation Rules**:
- `enabled`: Boolean, no validation needed
- `model`: Must be non-empty string
- `timeout`: Must be integer between 1 and 999 inclusive

**State Transitions**:
```typescript
// When disabled → enabled
onEnable() {
  this.enabled = true;
  // Model and timeout must already be set (validation enforced)
}

// When enabled → disabled
onDisable() {
  this.enabled = false;
  // Model and timeout preserved (user can re-enable without reconfiguring)
}
```

---

### 4. FavoriteToggleState (UI State)

**Purpose**: Tracks favorite button state for optimistic updates and error handling

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `promptId` | `string` | Required | Unique identifier of the prompt |
| `isFavorite` | `boolean` | Required | Current favorite status (optimistically updated) |
| `isPending` | `boolean` | Required | Whether a toggle operation is in progress |
| `error` | `string \| null` | Optional | Error message if toggle operation failed |

**State Transitions**:

```
Initial: { isFavorite: false, isPending: false, error: null }

User clicks star:
  ↓
Optimistic Update: { isFavorite: true, isPending: true, error: null }
  ↓
IPC Call: window.electronAPI.invoke('prompt:update', ...)
  ↓
Success: { isFavorite: true, isPending: false, error: null }
OR
Failure: { isFavorite: false, isPending: false, error: 'Failed to update' }
         (Rollback + Show error notification)
```

**Debouncing Logic**:
```typescript
// Debounce timer managed per prompt ID
debounceTimers: Map<string, NodeJS.Timeout>

handleToggle(promptId: string) {
  // Clear existing timer for this prompt
  if (debounceTimers.has(promptId)) {
    clearTimeout(debounceTimers.get(promptId));
  }
  
  // Set new timer (300ms)
  const timer = setTimeout(() => {
    persistToggle(promptId);
  }, 300);
  
  debounceTimers.set(promptId, timer);
}
```

---

### 5. PromptMetadata (Existing - No Changes)

**Purpose**: Metadata for each prompt (including favorite status)

**Relevant Fields** (unchanged):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `favorite` | `boolean` | Required | Whether prompt is favorited |

**Note**: No structural changes to `PromptMetadata`, only UI changes to expose favorite toggle on all prompt cards.

---

## Type Definitions

### TypeScript Interfaces

```typescript
// src/shared/types/llm.ts

export type LLMProviderType = 'ollama' | 'openai' | 'azure_openai' | 'gemini';

export interface LLMCallSettings {
  model: string;
  timeout: number; // 1-999
}

export interface TitleGenerationSettings {
  enabled: boolean;
  model: string;
  timeout: number; // 1-999
}

export interface UnifiedLLMConfig {
  provider: LLMProviderType;
  llmCall: LLMCallSettings;
  titleGeneration: TitleGenerationSettings;
}

export interface UnifiedLLMConfigValidation {
  valid: boolean;
  errors: string[];
}

// UI state for favorite toggle
export interface FavoriteToggleState {
  promptId: string;
  isFavorite: boolean;
  isPending: boolean;
  error: string | null;
}
```

---

## Persistence

### Unified LLM Config Persistence

**Storage Location**: `~/Promptory/.config/llm-unified.json` (or equivalent platform-specific config directory)

**Format**:
```json
{
  "version": "1.0",
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
```

**Migration from Existing Configs**:
```typescript
// Read existing configs
const llmProvider = readJSON('~/Promptory/.config/llm-provider.json');
const titleConfig = readJSON('~/Promptory/.config/title-generation.json');

// Merge into unified config
const unified: UnifiedLLMConfig = {
  provider: llmProvider.providerType,
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

// Write unified config
writeJSON('~/Promptory/.config/llm-unified.json', unified);

// Remove old configs (after successful migration)
deleteFile('~/Promptory/.config/llm-provider.json');
deleteFile('~/Promptory/.config/title-generation.json');
```

---

### Favorite Status Persistence

**Existing Mechanism**: Stored in YAML front matter of prompt markdown files

**Format** (unchanged):
```yaml
---
title: "My Prompt"
description: "..."
tags: ["tag1", "tag2"]
favorite: true  # ← Updated via IPC when user toggles star
---
```

**Persistence Flow**:
```
User clicks star (renderer)
  ↓
Debounced update (300ms)
  ↓
IPC call: window.electronAPI.invoke('prompt:update', { id, metadata: { favorite: true } })
  ↓
Main process: FileService.updatePromptMetadata(path, metadata)
  ↓
YAML front matter updated in markdown file
  ↓
File watcher detects change → Zustand store updated
```

---

## Data Flow

### Unified LLM Settings Flow

```
User opens Settings Modal
  ↓
Load unified config from main process via IPC
  ↓
Display in single-column layout:
  - Provider dropdown (top)
  - LLM Call Settings section (model + timeout)
  - Title Generation Settings section (enabled + model + timeout)
  ↓
User modifies values
  ↓
Real-time validation (inline errors)
  ↓
User clicks Save
  ↓
Validate all fields (prevent save if invalid)
  ↓
IPC call: window.electronAPI.invoke('llm:unified-config:save', config)
  ↓
Main process: Validate + Persist to file system
  ↓
Success: Update Zustand store + Show toast
OR
Failure: Show error notification (no optimistic update for settings)
```

### Favorite Toggle Flow

```
User views prompt list
  ↓
All prompt cards display star icon (filled if favorited, empty if not)
  ↓
User clicks star on non-favorited prompt
  ↓
Optimistic update: Star becomes filled immediately
  ↓
Debounce timer starts (300ms)
  ↓
After 300ms: IPC call to persist change
  ↓
Success: No visible change (already optimistically updated)
OR
Failure: Rollback star to empty + Show error notification
```

---

## Indexes and Queries

### Favorite Filtering (Existing - No Changes)

**Query**: Filter prompts by favorite status

```typescript
// Zustand store (existing logic preserved)
getFavoritePrompts(): PromptFileInfo[] {
  return prompts.filter(p => p.metadata.favorite === true);
}
```

**Index**: No database index needed (in-memory filtering of loaded prompts)

---

## Validation Summary

### Unified LLM Config

**Required Fields**:
- Provider (non-empty)
- LLM call model (non-empty string)
- LLM call timeout (1-999 integer)
- Title generation model (non-empty string)
- Title generation timeout (1-999 integer)

**Validation Triggers**:
- On input change (real-time feedback)
- Before save (hard constraint - cannot save invalid config)

### Favorite Toggle

**No Validation Needed**:
- Boolean toggle (always valid)
- Prompt ID validated by IPC layer (must exist)

---

## Migration Path

### Version 1 → Version 2 (Unified Config)

**Trigger**: First app launch after update to version with unified config

**Steps**:
1. Check if `llm-unified.json` exists
   - If yes: Load and use (already migrated)
   - If no: Proceed with migration
2. Read existing `llm-provider.json` and `title-generation.json`
3. Merge into `UnifiedLLMConfig` structure
4. Apply default values for missing fields
5. Validate merged config
6. Write to `llm-unified.json`
7. Delete old config files
8. Update app state to use unified config

**Rollback Strategy**:
- Keep old config files as `.backup` until user confirms new settings work
- User can manually restore from backup if needed

---

## Summary

**New Entities**: 
- `UnifiedLLMConfig` (consolidates existing separate configs)
- `FavoriteToggleState` (UI state tracking)

**Modified Entities**:
- None (existing types preserved)

**Removed Entities**:
- Separate `LLMProviderConfig` for title generation (merged into unified)

**Persistence Changes**:
- New unified config file replaces two separate files
- Migration logic required for smooth transition

**All data structures ready for contract definition and implementation.**
