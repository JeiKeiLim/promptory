# Missing Implementation Details: LLM Integration

**Date**: 2025-01-XX  
**Status**: Critical gaps identified  
**Purpose**: Document all missing implementations per spec requirements

---

## 🔴 CRITICAL - Missing Core Features

### 1. Markdown Frontmatter (Data Model Violation) ✅ FIXED

**Spec Requirement**: `data-model.md` lines 293-336 specifies YAML frontmatter format:
```markdown
---
id: response-id-123abc
prompt_id: prompt-456def
provider: ollama
model: llama2
created_at: 2025-11-19T10:30:00.000Z
response_time_ms: 3452
parameters:
  name: John Doe
  topic: TypeScript
token_usage:
  prompt: 45
  completion: 312
  total: 357
cost_estimate: 0.00042
status: completed
prompt: |
  [Full substituted prompt content here, using YAML literal block scalar]
---

# LLM Response

[content here]
```

**Implementation**: ✅ **COMPLETED**
- ✅ YAML frontmatter generation with all metadata
- ✅ **Full prompt stored in frontmatter** using YAML literal block scalar (`|`) to preserve formatting
- ✅ Frontmatter parsing when reading files (`getResponseContent()`)
- ✅ Metadata duplication in file (for transparency per spec)
- ✅ Backward compatibility: falls back to raw content if frontmatter parsing fails

**Files Updated**:
- `src/main/services/LLMStorageService.ts` - `formatFrontmatter()`, `saveResponseContent()`, `getResponseContent()`
- `src/main/handlers/llmHandlers.ts` - Updated to pass `promptContent` to `saveResponseContent()`

---

### 2. FR-019: Loading Indicator with Elapsed Time Counter

**Spec Requirement**: 
> System MUST show loading indicator during API call with elapsed time counter in the side panel result list (format: "MM:SS" or "Xm Ys" - implementation choice)

**Current State**:
- ✅ `elapsedMs` exists in `useLLMStore` (`currentRequest.elapsedMs`)
- ✅ `LLM_REQUEST_PROGRESS` event emits `elapsedMs`
- ❌ **NO UI displaying this during processing**
- ❌ Side panel only shows **completed** responses, not in-progress ones

**Missing**:
- ❌ In-progress request item in side panel list
- ❌ Elapsed time counter display (MM:SS or Xm Ys format)
- ❌ Loading spinner/indicator for in-progress requests

**Files to Fix**:
- `src/renderer/components/llm/LLMResponsePanel.tsx` - Add in-progress request display
- `src/renderer/hooks/useLLMEvents.ts` - Update store with elapsed time

---

### 3. FR-020: Cancel Individual In-Progress API Calls

**Spec Requirement**:
> System MUST allow users to cancel individual in-progress API calls from the side panel

**Current State**:
- ✅ `LLM_CANCEL` IPC handler exists
- ✅ `CancelLLMRequest` interface defined
- ❌ **NO UI button** in side panel to cancel individual requests

**Missing**:
- ❌ Cancel button on in-progress request items
- ❌ Handler in `LLMResponsePanel` to call `LLM_CANCEL`

**Files to Fix**:
- `src/renderer/components/llm/LLMResponsePanel.tsx` - Add cancel button for in-progress items

---

### 4. FR-021: Queue Position Display

**Spec Requirement**:
> System MUST process LLM API calls sequentially in FIFO queue order (one at a time) while ParameterInputModal remains interactive, **displaying queue position for pending requests**

**Current State**:
- ✅ Sequential queue processing works
- ✅ Queue size is tracked
- ❌ **NO queue position displayed** (e.g., "2 of 3")

**Missing**:
- ❌ Queue position calculation (position in queue)
- ❌ UI display of position (e.g., "Position: 2 of 3" or "2/3")

**Files to Fix**:
- `src/main/handlers/llmHandlers.ts` - Include position in queue events
- `src/renderer/components/llm/LLMResponsePanel.tsx` - Display position for pending requests

---

### 5. FR-030: Cost Estimate Display

**Spec Requirement**:
> System MUST display token usage and estimated cost (when available from provider) after each API call in side panel result items and expanded response view

**Current State**:
- ✅ Token usage displayed in side panel
- ✅ `costEstimate` stored in SQLite
- ❌ **Cost estimate NOT displayed** in UI

**Missing**:
- ❌ Cost display in `LLMResponsePanel` result items
- ❌ Cost display in full response view

**Files to Fix**:
- `src/renderer/components/llm/LLMResponsePanel.tsx` - Add cost display
- `src/renderer/components/prompt/ParameterInputModal.tsx` - Add cost in full view

---

### 6. Per-Prompt Response Limit (1000)

**Spec Requirement**: `data-model.md` lines 505-509:
> **Per-prompt limit**: 1000 responses max
> - When saving new response for prompt
> - Count existing responses for that prompt
> - If ≥1000, delete oldest (by created_at)
> - Delete both SQLite entry and .md file

**Current State**:
- ❌ **NO limit enforcement** implemented
- ❌ No cleanup of oldest responses

**Missing**:
- ❌ `enforcePromptLimit()` method in `LLMStorageService`
- ❌ Call this method before saving new response

**Files to Fix**:
- `src/main/services/LLMStorageService.ts` - Add `enforcePromptLimit()` method
- `src/main/handlers/llmHandlers.ts` - Call before saving response

---

## 🟡 MEDIUM - Missing UI/UX Enhancements

### 7. In-Progress Request Display in Side Panel

**Issue**: Side panel only shows completed responses. In-progress requests are invisible.

**Missing**:
- ❌ Display current request in side panel list
- ❌ Show "Processing..." status with elapsed time
- ❌ Allow cancel from side panel

**Files to Fix**:
- `src/renderer/components/llm/LLMResponsePanel.tsx` - Merge in-progress requests into list

---

### 8. Queue Position in Response Items

**Issue**: When a request is queued, user can't see their position.

**Missing**:
- ❌ Show "Queued: Position 2 of 3" in side panel
- ❌ Update position as queue processes

**Files to Fix**:
- `src/renderer/components/llm/LLMResponsePanel.tsx` - Add queue position display

---

## ✅ VERIFIED - Correctly Implemented

1. ✅ **FR-040**: Token limit validation (80% threshold) - `TokenCounter.ts` line 112
2. ✅ **FR-044**: Mark pending as cancelled on quit - `cleanupOnQuit()` implemented
3. ✅ **FR-035**: Real-time file existence checks - `listResponseMetadata()` implemented
4. ✅ **FR-036**: Background cleanup on app start - `cleanupOrphanedEntries()` implemented
5. ✅ **FR-030**: Token usage display - Shown in side panel
6. ✅ **FR-037**: Individual delete button - Implemented
7. ✅ **FR-038**: Clear All Results button - Implemented
8. ✅ **FR-041**: Markdown formatting preserved - Using `marked` library

---

## Summary

| Priority | Missing Feature | Spec Reference | Impact |
|----------|----------------|-----------------|--------|
| 🔴 CRITICAL | Markdown frontmatter | data-model.md:293-336 | Violates transparency principle |
| 🔴 CRITICAL | Loading indicator + elapsed time | FR-019 | Core UX requirement |
| 🔴 CRITICAL | Cancel individual requests | FR-020 | Core functionality |
| 🔴 CRITICAL | Queue position display | FR-021 | User feedback |
| 🔴 CRITICAL | Cost estimate display | FR-030 | Incomplete feature |
| 🔴 CRITICAL | 1000 response limit | data-model.md:505-509 | Performance requirement |
| 🟡 MEDIUM | In-progress display in panel | UX enhancement | Better visibility |

---

## Next Steps

1. **Immediate**: Fix markdown frontmatter (critical for transparency)
2. **High Priority**: Add loading indicator with elapsed time (FR-019)
3. **High Priority**: Add cancel individual button (FR-020)
4. **High Priority**: Add queue position display (FR-021)
5. **High Priority**: Add cost estimate display (FR-030)
6. **High Priority**: Implement 1000 response limit (data-model.md)

---

**Total Missing**: 6 critical features, 2 medium enhancements

