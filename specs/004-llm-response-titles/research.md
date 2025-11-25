# Research: Automatic LLM Response Title Generation

**Feature**: 004-llm-response-titles  
**Phase**: 0 (Research)  
**Date**: 2025-11-25

## Research Goals

Resolve all technical unknowns and research best practices for:
1. Title generation prompt engineering
2. Sequential execution model integration with RequestQueue
3. Title storage in hybrid pattern (SQLite + markdown)
4. UI loading states and real-time updates
5. Multi-language title generation

## Decision 1: Title Generation Prompt Strategy

**Context**: Need to craft LLM prompts that reliably produce 5-8 word titles from response content

**Decision**: Use system prompt with strict formatting instructions and first ~500 characters of response content

**Rationale**:
- System prompts provide consistent formatting guidance across all providers
- 500 characters captures enough context (typically 2-4 paragraphs) without token waste
- Explicit word count constraint (5-8 words) in prompt reduces need for post-processing
- Multi-language support via "Generate title in the same language as the content" instruction

**Prompt Template**:
```typescript
const systemPrompt = `You are a title generator. Generate a concise, descriptive title for the given text.
Rules:
- Title must be 5-8 words
- Use the same language as the input text
- Be specific and descriptive
- No quotation marks or special formatting
- Output only the title, nothing else`;

const userPrompt = `Generate a title for this text:\n\n${responseContent.slice(0, 500)}`;
```

**Alternatives Considered**:
- Full response content → Rejected: Wastes tokens, increases latency, no quality improvement
- Zero-shot without system prompt → Rejected: Inconsistent formatting, requires post-processing
- Template-based (no LLM) → Rejected: Poor quality for varied content, no semantic understanding

**Implementation Notes**:
- Truncate to 500 chars at word boundary (don't cut mid-word)
- Handle responses <500 chars (use full content)
- For short responses (<20 words), use response text itself as fallback if title generation fails

---

## Decision 2: Sequential Execution Model

**Context**: Title generation must happen after main LLM response, blocking next queued call but not current response display

**Decision**: Extend RequestQueue with post-processing hooks that execute before dequeue

**Rationale**:
- RequestQueue already handles concurrency limiting (default: 3 concurrent requests)
- Post-processing hook pattern allows title generation to be part of request lifecycle
- Blocking next dequeue ensures sequential execution (LLM #1 → title #1 → LLM #2)
- Main response display happens immediately on completion (before title generation starts)

**Integration Points**:
```typescript
// In RequestQueue.ts
interface RequestQueueItem {
  request: LLMRequest;
  postProcessing?: () => Promise<void>;  // NEW: Optional post-processing
}

// After main request completes:
await item.postProcessing?.();  // Title generation happens here
this.dequeue();  // Next request starts only after post-processing
```

**Flow Diagram**:
```
User clicks "Send" (3 queued requests)
  ↓
[Queue]: Request #1 executing
  ↓
Main LLM call completes → Response displayed (UI shows immediately)
  ↓
Title generation starts (loading indicator on history item)
  ↓
Title generation completes → Update UI with title
  ↓
[Queue]: Request #2 can now start (sequential enforcement)
```

**Alternatives Considered**:
- Separate title generation queue → Rejected: Adds complexity, harder to ensure sequential execution, user sees confusing separate counts
- Fire-and-forget (no blocking) → Rejected: User explicitly requested sequential execution to prevent overwhelming
- Parallel title generation → Rejected: Doesn't meet requirement for sequential execution

**Implementation Notes**:
- Title generation timeout (30s) doesn't block forever - if timeout occurs, dequeue proceeds
- Failed title generation doesn't prevent dequeue (silent failure with fallback)
- Post-processing hook approach keeps RequestQueue reusable for future features

---

## Decision 3: Title Storage in Hybrid Pattern

**Context**: Need to store titles in both SQLite (fast queries) and markdown (human readable)

**Decision**: Extend existing LLMResponseMetadata interface and persist via existing services

**Rationale**:
- Hybrid storage pattern already established for LLM responses
- LLMStorageService handles SQLite operations, FileService handles markdown
- Zero breaking changes - adding optional fields to existing metadata
- Consistent with codebase architecture

**Schema Extensions**:

**SQLite (via LLMStorageService)**:
```sql
-- Add columns to existing llm_responses table
ALTER TABLE llm_responses ADD COLUMN generated_title TEXT;
ALTER TABLE llm_responses ADD COLUMN title_generation_status TEXT; -- 'pending' | 'completed' | 'failed'
ALTER TABLE llm_responses ADD COLUMN title_generated_at INTEGER;
ALTER TABLE llm_responses ADD COLUMN title_model TEXT;
```

**Markdown frontmatter (via FileService)**:
```yaml
---
id: abc-123
provider: ollama
model: gemma3:1b
generated_title: "React Component Best Practices"  # NEW
title_generation_status: completed  # NEW
title_generated_at: 1732500000  # NEW
title_model: gemma3:1b  # NEW
created_at: 1732499000
---
```

**TypeScript Types**:
```typescript
// Extend src/shared/types/llm.ts
export interface LLMResponseMetadata {
  // ... existing fields ...
  
  // Title generation (optional - legacy responses won't have these)
  generatedTitle?: string;
  titleGenerationStatus?: 'pending' | 'completed' | 'failed';
  titleGeneratedAt?: number;
  titleModel?: string;
}
```

**Alternatives Considered**:
- Separate title table → Rejected: Overkill for 4 fields, complicates queries, breaks hybrid pattern
- Title in response content → Rejected: Harder to query, parse complexity, not in frontmatter
- SQLite only (no markdown) → Rejected: Breaks human-readable requirement and hybrid pattern

**Implementation Notes**:
- All fields optional for backward compatibility
- Existing responses without titles continue to work (fallback to model name display)
- Migration not needed - schema changes are additive

---

## Decision 4: UI Loading States and Real-Time Updates

**Context**: Need to show loading indicator during title generation and update UI when complete

**Decision**: Use Zustand store with reactive updates + loading state per response ID

**Rationale**:
- Zustand already used for LLM state management (useLLMStore)
- React components automatically re-render on state changes
- Loading state tracked per response ID (Map<responseId, boolean>)
- IPC updates from main process trigger store updates

**State Management**:
```typescript
// In useLLMStore.ts
interface LLMStore {
  responses: LLMResponseMetadata[];
  titleGenerationLoading: Map<string, boolean>;  // NEW
  
  updateResponseTitle: (responseId: string, title: string) => void;  // NEW
  setTitleLoading: (responseId: string, loading: boolean) => void;  // NEW
}
```

**UI Component Pattern**:
```typescript
// In ResponseListItem.tsx
const ResponseListItem = ({ response }) => {
  const { titleGenerationLoading } = useLLMStore();
  const isLoading = titleGenerationLoading.get(response.id);
  
  return (
    <div>
      {isLoading ? (
        <LoadingSpinner size="sm" />
      ) : null}
      <h3>{response.generatedTitle || response.model}</h3>
      <p className="text-sm text-gray-500">{response.model}</p>
    </div>
  );
};
```

**Alternatives Considered**:
- Polling for updates → Rejected: Inefficient, adds unnecessary load
- WebSocket/SSE → Rejected: Overkill for simple updates, IPC already available
- Component-local state → Rejected: Loading state needs to be shared across components

**Implementation Notes**:
- Loading indicator appears immediately when title generation starts
- Title appears with smooth transition when ready (CSS animation)
- Failed title generation removes loading indicator, shows model name (no error to user)

---

## Decision 5: Multi-Language Title Generation

**Context**: Need to generate titles in same language as response content (Korean, Japanese, Spanish, etc.)

**Decision**: Include language instruction in system prompt, rely on LLM auto-detection

**Rationale**:
- Modern LLMs (GPT-4, Gemini, Llama 3) reliably detect input language
- Explicit instruction "Use the same language as the input text" in system prompt
- No need for separate language detection step (reduces complexity and latency)
- Works across all supported providers (Ollama, OpenAI, Gemini)

**Implementation**:
```typescript
// System prompt already includes:
// "Use the same language as the input text"

// No additional language detection or handling needed
```

**Testing Strategy**:
- Integration tests with Korean, Japanese, Spanish, English samples
- Verify title is in same language as input
- Fallback behavior: If title is in wrong language, still usable (not critical failure)

**Alternatives Considered**:
- Explicit language detection library → Rejected: Adds dependency, latency, not needed
- Language code in configuration → Rejected: User shouldn't need to specify, auto-detection sufficient
- English-only titles → Rejected: Poor UX for non-English users, explicit requirement to support multi-language

**Implementation Notes**:
- If LLM returns title in wrong language, user can still understand from response content
- Language detection accuracy >95% for major languages (based on LLM capabilities)
- Edge case: Mixed-language responses use primary language (LLM handles this naturally)

---

## Best Practices Summary

### TDD Approach
1. **RED**: Write failing tests for TitleGenerationService first
2. **GREEN**: Implement minimal service to pass tests
3. **REFACTOR**: Extract prompt templates, add error handling
4. Repeat for each component (IPC handlers, UI components, hooks)

### Error Handling
- Timeout after 30s (configurable)
- Silent failure with fallback to model name
- Log errors for debugging but don't surface to user
- Failed title generation doesn't prevent response access

### Performance Optimization
- Truncate response content to 500 chars (reduces token usage)
- Reuse existing RequestQueue concurrency limiting
- Cache title in both SQLite and markdown (no regeneration on restart)
- Lazy loading: Only generate titles for visible responses if needed (future optimization)

### Code Organization
- Service layer: TitleGenerationService (main process)
- IPC layer: Extend llmHandlers.ts with title generation endpoints
- UI layer: ResponseListItem component shows title with loading state
- State: Extend useLLMStore with title-specific state
- Types: Extend llm.ts with title fields (optional for backward compatibility)

---

## Open Questions (Resolved)

1. **Q**: How to handle title generation for existing responses without titles?
   **A**: Display model name (fallback), no regeneration. Future enhancement: "Regenerate titles for all" button.

2. **Q**: Should title generation respect same concurrency limit as main requests?
   **A**: No, title generation is part of parent request's post-processing. Concurrency limit applies to main requests only.

3. **Q**: What if user quits app during title generation?
   **A**: On restart, response has `titleGenerationStatus: 'pending'`. Service can optionally resume (future enhancement) or mark as failed.

4. **Q**: How to test title generation without calling real LLM APIs?
   **A**: Mock provider responses in integration tests, use test fixtures for title generation prompt responses.

---

## Implementation Priorities

**Phase 1 (P1 - MVP)**:
1. TitleGenerationService with basic prompt template
2. Extend LLMResponseMetadata with title fields
3. Integrate with RequestQueue post-processing
4. UI loading states and title display
5. Tests for all above

**Phase 2 (P2 - Configuration)**:
1. Settings UI for title generation config
2. Model selection for title generation
3. Enable/disable toggle
4. Timeout configuration

**Phase 3 (P3 - Polish)**:
1. Graceful failure handling refinement
2. Visual indicator for auto-titled vs fallback
3. Multi-language testing and refinement
4. Performance optimization if needed

---

**Status**: Research complete. All technical unknowns resolved. Ready for Phase 1 (Design & Contracts).
