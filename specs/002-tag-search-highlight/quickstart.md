# Quick Start: Tag Search Highlighting Implementation

**Feature**: 002-tag-search-highlight  
**Target Developers**: Frontend developers working on Promptory  
**Estimated Time**: 4-6 hours  
**Difficulty**: Easy

## Overview

This guide walks you through implementing tag highlighting in search results. You'll create a reusable utility and apply it across four components.

## Prerequisites

Before starting:
- ✅ Read [spec.md](./spec.md) - understand user requirements
- ✅ Read [research.md](./research.md) - understand technical decisions
- ✅ Read [data-model.md](./data-model.md) - understand data structures
- ✅ Familiar with React hooks (`useCallback`, `useMemo`)
- ✅ Familiar with Tailwind CSS
- ✅ Have development environment running (`pnpm dev`)

## Step-by-Step Implementation

### Step 1: Create Tag Highlighting Utility (30 min)

Create a new file: `src/renderer/utils/tagHighlighter.ts`

```typescript
import React from 'react';
import type { AppSettings } from '@renderer/stores/useAppStore';

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Result of checking whether highlighting should be applied
 */
export interface ShouldHighlightResult {
  shouldHighlight: boolean;
  reason?: 'no-query' | 'search-inactive' | 'setting-disabled' | 'scope-disabled';
}

/**
 * Options for highlighting text
 */
export interface HighlightOptions {
  highlightClassName?: string;
  caseSensitive?: boolean;
}

/**
 * Highlights matching portions of text with <mark> elements
 */
export function highlightText(
  text: string,
  query: string,
  options?: HighlightOptions
): React.ReactNode[] {
  // Validation
  if (!text) return [''];
  if (!query || query.trim().length === 0) return [text];
  
  try {
    const className = options?.highlightClassName || 'bg-yellow-200 text-yellow-900 px-1 rounded';
    const flags = options?.caseSensitive ? 'g' : 'gi';
    const escapedQuery = escapeRegex(query.trim());
    const regex = new RegExp(`(${escapedQuery})`, flags);
    
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return React.createElement(
          'mark',
          { key: index, className },
          part
        );
      }
      return part;
    });
  } catch (error) {
    console.warn('Failed to highlight text:', error);
    return [text]; // Fallback to plain text
  }
}

/**
 * Determines whether tag highlighting should be applied
 */
export function shouldHighlightTags(
  isSearchActive: boolean,
  settings: AppSettings | undefined,
  query: string
): ShouldHighlightResult {
  // Check if query is empty
  if (!query || query.trim().length === 0) {
    return { shouldHighlight: false, reason: 'no-query' };
  }
  
  // Check if search is active
  if (!isSearchActive) {
    return { shouldHighlight: false, reason: 'search-inactive' };
  }
  
  // Check highlight setting (default: enabled)
  const highlightEnabled = settings?.search?.highlightMatches !== false;
  if (!highlightEnabled) {
    return { shouldHighlight: false, reason: 'setting-disabled' };
  }
  
  // Check if tags are in search scope (default: enabled)
  const tagsInScope = settings?.search?.searchScope?.tags !== false;
  if (!tagsInScope) {
    return { shouldHighlight: false, reason: 'scope-disabled' };
  }
  
  return { shouldHighlight: true };
}
```

**Test it immediately**: Create `tests/unit/renderer/utils/tagHighlighter.test.ts` (see Testing section below)

---

### Step 2: Update MainContent.tsx (List View) (45 min)

Modify `src/renderer/components/layout/MainContent.tsx`:

```typescript
// Add import at top
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';

// Inside component, add helper after existing highlightMatch
const highlightCheckResult = useMemo(
  () => shouldHighlightTags(isSearchActive, settings, searchQuery),
  [isSearchActive, settings, searchQuery]
);

const highlightTagText = useCallback(
  (text: string) => {
    if (!highlightCheckResult.shouldHighlight) return text;
    return highlightText(text, searchQuery);
  },
  [highlightCheckResult, searchQuery]
);

// In the render, find the tags display (around line 231-237)
// BEFORE:
{prompt.metadata.tags.length > 0 && (
  <>
    <span className="mx-2">•</span>
    <span>{prompt.metadata.tags.slice(0, 2).join(', ')}</span>
    {prompt.metadata.tags.length > 2 && (
      <span> +{prompt.metadata.tags.length - 2}</span>
    )}
  </>
)}

// AFTER:
{prompt.metadata.tags.length > 0 && (
  <>
    <span className="mx-2">•</span>
    <span>
      {highlightTagText(prompt.metadata.tags.slice(0, 2).join(', '))}
    </span>
    {prompt.metadata.tags.length > 2 && (
      <span> +{prompt.metadata.tags.length - 2}</span>
    )}
  </>
)}
```

**Test it**:
1. Run `pnpm dev`
2. Search for a tag name (e.g., "API")
3. Verify tags are highlighted in yellow
4. Disable highlighting in settings → verify no highlighting
5. Disable tag search scope → verify no highlighting

---

### Step 3: Update PromptDetail.tsx (Detail View) (30 min)

Modify `src/renderer/components/prompt/PromptDetail.tsx`:

```typescript
// Add imports
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';
import { useAppStore } from '@renderer/stores/useAppStore';

// Add props to receive search context
interface PromptDetailProps {
  prompt: PromptFileInfo;
  searchContext?: {
    query: string;
    isActive: boolean;
  };
}

// Inside component
export const PromptDetail: React.FC<PromptDetailProps> = ({ 
  prompt,
  searchContext 
}) => {
  const { settings } = useAppStore();
  const searchQuery = searchContext?.query || '';
  const isSearchActive = searchContext?.isActive || false;
  
  const highlightCheckResult = useMemo(
    () => shouldHighlightTags(isSearchActive, settings, searchQuery),
    [isSearchActive, settings, searchQuery]
  );

  const highlightTagIfNeeded = useCallback(
    (tag: string) => {
      if (!highlightCheckResult.shouldHighlight) return tag;
      return highlightText(tag, searchQuery);
    },
    [highlightCheckResult, searchQuery]
  );

  // Find tag rendering (around line 217-227)
  // BEFORE:
  {currentPrompt.metadata.tags.map((tag) => (
    <span
      key={tag}
      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
    >
      {tag}
    </span>
  ))}

  // AFTER:
  {currentPrompt.metadata.tags.map((tag) => (
    <span
      key={tag}
      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
    >
      {highlightTagIfNeeded(tag)}
    </span>
  ))}
}
```

**Update MainContent.tsx to pass search context**:

```typescript
// In MainContent.tsx, find where PromptDetail is rendered
<PromptDetail 
  prompt={selectedPrompt}
  searchContext={{
    query: searchQuery,
    isActive: isSearchActive
  }}
/>
```

---

### Step 4: Update PromptEditor.tsx (Editor View) (30 min)

Similar to PromptDetail, modify `src/renderer/components/editor/PromptEditor.tsx`:

```typescript
// Add imports
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';
import { useAppStore } from '@renderer/stores/useAppStore';

// Update props
interface PromptEditorProps {
  prompt?: PromptFileInfo;
  isNewPrompt?: boolean;
  onSave: (file: PromptFile) => void;
  onCancel: () => void;
  searchContext?: {
    query: string;
    isActive: boolean;
  };
}

// Inside component
export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  isNewPrompt = false,
  onSave,
  onCancel,
  searchContext
}) => {
  const { settings } = useAppStore();
  const searchQuery = searchContext?.query || '';
  const isSearchActive = searchContext?.isActive || false;
  
  const highlightCheckResult = useMemo(
    () => shouldHighlightTags(isSearchActive, settings, searchQuery),
    [isSearchActive, settings, searchQuery]
  );

  const highlightTagIfNeeded = useCallback(
    (tag: string) => {
      if (!highlightCheckResult.shouldHighlight) return tag;
      return highlightText(tag, searchQuery);
    },
    [highlightCheckResult, searchQuery]
  );

  // Find tag rendering (around line 735-749)
  // Update the tag display inside badge
  {tags.map((tag) => (
    <span
      key={tag}
      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
    >
      #{highlightTagIfNeeded(tag)}
      <button
        type="button"
        onClick={() => setTags(tags.filter(t => t !== tag))}
        className="ml-1 text-blue-600 hover:text-blue-800"
      >
        ×
      </button>
    </span>
  ))}
}
```

**Update call site**: Pass search context when rendering PromptEditor from MainContent.

---

### Step 5: Update Sidebar.tsx (Optional) (20 min)

The sidebar shows tag filter buttons. These could also benefit from highlighting.

Modify `src/renderer/components/sidebar/Sidebar.tsx`:

```typescript
// Add imports
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';

// Inside component
const { settings } = useAppStore();

// Note: Sidebar doesn't have search query directly
// Option 1: Add search query to Sidebar props
// Option 2: Skip sidebar highlighting (simpler)
// Decision: SKIP for MVP - sidebar tags are for filtering, not search results

// If implementing, similar pattern to other components
```

**Decision**: Skip sidebar highlighting in MVP. Can add later if users request it.

---

### Step 6: Write Tests (60 min)

#### Unit Tests: `tests/unit/renderer/utils/tagHighlighter.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { highlightText, shouldHighlightTags } from '@renderer/utils/tagHighlighter';

describe('tagHighlighter', () => {
  describe('highlightText', () => {
    it('highlights exact match', () => {
      const result = highlightText('API', 'API');
      const { container } = render(<>{result}</>);
      expect(container.querySelector('mark')).toBeTruthy();
      expect(container.textContent).toBe('API');
    });

    it('highlights partial match', () => {
      const result = highlightText('JavaScript', 'script');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('JavaScript');
      expect(container.querySelector('mark')?.textContent).toBe('script');
    });

    it('is case insensitive by default', () => {
      const result = highlightText('JavaScript', 'SCRIPT');
      const { container } = render(<>{result}</>);
      expect(container.querySelector('mark')).toBeTruthy();
    });

    it('handles special characters in query', () => {
      const result = highlightText('test()', 'test()');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('test()');
    });

    it('returns plain text for empty query', () => {
      const result = highlightText('API', '');
      expect(result).toEqual(['API']);
    });

    it('handles multiple matches', () => {
      const result = highlightText('test-test-test', 'test');
      const { container } = render(<>{result}</>);
      const marks = container.querySelectorAll('mark');
      expect(marks.length).toBe(3);
    });
  });

  describe('shouldHighlightTags', () => {
    it('returns true when all conditions met', () => {
      const settings = {
        search: {
          highlightMatches: true,
          searchScope: { title: true, tags: true, content: false }
        }
      };
      const result = shouldHighlightTags(true, settings, 'api');
      expect(result.shouldHighlight).toBe(true);
    });

    it('returns false when search inactive', () => {
      const settings = { search: { highlightMatches: true, searchScope: { tags: true } } };
      const result = shouldHighlightTags(false, settings, 'api');
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('search-inactive');
    });

    it('returns false when highlight disabled', () => {
      const settings = {
        search: {
          highlightMatches: false,
          searchScope: { tags: true }
        }
      };
      const result = shouldHighlightTags(true, settings, 'api');
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('setting-disabled');
    });

    it('returns false when tag scope disabled', () => {
      const settings = {
        search: {
          highlightMatches: true,
          searchScope: { title: true, tags: false, content: false }
        }
      };
      const result = shouldHighlightTags(true, settings, 'api');
      expect(result.shouldHighlight).toBe(false);
      expect(result.reason).toBe('scope-disabled');
    });
  });
});
```

#### Integration Tests: `tests/integration/components/TagHighlighting.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainContent } from '@renderer/components/layout/MainContent';

describe('Tag Highlighting Integration', () => {
  it('highlights tags in search results', async () => {
    const user = userEvent.setup();
    render(<MainContent />);
    
    // Type search query
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'API');
    
    // Wait for search results
    await screen.findByText(/API/i);
    
    // Check for highlighted tags
    const marks = screen.getAllByRole('mark'); // <mark> elements have implicit 'mark' role
    expect(marks.length).toBeGreaterThan(0);
  });

  it('respects highlightMatches setting', async () => {
    // Test with setting disabled
    // Implementation depends on test setup for settings
  });
});
```

---

### Step 7: Manual Testing Checklist (30 min)

Run through this checklist:

- [ ] **List View**
  - [ ] Search for tag name → tags highlighted
  - [ ] Search for partial tag → partial match highlighted
  - [ ] Case insensitive matching works
  - [ ] Multiple tags highlighted independently
  - [ ] Clear search → highlights removed

- [ ] **Detail View**
  - [ ] Click prompt from search results → tags highlighted in detail
  - [ ] Badge styling preserved (blue background still visible)
  - [ ] Yellow highlight appears within badge

- [ ] **Editor View**
  - [ ] Edit prompt during search → tags highlighted
  - [ ] Remove button still works
  - [ ] Adding new tag works

- [ ] **Settings Integration**
  - [ ] Disable "Highlight Matches" → no tag highlighting
  - [ ] Disable "Tags" in search scope → no tag highlighting
  - [ ] Re-enable settings → highlighting returns

- [ ] **Edge Cases**
  - [ ] Empty search → no highlighting
  - [ ] Search with special chars like `()` → no errors
  - [ ] Very long tag names → highlights correctly
  - [ ] Tags with hyphens/underscores → highlights correctly

- [ ] **Performance**
  - [ ] No lag when typing
  - [ ] Scrolling through results is smooth
  - [ ] No console errors or warnings

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@renderer/utils/tagHighlighter'"

**Solution**: Make sure file exists and TypeScript path alias is configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@renderer/*": ["./src/renderer/*"]
    }
  }
}
```

### Issue 2: Highlighting not appearing

**Debug steps**:
1. Check if search is active: `console.log(isSearchActive)`
2. Check settings: `console.log(settings.search)`
3. Check query: `console.log(searchQuery)`
4. Check highlight result: `console.log(highlightCheckResult)`

### Issue 3: Click handlers not working on tags

**Cause**: Highlight wrapping click element instead of being inside it  
**Solution**: Apply `highlightText()` to the text content, not the entire component

### Issue 4: Special characters causing errors

**Cause**: Regex not escaping special characters  
**Solution**: Verify `escapeRegex()` is being called

---

## Next Steps

After implementation:

1. ✅ All tests passing
2. ✅ Manual testing complete
3. → Run full test suite: `pnpm test`
4. → Check TypeScript: `pnpm run type-check`
5. → Check linting: `pnpm run lint`
6. → Commit with message: `feat(search): add tag highlighting in search results`
7. → Create PR with link to spec and implementation notes

## Resources

- [React createElement API](https://react.dev/reference/react/createElement)
- [Tailwind Text Color](https://tailwindcss.com/docs/text-color)
- [Tailwind Background Color](https://tailwindcss.com/docs/background-color)
- [Vitest Testing Guide](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Estimated Time Breakdown

| Task | Time | Cumulative |
|------|------|------------|
| Step 1: Create utility | 30 min | 30 min |
| Step 2: MainContent | 45 min | 1h 15min |
| Step 3: PromptDetail | 30 min | 1h 45min |
| Step 4: PromptEditor | 30 min | 2h 15min |
| Step 5: Sidebar (skip) | 0 min | 2h 15min |
| Step 6: Write tests | 60 min | 3h 15min |
| Step 7: Manual testing | 30 min | 3h 45min |
| **Total** | **3h 45min** | **~4 hours** |

Add buffer for debugging and code review: **4-6 hours total**

