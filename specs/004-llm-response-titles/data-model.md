# Data Model: Automatic LLM Response Title Generation

**Feature**: 004-llm-response-titles  
**Phase**: 1 (Design)  
**Date**: 2025-11-25

## Overview

This feature extends existing LLM response metadata to include automatically generated titles. The data model maintains backward compatibility with existing responses while adding optional title fields.

## Entities

### 1. TitleGenerationConfig (NEW)

**Purpose**: User preferences for title generation feature

**Storage**: 
- Primary: `useLLMStore` (Zustand, renderer process)
- Persistence: User settings (existing settings system)

**Attributes**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | `true` | Whether title generation is enabled |
| `selectedModel` | string | Yes | (same as main model) | Model ID to use for title generation |
| `selectedProvider` | LLMProviderType | Yes | (same as main provider) | Provider to use for title generation |
| `timeoutSeconds` | number | Yes | `30` | Timeout for title generation in seconds |

**TypeScript Definition**:
```typescript
// src/shared/types/llm.ts
export interface TitleGenerationConfig {
  enabled: boolean;
  selectedModel: string;
  selectedProvider: LLMProviderType;
  timeoutSeconds: number;
}
```

**Validation Rules**:
- `enabled`: boolean (no validation needed)
- `selectedModel`: Must be non-empty string if provider requires model
- `selectedProvider`: Must be one of: 'ollama', 'openai', 'azure_openai', 'gemini'
- `timeoutSeconds`: Must be between 10 and 120 seconds (inclusive)

**State Transitions**: N/A (configuration object, no lifecycle)

**Relationships**:
- Used by TitleGenerationService to determine generation behavior
- Stored in useLLMStore alongside other LLM configuration

---

### 2. LLMResponseMetadata (EXTENDED)

**Purpose**: Metadata for LLM responses, extended to include title information

**Storage**:
- Primary: SQLite database (`llm_responses` table via LLMStorageService)
- Secondary: Markdown file frontmatter (via FileService)

**Existing Attributes** (not changing):
- `id`: string (UUID)
- `promptId`: string
- `provider`: LLMProviderType
- `model`: string
- `parameters`: Record<string, string>
- `createdAt`: number (Unix timestamp)
- `responseTimeMs`: number (optional)
- `tokenUsage`: object (optional)
- `costEstimate`: number (optional)
- `status`: LLMRequestStatus
- `filePath`: string
- `errorCode`: string (optional)
- `errorMessage`: string (optional)

**NEW Attributes**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `generatedTitle` | string | No | undefined | The generated title (5-8 words, max 150 chars) |
| `titleGenerationStatus` | TitleGenerationStatus | No | undefined | Status of title generation |
| `titleGeneratedAt` | number | No | undefined | Unix timestamp when title was generated |
| `titleModel` | string | No | undefined | Model used to generate the title |

**TypeScript Definition**:
```typescript
// src/shared/types/llm.ts

export type TitleGenerationStatus = 'pending' | 'completed' | 'failed';

export interface LLMResponseMetadata {
  // ... existing fields ...
  
  // Title generation (optional for backward compatibility)
  generatedTitle?: string;
  titleGenerationStatus?: TitleGenerationStatus;
  titleGeneratedAt?: number;
  titleModel?: string;
}
```

**Validation Rules**:
- `generatedTitle`: If present, must be 1-150 characters. Truncated to 100 chars for UI display with ellipsis.
- `titleGenerationStatus`: If present, must be one of: 'pending', 'completed', 'failed'
- `titleGeneratedAt`: If present, must be valid Unix timestamp (>0)
- `titleModel`: If present, must be non-empty string
- **Invariant**: If `generatedTitle` is set, `titleGenerationStatus` must be 'completed'
- **Invariant**: If `titleGenerationStatus` is 'completed', `titleGeneratedAt` must be set

**State Transitions**:
```
[No title fields]  →  titleGenerationStatus: 'pending'
                   →  titleGenerationStatus: 'completed' + generatedTitle set
                   →  titleGenerationStatus: 'failed' (fallback to model name)
```

State transition details:
1. **Initial**: Response saved without title fields (backward compatible)
2. **Pending**: Title generation started, UI shows loading indicator
3. **Completed**: Title generated successfully, UI shows title
4. **Failed**: Title generation failed (timeout, error), UI shows model name fallback

**Relationships**:
- One LLMResponseMetadata per LLM response
- Title generated using TitleGenerationConfig settings
- Stored in both SQLite and markdown for hybrid pattern

---

### 3. TitleGenerationRequest (Internal)

**Purpose**: Internal request object for title generation (not persisted)

**Storage**: In-memory only (during title generation process)

**Attributes**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `responseId` | string | Yes | ID of the response to generate title for |
| `responseContent` | string | Yes | First ~500 chars of response content |
| `config` | TitleGenerationConfig | Yes | Title generation configuration |
| `timestamp` | number | Yes | When title generation was requested |

**TypeScript Definition**:
```typescript
// src/main/services/TitleGenerationService.ts (internal type)
interface TitleGenerationRequest {
  responseId: string;
  responseContent: string;
  config: TitleGenerationConfig;
  timestamp: number;
}
```

**Validation Rules**:
- `responseId`: Must be valid UUID matching an existing response
- `responseContent`: Must be non-empty string (1-500 chars used for generation)
- `config`: Must pass TitleGenerationConfig validation
- `timestamp`: Must be valid Unix timestamp

**State Transitions**: N/A (transient object, lifetime = duration of title generation)

**Relationships**:
- Created by TitleGenerationService when title generation starts
- References existing LLMResponseMetadata by responseId
- Used to call LLM provider with title generation prompt

---

## Database Schema

### SQLite Schema Changes

**Table**: `llm_responses` (existing table, add columns)

```sql
-- Add title-related columns (all nullable for backward compatibility)
ALTER TABLE llm_responses ADD COLUMN generated_title TEXT;
ALTER TABLE llm_responses ADD COLUMN title_generation_status TEXT CHECK(title_generation_status IN ('pending', 'completed', 'failed'));
ALTER TABLE llm_responses ADD COLUMN title_generated_at INTEGER;
ALTER TABLE llm_responses ADD COLUMN title_model TEXT;

-- Index for querying by title generation status (optional, for future bulk operations)
CREATE INDEX IF NOT EXISTS idx_llm_responses_title_status ON llm_responses(title_generation_status);
```

**Migration Strategy**: 
- Schema changes are additive (ALTER TABLE ADD COLUMN)
- No migration script needed for existing data
- Existing rows will have NULL values for new columns (backward compatible)
- Application handles NULL as "no title generated yet"

---

## Markdown Schema Changes

### Frontmatter Structure

**Before** (existing):
```yaml
---
id: abc-123
provider: ollama
model: gemma3:1b
created_at: 1732499000
response_time_ms: 1234
token_usage:
  prompt: 19
  completion: 145
  total: 164
status: completed
---

Response content here...
```

**After** (with title):
```yaml
---
id: abc-123
provider: ollama
model: gemma3:1b
created_at: 1732499000
response_time_ms: 1234
token_usage:
  prompt: 19
  completion: 145
  total: 164
status: completed
generated_title: "React Component Best Practices Guide"  # NEW
title_generation_status: completed  # NEW
title_generated_at: 1732499500  # NEW
title_model: gemma3:1b  # NEW
---

Response content here...
```

**Parsing Strategy**:
- FileService already parses YAML frontmatter using js-yaml
- New fields are optional (existing responses continue to work)
- When reading: If title fields missing, treat as undefined
- When writing: Only include title fields if they exist

---

## Data Flow

### Title Generation Flow

```
1. Main LLM response completes
   ↓
2. TitleGenerationService.generateTitle(responseId, responseContent)
   ↓
3. Create TitleGenerationRequest (internal)
   ↓
4. Update response: titleGenerationStatus = 'pending'
   - SQLite: UPDATE llm_responses SET title_generation_status = 'pending'
   - IPC: Notify renderer → Update useLLMStore
   ↓
5. Call LLM provider with title generation prompt
   - Use config.selectedProvider and config.selectedModel
   - Timeout after config.timeoutSeconds
   ↓
6a. Success:
   - Update response: titleGenerationStatus = 'completed', generatedTitle = title
   - SQLite: UPDATE llm_responses SET generated_title = ?, title_generation_status = 'completed', title_generated_at = ?, title_model = ?
   - Markdown: Update frontmatter with title fields
   - IPC: Notify renderer → Update useLLMStore
   ↓
6b. Failure (timeout or error):
   - Update response: titleGenerationStatus = 'failed'
   - SQLite: UPDATE llm_responses SET title_generation_status = 'failed'
   - Log error (console.error)
   - IPC: Notify renderer → Update useLLMStore (loading indicator removed)
```

### UI Data Flow

```
1. User makes LLM call
   ↓
2. Response displayed immediately (existing flow, unchanged)
   ↓
3. Title generation starts (background)
   - useLLMStore.setTitleLoading(responseId, true)
   - ResponseListItem shows loading spinner
   ↓
4a. Title completes:
   - useLLMStore.updateResponseTitle(responseId, title)
   - useLLMStore.setTitleLoading(responseId, false)
   - ResponseListItem shows title prominently, model name as secondary
   ↓
4b. Title fails:
   - useLLMStore.setTitleLoading(responseId, false)
   - ResponseListItem shows model name only (fallback)
```

---

## Validation and Constraints

### Data Integrity Rules

1. **Title Length**: Stored title ≤ 150 chars, displayed title ≤ 100 chars (truncated with "...")
2. **Status Consistency**: If `generatedTitle` exists, `titleGenerationStatus` must be 'completed'
3. **Timestamp Validity**: `titleGeneratedAt` must be ≥ `createdAt` (title generated after response)
4. **Model Reference**: `titleModel` should reference an existing model (soft constraint, not enforced)

### Backward Compatibility

- **Reading**: Responses without title fields work normally (title fields are optional)
- **Display**: UI shows model name when `generatedTitle` is missing
- **Storage**: SQLite and markdown schemas support NULL/missing values
- **No Migration**: Existing responses don't need updates, title generated on next user interaction (future enhancement)

### Performance Considerations

- **Index on status**: `idx_llm_responses_title_status` for bulk operations (future: "regenerate all titles")
- **Truncation Strategy**: Truncate at word boundary for display, not mid-word
- **Query Optimization**: Title field included in response list query (no additional query needed)

---

## Testing Strategy

### Data Validation Tests
- Title length constraints (1-150 chars for storage, truncate >100 for display)
- Status transitions (undefined → pending → completed/failed)
- Timestamp ordering (titleGeneratedAt ≥ createdAt)

### Storage Integration Tests
- SQLite: Insert/update with title fields
- Markdown: Parse/write frontmatter with title fields
- Backward compatibility: Read responses without title fields

### Type Safety Tests
- TypeScript compilation with strict mode
- Runtime type guards for title fields (optional field handling)

---

**Status**: Data model complete. All entities defined with attributes, validation rules, and relationships. Ready for contract definition (IPC channels).
