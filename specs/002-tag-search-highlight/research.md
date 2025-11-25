# Research: Tag Search Highlighting

**Feature**: 002-tag-search-highlight  
**Date**: 2025-11-18  
**Status**: Completed

## Overview

This document consolidates research findings and technical decisions for implementing tag highlighting in search results. The feature extends the existing search highlighting pattern to include tags across multiple UI contexts.

## Research Questions & Findings

### Q1: How does the current search highlighting work?

**Finding**: The existing implementation in `MainContent.tsx` uses a `highlightMatch` function:

```typescript
const highlightMatch = useCallback((text: string, query: string) => {
  const highlightEnabled = settings.search?.highlightMatches !== false;
  if (!query || !isSearchActive || !highlightEnabled) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
        {part}
      </mark>
    ) : part
  );
}, [isSearchActive, settings.search]);
```

**Key Observations**:
- Case-insensitive matching (`gi` flag)
- Respects `highlightMatches` user setting
- Returns React elements (not string)
- Uses Tailwind classes: `bg-yellow-200 text-yellow-900`
- Only active when `isSearchActive` is true

**Decision**: Reuse this pattern for tag highlighting with additional checks for search scope.

---

### Q2: How are tags currently displayed in different contexts?

**Finding**: Tags appear in three distinct rendering patterns:

#### 1. List View (MainContent.tsx) - Plain Text
```typescript
{prompt.metadata.tags.length > 0 && (
  <>
    <span className="mx-2">•</span>
    <span>{prompt.metadata.tags.slice(0, 2).join(', ')}</span>
    {prompt.metadata.tags.length > 2 && (
      <span> +{prompt.metadata.tags.length - 2}</span>
    )}
  </>
)}
```

**Rendering**: Comma-separated string (e.g., "API, REST +2")

#### 2. Detail View (PromptDetail.tsx) - Badge Components
```typescript
{currentPrompt.metadata.tags.map((tag) => (
  <span
    key={tag}
    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
  >
    {tag}
  </span>
))}
```

**Rendering**: Individual blue badges for each tag

#### 3. Editor View (PromptEditor.tsx) - Interactive Badges
```typescript
{tags.map((tag) => (
  <span
    key={tag}
    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
  >
    #{tag}
    <button
      type="button"
      onClick={() => setTags(tags.filter(t => t !== tag))}
      className="ml-1 text-blue-600 hover:text-blue-800"
    >
      ×
    </button>
  </span>
))}
```

**Rendering**: Blue badges with remove button (includes # prefix)

#### 4. Sidebar (Sidebar.tsx) - Clickable Filter Buttons
```typescript
<button
  key={tag.name}
  onClick={() => setFilter('tag', tag.name)}
  className={`w-full text-left px-3 py-1 rounded text-sm transition-colors ${
    currentFilter.type === 'tag' && currentFilter.value === tag.name
      ? 'bg-green-100 text-green-800'
      : 'text-gray-600 hover:bg-gray-100'
  }`}
>
  #{tag.name} ({tag.count})
</button>
```

**Rendering**: Clickable buttons with # prefix and count

**Decision**: Create a flexible highlighting utility that can handle both string output (for plain text) and React element output (for badges).

---

### Q3: How to preserve click functionality in clickable tags?

**Finding**: The highlighted `<mark>` element should be nested inside clickable elements, not wrapping them.

**Pattern**:
```typescript
// ✅ CORRECT - highlight is child of button
<button onClick={handleClick}>
  {highlightText(tag, query)}
</button>

// ❌ WRONG - highlight wraps button, breaks click
{highlightText(<button>{tag}</button>, query)}
```

**Decision**: Apply highlighting to the text content before it's placed inside the button/span element.

---

### Q4: When should tag highlighting be active?

**Finding**: Multiple conditions must be met:

1. **Search is active**: `isSearchActive === true`
2. **Highlight setting enabled**: `settings.search?.highlightMatches !== false`
3. **Tag search scope enabled**: `settings.search?.searchScope?.tags !== false`
4. **Query is not empty**: `query.trim().length > 0`

**Rationale**:
- If tag search is disabled in scope, tags weren't used for matching → don't highlight
- Respects existing user preference for highlighting
- Prevents highlighting when search is cleared

**Decision**: Create a centralized function to check all conditions before applying highlights.

---

### Q5: How to handle special characters in search queries?

**Finding**: The current regex approach in `highlightMatch` doesn't escape special characters. This could cause regex errors with queries like `"test()"` or `"api.endpoint"`.

**Best Practice**: Escape regex special characters before creating the RegExp.

**Decision**: Add regex escaping utility:
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Alternative Considered**: Use simple string indexOf approach instead of regex.
**Rejected Because**: Regex provides case-insensitive matching and better performance for multiple matches.

---

### Q6: Performance considerations for highlighting tags

**Finding**: Tag highlighting happens on every render when search is active. Need to ensure it doesn't impact performance.

**Existing Optimizations**:
- Search has 300ms debounce in SearchBar component
- `highlightMatch` is wrapped in `useCallback` with dependencies

**Additional Optimizations Needed**:
- Memoize tag highlighting results per tag+query combination
- Avoid re-rendering tags that haven't changed

**Decision**: 
1. Create `useCallback` wrapped highlighting function
2. Use `React.memo` for tag components if needed
3. Rely on existing search debounce (no additional debouncing)

---

## Technology Decisions

### Decision 1: Create Shared Highlighting Utility

**Chosen**: Create `src/renderer/utils/tagHighlighter.ts` with reusable functions

**Rationale**:
- DRY principle - avoid duplicating highlighting logic across 4+ components
- Easier to test in isolation
- Consistent behavior across all contexts

**Interface**:
```typescript
interface HighlightOptions {
  query: string;
  caseSensitive?: boolean;
  highlightClassName?: string;
}

/**
 * Highlights matching text within a string
 * Returns array of React elements (text and <mark> elements)
 */
export function highlightText(
  text: string,
  query: string,
  className?: string
): React.ReactNode[];

/**
 * Checks if highlighting should be applied
 * Based on search state, user settings, and search scope
 */
export function shouldHighlightTags(
  isSearchActive: boolean,
  settings: AppSettings,
  query: string
): boolean;
```

**Alternative Considered**: Extend existing `highlightMatch` function in MainContent.tsx  
**Rejected Because**: Would create tight coupling and make it harder to reuse across components

---

### Decision 2: Yellow Highlight Style (Consistent with Existing)

**Chosen**: Use `bg-yellow-200 text-yellow-900` matching title/description highlighting

**Rationale**:
- Visual consistency - all search matches use same color
- Reduces cognitive load - user learns "yellow = match"
- Already tested and accessible color combination

**Alternative Considered**: Different color (e.g., orange) to distinguish tag matches  
**Rejected Because**: Creates visual noise and confusion about match types

---

### Decision 3: Inline Highlighting for Badges

**Chosen**: Apply `<mark>` elements within badge spans, preserving badge styling

**Implementation Pattern**:
```typescript
<span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
  {highlightText(tag, searchQuery, "bg-yellow-200 text-yellow-900")}
</span>
```

**Rationale**:
- Preserves badge visual style (blue background, rounded, padding)
- Highlight only affects matched text portion
- Click handlers remain on outer span

**Alternative Considered**: Replace badge background with yellow when matched  
**Rejected Because**: Loses tag visual identity, harder to distinguish tag boundaries

---

### Decision 4: Settings Integration Approach

**Chosen**: Check settings in each component, not in utility function

**Implementation Pattern**:
```typescript
const { settings, isSearchActive } = useAppStore();
const shouldHighlight = shouldHighlightTags(isSearchActive, settings, searchQuery);

{shouldHighlight && highlightText(tag, searchQuery)}
{!shouldHighlight && tag}
```

**Rationale**:
- Utility remains pure and testable
- Components remain responsible for accessing their own state
- Easier to debug and reason about

**Alternative Considered**: Pass settings object to utility function  
**Rejected Because**: Creates tight coupling between utility and Zustand store structure

---

## Implementation Best Practices

### 1. Regex Escaping

Always escape special characters in user input before creating RegExp:

```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escapedQuery = escapeRegex(query);
const regex = new RegExp(`(${escapedQuery})`, 'gi');
```

### 2. Memoization

Use `useCallback` for highlighting functions:

```typescript
const highlightTagIfNeeded = useCallback((tag: string) => {
  if (!shouldHighlight) return tag;
  return highlightText(tag, searchQuery);
}, [shouldHighlight, searchQuery]);
```

### 3. Error Handling

Wrap highlighting in try-catch to prevent rendering failures:

```typescript
export function highlightText(text: string, query: string): React.ReactNode[] {
  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    // ... highlighting logic
  } catch (error) {
    console.warn('Failed to highlight text:', error);
    return [text]; // Fallback to plain text
  }
}
```

### 4. Empty States

Handle edge cases gracefully:

```typescript
if (!query || query.trim().length === 0) return [text];
if (!text || text.length === 0) return [''];
```

---

## Testing Strategy

### Unit Tests (tagHighlighter.test.ts)

Test the utility functions in isolation:

1. **Basic Highlighting**
   - Single match
   - Multiple matches
   - Case insensitive matching

2. **Edge Cases**
   - Empty query
   - Empty text
   - No matches
   - Special characters in query
   - Very long tags

3. **Partial Matching**
   - "test" matches "testing"
   - "API" matches "REST-API"

4. **Settings Check**
   - Returns true when all conditions met
   - Returns false when highlightMatches disabled
   - Returns false when tag search scope disabled

### Integration Tests (TagHighlighting.test.tsx)

Test highlighting in actual components:

1. **List View** (MainContent)
   - Plain text tags highlight correctly
   - Multiple tags highlight independently
   - Settings respected

2. **Detail View** (PromptDetail)
   - Badge tags highlight while preserving styling
   - Click still works on badges

3. **Editor View** (PromptEditor)
   - Editable tags highlight
   - Remove button still works

4. **Sidebar** (Sidebar)
   - Clickable filter tags highlight
   - Click to filter still works

---

## Open Questions

None - all questions resolved during research phase.

---

## References

- Existing code: `src/renderer/components/layout/MainContent.tsx` (lines 33-47)
- Fuse.js documentation: https://fusejs.io/
- React key prop best practices: https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
- Tailwind CSS text highlight: https://tailwindcss.com/docs/background-color

---

## Next Steps

1. ✅ Research completed
2. → Proceed to data-model.md (Phase 1)
3. → Create quickstart.md (Phase 1)
4. → Run `/speckit.tasks` to generate task breakdown

