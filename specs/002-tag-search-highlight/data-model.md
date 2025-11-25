# Data Model: Tag Search Highlighting

**Feature**: 002-tag-search-highlight  
**Date**: 2025-11-18  
**Status**: Completed

## Overview

This document defines the data structures, interfaces, and data flow for the tag search highlighting feature. Since this is a UI-only feature, there are no persistent data changes - only runtime state and component interfaces.

## Data Entities

### No New Entities

This feature doesn't introduce new data entities. It operates on existing data:

- **Search Query**: Already exists in `MainContent.tsx` state (`searchQuery: string`)
- **Tags**: Already exists in `PromptFileInfo.metadata.tags: string[]`
- **Settings**: Already exists in `useAppStore` settings
  - `settings.search?.highlightMatches: boolean`
  - `settings.search?.searchScope: { title: boolean, tags: boolean, content: boolean }`

## TypeScript Interfaces

### 1. Tag Highlighting Utility

```typescript
// src/renderer/utils/tagHighlighter.ts

/**
 * Options for highlighting text
 */
export interface HighlightOptions {
  /** CSS classes to apply to highlighted text */
  highlightClassName?: string;
  /** Whether to perform case-sensitive matching (default: false) */
  caseSensitive?: boolean;
}

/**
 * Result of checking whether highlighting should be applied
 */
export interface ShouldHighlightResult {
  /** Whether highlighting should be applied */
  shouldHighlight: boolean;
  /** Reason why highlighting is disabled (for debugging) */
  reason?: 'no-query' | 'search-inactive' | 'setting-disabled' | 'scope-disabled';
}

/**
 * Highlights matching portions of text with <mark> elements
 * 
 * @param text - The text to highlight
 * @param query - The search query to match
 * @param options - Optional highlighting configuration
 * @returns Array of React nodes (strings and <mark> elements)
 * 
 * @example
 * highlightText('JavaScript', 'script')
 * // Returns: ['Java', <mark>script</mark>]
 */
export function highlightText(
  text: string,
  query: string,
  options?: HighlightOptions
): React.ReactNode[];

/**
 * Determines whether tag highlighting should be applied
 * based on search state and user settings
 * 
 * @param isSearchActive - Whether a search is currently active
 * @param settings - Application settings object
 * @param query - Current search query
 * @returns Object indicating whether to highlight and why
 * 
 * @example
 * const result = shouldHighlightTags(true, settings, 'api');
 * if (result.shouldHighlight) {
 *   // Apply highlighting
 * }
 */
export function shouldHighlightTags(
  isSearchActive: boolean,
  settings: AppSettings,
  query: string
): ShouldHighlightResult;

/**
 * Escapes special regex characters in a string
 * 
 * @param str - String to escape
 * @returns Escaped string safe for RegExp
 * 
 * @internal
 */
function escapeRegex(str: string): string;
```

### 2. Component Props Extensions

No new component props needed. Existing components already have access to:

```typescript
// MainContent.tsx - Already has these
const [searchQuery, setSearchQuery] = useState('');
const [isSearchActive, setIsSearchActive] = useState(false);
const { settings } = useAppStore();

// PromptDetail.tsx - Needs to accept search state via props or context
interface PromptDetailProps {
  prompt: PromptFileInfo;
  // ADD: Optional search context
  searchContext?: {
    query: string;
    isActive: boolean;
  };
}

// PromptEditor.tsx - Same as PromptDetail
interface PromptEditorProps {
  prompt?: PromptFileInfo;
  isNewPrompt?: boolean;
  onSave: (file: PromptFile) => void;
  onCancel: () => void;
  // ADD: Optional search context
  searchContext?: {
    query: string;
    isActive: boolean;
  };
}

// Sidebar.tsx - Already has access to filter state
// No changes needed
```

### 3. Settings Types (No Changes)

Existing settings structure already supports this feature:

```typescript
// Defined in src/renderer/stores/useAppStore.ts
interface AppSettings {
  search?: {
    highlightMatches?: boolean;  // Default: true
    searchScope?: {
      title: boolean;    // Default: true
      tags: boolean;     // Default: true
      content: boolean;  // Default: false
    };
  };
}
```

## Data Flow

### Flow 1: Search Query to Tag Highlighting

```
User Types Query
      ↓
SearchBar (300ms debounce)
      ↓
MainContent.handleSearchResults()
      ↓
setSearchQuery(query)
setIsSearchActive(hasQuery)
      ↓
Component Render
      ↓
shouldHighlightTags() check
      ↓
[IF TRUE] highlightText() for each tag
[IF FALSE] display plain tag text
      ↓
User sees highlighted tags
```

### Flow 2: Settings Change Impact

```
User Changes Settings
      ↓
SettingsModal → useAppStore.setSettings()
      ↓
Zustand persistence (localStorage)
      ↓
All components re-render (Zustand subscription)
      ↓
shouldHighlightTags() rechecks settings
      ↓
Highlighting enabled/disabled accordingly
```

### Flow 3: Tag Display Across Contexts

```
Prompt Data (with tags)
      ↓
      ├──→ MainContent (List View)
      │    └──→ Plain text: tags.join(', ')
      │         └──→ highlightText(joinedTags, query)
      │
      ├──→ PromptDetail (Detail View)
      │    └──→ Badge loop: tags.map(tag => <Badge>)
      │         └──→ highlightText(tag, query)
      │
      ├──→ PromptEditor (Editor View)
      │    └──→ Badge loop: tags.map(tag => <Badge>)
      │         └──→ highlightText(tag, query)
      │
      └──→ Sidebar (Filter List)
           └──→ Button loop: tagStats.map(stat => <Button>)
                └──→ highlightText(stat.name, query)
```

## State Management

### No New Zustand State

The feature uses existing state from `useAppStore` and component-local state. No new Zustand slices or state fields required.

**Existing State Used**:
- `useAppStore.settings` (read-only for highlight settings)
- `MainContent.searchQuery` (component state)
- `MainContent.isSearchActive` (component state)
- `MainContent.searchResults` (component state)

### Component State Dependencies

```typescript
// MainContent.tsx
const [searchQuery, setSearchQuery] = useState('');
const [isSearchActive, setIsSearchActive] = useState(false);
const { settings } = useAppStore();

// Derived state
const shouldHighlight = useMemo(
  () => shouldHighlightTags(isSearchActive, settings, searchQuery),
  [isSearchActive, settings, searchQuery]
);

// PromptDetail.tsx (needs search context passed down)
const { searchQuery, isSearchActive } = props.searchContext || { 
  searchQuery: '', 
  isSearchActive: false 
};
const { settings } = useAppStore();

const shouldHighlight = useMemo(
  () => shouldHighlightTags(isSearchActive, settings, searchQuery),
  [isSearchActive, settings, searchQuery]
);
```

## Component Relationships

### Dependency Graph

```
tagHighlighter.ts (utility)
      ↑
      ├── MainContent.tsx (consumes)
      ├── PromptDetail.tsx (consumes)
      ├── PromptEditor.tsx (consumes)
      └── Sidebar.tsx (consumes)

useAppStore (settings)
      ↑
      └── All components (read settings)

MainContent (search state source)
      ↓
      ├── PromptDetail (receives via props)
      └── PromptEditor (receives via props)
```

### Communication Patterns

1. **MainContent → PromptDetail**: Pass search context via props when detail view is active
2. **MainContent → PromptEditor**: Pass search context via props when editing
3. **Sidebar**: Independent - uses own query state (tag filter)
4. **All → useAppStore**: Read-only access to settings

## Data Validation

### Input Validation

```typescript
// In highlightText()
if (!text) return [''];
if (!query || query.trim().length === 0) return [text];
if (typeof text !== 'string') {
  console.warn('highlightText: text must be a string');
  return [text];
}
if (typeof query !== 'string') {
  console.warn('highlightText: query must be a string');
  return [text];
}
```

### Settings Validation

```typescript
// In shouldHighlightTags()
const highlightEnabled = settings.search?.highlightMatches !== false;
const tagsInScope = settings.search?.searchScope?.tags !== false;

// Graceful defaults if settings undefined
```

## Performance Considerations

### Memoization Strategy

```typescript
// Component level
const shouldHighlight = useMemo(
  () => shouldHighlightTags(isSearchActive, settings, searchQuery),
  [isSearchActive, settings, searchQuery]
);

const highlightTagIfNeeded = useCallback(
  (tag: string) => {
    if (!shouldHighlight.shouldHighlight) return tag;
    return highlightText(tag, searchQuery);
  },
  [shouldHighlight, searchQuery]
);

// In render
{tags.map((tag) => (
  <span key={tag}>
    {highlightTagIfNeeded(tag)}
  </span>
))}
```

### Avoiding Unnecessary Renders

- Use `React.memo` for tag components if profiling shows issues
- Rely on existing search debounce (300ms)
- Don't add additional debouncing (causes lag)

## Testing Data

### Test Fixtures

```typescript
// tests/fixtures/tags.ts
export const testTags = {
  simple: ['API', 'REST', 'Documentation'],
  withHyphens: ['REST-API', 'Unit-Test'],
  withSpecialChars: ['C++', 'Node.js', 'React@18'],
  withSpaces: ['Machine Learning', 'Web Dev'],
  long: ['VeryLongTagNameThatExceedsNormalLength'],
  unicode: ['한글', '日本語', 'Emoji🎉'],
  caseVariations: ['JavaScript', 'javascript', 'JAVASCRIPT'],
};

export const testQueries = {
  exact: 'API',
  partial: 'script',  // matches "JavaScript"
  caseInsensitive: 'api',  // matches "API"
  special: 'test()',  // needs escaping
  empty: '',
  whitespace: '   ',
};

export const testSettings = {
  allEnabled: {
    search: {
      highlightMatches: true,
      searchScope: { title: true, tags: true, content: true },
    },
  },
  highlightDisabled: {
    search: {
      highlightMatches: false,
      searchScope: { title: true, tags: true, content: true },
    },
  },
  tagScopeDisabled: {
    search: {
      highlightMatches: true,
      searchScope: { title: true, tags: false, content: true },
    },
  },
};
```

## Error Scenarios

### Error Handling Matrix

| Scenario | Behavior | Fallback |
|----------|----------|----------|
| Invalid regex in query | Catch exception | Display plain text |
| Undefined settings | Use defaults | highlightMatches: true, tags: true |
| Null/undefined tag | Skip highlighting | Return empty string |
| React rendering error | Error boundary | Show error indicator |
| Performance degradation | Monitor in production | Consider virtualization |

## Migration & Compatibility

### No Migration Needed

This feature:
- ✅ Doesn't change file formats
- ✅ Doesn't modify database schema
- ✅ Doesn't alter stored settings structure
- ✅ Is backward compatible (graceful degradation)

### Rollback Strategy

If issues arise:
1. Remove `highlightText()` calls
2. Revert to plain text display
3. No data loss or corruption possible

## Next Steps

1. ✅ Data model completed
2. → Proceed to quickstart.md (developer guide)
3. → Run `/speckit.tasks` to generate implementation tasks

