# Research: UI/UX Polish

**Feature**: 005-ui-ux-polish  
**Date**: 2025-11-26  
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Tasks Completed

### 1. Unified LLM Settings Component Architecture

**Decision**: Merge `TitleGenerationSettings.tsx` into `LLMSettings.tsx` with single-column layout

**Rationale**:
- User clarified: Single-column layout with provider at top, then two sections (LLM Call Settings / Title Generation Settings)
- Existing patterns: `LLMSettings.tsx` already handles provider configuration with form-based UI
- Consolidation reduces cognitive load by presenting all LLM configuration in one place
- Single provider selection enforces consistency across both features

**Alternatives Considered**:
- **Side-by-side columns**: Rejected - harder to scan vertically, doesn't scale to mobile/small windows
- **Tabbed sub-interface**: Rejected - adds unnecessary nesting within settings modal that already has tabs
- **Separate tabs**: Current approach - Rejected per user requirement to consolidate

**Implementation Approach**:
```typescript
// Unified LLM Settings Structure
interface UnifiedLLMConfig {
  // Shared
  provider: LLMProviderType;
  
  // LLM Call Settings
  llmCall: {
    model: string;
    timeout: number; // 1-999 seconds, default 60
  };
  
  // Title Generation Settings
  titleGeneration: {
    enabled: boolean;
    model: string;
    timeout: number; // 1-999 seconds, default 30
  };
}
```

---

### 2. Favorite Toggle Icon Positioning and Interaction

**Decision**: Top-right corner with debounced click handling (300ms)

**Rationale**:
- User clarified: Top-right corner placement
- Follows UI conventions (Gmail, YouTube, e-commerce sites use top-right for favorites)
- Keeps primary content (title, description) unobstructed
- Maintains spatial consistency for muscle memory

**Alternatives Considered**:
- **Top-left**: Rejected - conflicts with visual hierarchy (title is primary)
- **Bottom-right**: Rejected - less visible during scrolling
- **Next to title**: Rejected - clutters primary content area

**Debouncing Strategy**:
```typescript
// User clarified: Debounce clicks, process final state after 300ms
let debounceTimer: NodeJS.Timeout;

const handleFavoriteToggle = (promptId: string) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Process final toggle state
    updateFavoriteStatus(promptId);
  }, 300);
};
```

**Click Failure Handling**:
- User clarified: Optimistic UI update + immediate error notification
- No automatic retries (desktop app, network failures rare)
- User manually retries if needed

---

### 3. Form Validation Patterns for Timeout Fields

**Decision**: Inline validation with hard constraint (prevent save until valid)

**Rationale**:
- User clarified: Show inline validation error and prevent save until corrected
- Range: 1-999 seconds (3 digits for UI consistency)
- Prevents invalid configurations from being persisted
- Immediate feedback is more user-friendly than silent failures

**Validation Rules**:
```typescript
interface TimeoutValidation {
  min: 1;          // Minimum timeout
  max: 999;        // Maximum timeout (3 digits)
  type: 'integer'; // No decimals
  required: true;  // Both fields must be filled
}

// Validation errors shown inline:
// - "Timeout must be between 1 and 999 seconds"
// - "Please enter a valid number"
// - "This field is required"
```

**Model Field Requirement**:
- User clarified: Both model fields required before saving (no partial configs)
- Provider + 2 models = complete configuration
- Prevents runtime errors when attempting LLM operations

---

### 4. Shortcut List Margin Standardization

**Decision**: 16px left and right margins

**Rationale**:
- User clarified: 16px specifically
- Matches Tailwind CSS spacing scale (px-4)
- Aligns with application-wide spacing standards
- Provides balanced whitespace without excessive padding

**Implementation**:
```tsx
// Before: No margins
<div className="space-y-2">
  {shortcuts.map(...)}
</div>

// After: 16px margins
<div className="px-4 space-y-2">
  {shortcuts.map(...)}
</div>
```

---

### 5. Modal Closing Behavior Standardization

**Decision**: Remove Cancel button, retain X icon + ESC key + backdrop click

**Rationale**:
- User clarified: Yes, clicking outside closes modal (standard behavior)
- Redundant controls create visual clutter
- Three closing methods provide flexibility:
  1. X icon (explicit action)
  2. ESC key (keyboard users)
  3. Backdrop click (standard modal pattern)

**Existing Implementation Check**:
```typescript
// ParameterInputModal.tsx already supports:
// - X icon in header
// - Backdrop click (via HeadlessUI Dialog)
// - Need to verify ESC key support (likely built-in to HeadlessUI)
```

---

## Technical Patterns Established

### React Component Refactoring Pattern

Following existing codebase patterns:
```typescript
// Component structure (from LLMSettings.tsx)
export const LLMSettings: React.FC = () => {
  const { t } = useTranslation();
  const store = useLLMStore();
  const [localState, setLocalState] = useState(...);
  
  // Load on mount
  useEffect(() => { loadConfig(); }, []);
  
  // Validation
  const validate = () => { ... };
  
  // Save
  const handleSave = async () => { ... };
  
  return (
    <div className="space-y-6">
      {/* Form sections */}
    </div>
  );
};
```

### Zustand Store Pattern

Minimal changes to existing stores:
```typescript
// useLLMStore.ts - May need to add unified config methods
interface LLMStoreState {
  // Existing fields preserved
  providers: LLMProviderConfig[];
  activeProvider: LLMProviderConfig | null;
  
  // Potentially new: unified config getter/setter
  getUnifiedConfig: () => UnifiedLLMConfig;
  setUnifiedConfig: (config: UnifiedLLMConfig) => Promise<void>;
}
```

### IPC Channel Pattern

Following existing `IPC_CHANNELS` constants:
```typescript
// Possibly consolidate:
// - LLM_PROVIDER_SAVE
// - LLM_TITLE_CONFIG_SET
// Into:
// - LLM_UNIFIED_CONFIG_SET (single channel for unified config)
```

---

## Best Practices Applied

### 1. TDD with Vitest + React Testing Library

**Unit Tests** (Red-Green-Refactor):
```typescript
// Example test structure (from ParameterSubstitutionService.test.ts)
describe('UnifiedLLMSettings', () => {
  it('should validate timeout range 1-999', () => {
    // RED: Write failing test
    const result = validateTimeout(0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 999');
  });
  
  it('should require both model fields', () => {
    // RED: Write failing test
    const config = { provider: 'ollama', llmCall: { model: '' }, ... };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });
});
```

**Integration Tests**:
```typescript
// Test IPC + UI integration
describe('Favorite Toggle Integration', () => {
  it('should persist favorite status via IPC', async () => {
    // Setup
    render(<MainContent />);
    const star = screen.getByRole('button', { name: /favorite/i });
    
    // Act
    await userEvent.click(star);
    
    // Assert
    await waitFor(() => {
      expect(mockIPC).toHaveBeenCalledWith('prompt:update', {
        metadata: { favorite: true }
      });
    });
  });
});
```

### 2. TypeScript Strict Mode

All types explicitly defined:
```typescript
// src/shared/types/llm.ts
export interface UnifiedLLMConfig {
  provider: LLMProviderType;
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

// No 'any' types, use 'unknown' with type guards if needed
```

### 3. Accessibility

Maintain keyboard navigation and screen reader support:
```tsx
// Favorite star button
<button
  type="button"
  onClick={handleToggle}
  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  className="..."
>
  <StarIcon className={isFavorite ? 'fill-yellow-400' : 'fill-none'} />
</button>
```

### 4. Internationalization (i18n)

Use existing react-i18next patterns:
```tsx
const { t } = useTranslation();

// Settings labels
<label>{t('settings.llm.providerLabel')}</label>
<label>{t('settings.llm.callModelLabel')}</label>
<label>{t('settings.llm.titleModelLabel')}</label>

// Error messages
toast.error(t('settings.llm.validation.timeoutRange'));
```

---

## Performance Considerations

### Debouncing (300ms)

Prevents excessive IPC calls during rapid user interaction:
```typescript
import { debounce } from 'lodash'; // Or custom implementation

const debouncedToggle = debounce(async (promptId: string) => {
  await window.electronAPI.invoke('prompt:update', { id: promptId, ... });
}, 300);
```

### Optimistic UI Updates

Favorite toggle updates UI immediately, rolls back on error:
```typescript
const handleFavoriteToggle = async (promptId: string, currentState: boolean) => {
  // Optimistic update
  updateLocalState(promptId, !currentState);
  
  try {
    const result = await window.electronAPI.invoke('prompt:update', ...);
    if (!result.success) {
      // Rollback on error
      updateLocalState(promptId, currentState);
      toast.error(result.error);
    }
  } catch (error) {
    // Rollback on exception
    updateLocalState(promptId, currentState);
    toast.error('Failed to update favorite status');
  }
};
```

---

## Dependencies Analysis

**No new dependencies required**:
- React 18.3+ (existing)
- Zustand 4.5+ (existing)
- Tailwind CSS 3.4+ (existing)
- Headless UI (existing - for modal)
- react-i18next (existing - for translations)
- Vitest + React Testing Library (existing - for tests)

All functionality achieved with existing dependencies.

---

## Cross-Platform Compatibility

**No platform-specific code needed**:
- Pure React components (renderer process)
- Tailwind CSS for styling (cross-platform)
- IPC channels work identically on macOS/Windows/Linux
- File system operations handled by existing main process services

**Responsive Design**:
```tsx
// Tailwind utilities ensure responsive behavior
<div className="space-y-4 md:space-y-6 lg:space-y-8">
  {/* Adjusts spacing based on screen size */}
</div>
```

---

## Security Considerations

**No security impact**:
- UI-only changes, no new credential handling
- Existing IPC security maintained (contextIsolation, nodeIntegration disabled)
- Input validation (timeout range) prevents malformed data
- No new file system access required

---

## Migration Strategy

### Unified LLM Settings Migration

Users with existing separate configurations need seamless transition:

```typescript
// Migration logic in main process
async function migrateToUnifiedConfig() {
  const llmProvider = await getLLMProviderConfig();
  const titleConfig = await getTitleGenerationConfig();
  
  const unifiedConfig: UnifiedLLMConfig = {
    provider: llmProvider.providerType,
    llmCall: {
      model: llmProvider.modelName,
      timeout: llmProvider.timeoutSeconds || 60
    },
    titleGeneration: {
      enabled: titleConfig.enabled,
      model: titleConfig.selectedModel,
      timeout: titleConfig.timeoutSeconds || 30
    }
  };
  
  await saveUnifiedConfig(unifiedConfig);
}
```

**Migration Trigger**:
- Run on first app launch after update
- Preserve existing configurations
- Remove old separate config files after successful migration

---

## Summary

All technical unknowns resolved through:
1. User clarifications (10 questions answered)
2. Codebase analysis (existing patterns identified)
3. Best practices research (TDD, TypeScript, accessibility)

**Ready for Phase 1**: Design artifacts (data model, contracts, quickstart) can now be generated with confidence.
