# Quickstart: UI/UX Polish Implementation

**Feature**: 005-ui-ux-polish  
**Estimated Time**: 16-20 hours  
**Prerequisites**: Development environment set up, pnpm installed, existing tests passing

---

## Overview

This feature consolidates LLM settings, improves favorite button discoverability, fixes spacing issues, and streamlines modal interactions. All changes follow TDD (Test-Driven Development) discipline: tests written first, verified to fail, then implemented.

---

## Development Workflow (TDD)

### Phase 1: Setup (30 minutes)

1. **Verify environment**:
   ```bash
   cd /Users/limjk/Documents/GitHub/JeiKeiLim/prompt-organizer
   git checkout 005-ui-ux-polish
   pnpm install
   pnpm test  # Ensure existing tests pass
   ```

2. **Review specifications**:
   - Read `specs/005-ui-ux-polish/spec.md` (acceptance criteria)
   - Read `specs/005-ui-ux-polish/data-model.md` (data structures)
   - Read `specs/005-ui-ux-polish/contracts/*.md` (IPC contracts)

---

### Phase 2: Unified LLM Settings (8-10 hours)

**Priority**: P1 (Most critical - consolidates scattered settings)

#### Step 1: Write Tests (RED - 2 hours)

```bash
# Create test file
touch tests/unit/renderer/components/settings/UnifiedLLMSettings.test.tsx

# Run in watch mode
pnpm test:watch tests/unit/renderer/components/settings/UnifiedLLMSettings.test.tsx
```

**Test cases to write** (verify they FAIL):
```typescript
// tests/unit/renderer/components/settings/UnifiedLLMSettings.test.tsx

describe('UnifiedLLMSettings', () => {
  // Layout tests
  it('should display provider dropdown at top');
  it('should display LLM Call Settings section');
  it('should display Title Generation Settings section');
  it('should display sections in single-column layout');
  
  // Validation tests
  it('should validate timeout range 1-999 for LLM call');
  it('should validate timeout range 1-999 for title generation');
  it('should require LLM call model before save');
  it('should require title generation model before save');
  it('should show inline validation errors');
  it('should prevent save when validation fails');
  
  // Integration tests
  it('should load config via IPC on mount');
  it('should save unified config via IPC');
  it('should apply default values (60s LLM, 30s title)');
});
```

Run tests → **Should see RED (all failing)**

#### Step 2: Implement Types (GREEN - 1 hour)

```bash
# Edit shared types
code src/shared/types/llm.ts
```

**Add types**:
```typescript
export interface UnifiedLLMConfig {
  provider: LLMProviderType;
  llmCall: {
    model: string;
    timeout: number; // 1-999, default 60
  };
  titleGeneration: {
    enabled: boolean;
    model: string;
    timeout: number; // 1-999, default 30
  };
}
```

#### Step 3: Implement Component (GREEN - 4 hours)

```bash
# Refactor LLMSettings component
code src/renderer/components/settings/LLMSettings.tsx
```

**Implementation checklist**:
- [ ] Single-column layout with Tailwind `space-y-6`
- [ ] Provider dropdown at top (shared for both)
- [ ] LLM Call Settings section (model + timeout fields)
- [ ] Title Generation Settings section (enabled toggle + model + timeout)
- [ ] Inline validation with error messages
- [ ] Save button disabled when validation fails
- [ ] IPC integration (`llm:unified-config:get`, `llm:unified-config:save`)

Run tests → **Should see GREEN (all passing)**

#### Step 4: Implement IPC Handler (GREEN - 2 hours)

```bash
# Create handler
code src/main/handlers/llmUnifiedConfigHandler.ts

# Register in main.ts
code src/main/main.ts
```

**Implementation checklist**:
- [ ] `llm:unified-config:get` handler
- [ ] `llm:unified-config:save` handler with validation
- [ ] File system persistence (atomic writes)
- [ ] Migration logic from old configs
- [ ] Error handling with structured responses

#### Step 5: Refactor & Polish (REFACTOR - 1 hour)

- [ ] Extract validation logic into reusable function
- [ ] Extract form sections into sub-components if too large
- [ ] Add i18n translations for all labels/errors
- [ ] Verify accessibility (keyboard navigation, ARIA labels)

Run full test suite: `pnpm test`

---

### Phase 3: Always-Visible Favorite Toggle (4-5 hours)

**Priority**: P1 (Critical UX improvement)

#### Step 1: Write Tests (RED - 1 hour)

```bash
# Create test files
touch tests/unit/renderer/components/common/FavoriteStar.test.tsx
touch tests/integration/ui/favorite-toggle.test.tsx

# Run in watch mode
pnpm test:watch tests/unit/renderer/components/common/FavoriteStar.test.tsx
```

**Test cases**:
```typescript
describe('FavoriteStar', () => {
  it('should display filled star when favorited');
  it('should display empty star when not favorited');
  it('should be positioned in top-right corner');
  it('should call onToggle when clicked');
  it('should debounce rapid clicks (300ms)');
  it('should rollback on IPC failure');
  it('should show error notification on failure');
});
```

Run tests → **Should see RED**

#### Step 2: Implement Component (GREEN - 2 hours)

```bash
# Create FavoriteStar component
code src/renderer/components/common/FavoriteStar.tsx

# Integrate into MainContent
code src/renderer/components/layout/MainContent.tsx
```

**Implementation checklist**:
- [ ] Favorite star button component with filled/empty states
- [ ] Position in top-right corner (`absolute top-2 right-2`)
- [ ] Click handler with debouncing (300ms)
- [ ] Optimistic UI update
- [ ] IPC call to `prompt:update-favorite`
- [ ] Rollback on error + toast notification
- [ ] Always visible (not conditional on `{favorite && <star/>}`)

Run tests → **Should see GREEN**

#### Step 3: Implement IPC Handler (GREEN - 1 hour)

```bash
# Update prompt handler
code src/main/handlers/promptHandler.ts
```

**Implementation checklist**:
- [ ] `prompt:update-favorite` IPC handler
- [ ] Load prompt file, update YAML front matter
- [ ] Atomic file write
- [ ] Error handling

#### Step 4: Refactor & Polish (REFACTOR - 1 hour)

- [ ] Extract debounce logic into custom hook (`useDebouncedFavoriteToggle`)
- [ ] Verify HeroIcons StarIcon usage (filled vs outline)
- [ ] Test on all prompt cards in list
- [ ] Verify keyboard accessibility

Run full test suite: `pnpm test`

---

### Phase 4: Shortcut List Spacing (1 hour)

**Priority**: P2 (Quick visual fix)

#### Step 1: Write Test (RED - 15 minutes)

```bash
# Create test
touch tests/unit/renderer/components/settings/ShortcutSettings.test.tsx

pnpm test:watch tests/unit/renderer/components/settings/ShortcutSettings.test.tsx
```

**Test case**:
```typescript
it('should have 16px left and right margins on shortcut list', () => {
  render(<ShortcutSettings />);
  const list = screen.getByRole('list'); // or appropriate selector
  expect(list).toHaveClass('px-4'); // Tailwind: 16px horizontal padding
});
```

Run test → **Should see RED**

#### Step 2: Implement Fix (GREEN - 15 minutes)

```bash
code src/renderer/components/settings/ShortcutSettings.tsx
```

**Change**:
```tsx
// Before
<div className="space-y-2">
  {shortcuts.map(...)}
</div>

// After
<div className="px-4 space-y-2">
  {shortcuts.map(...)}
</div>
```

Run test → **Should see GREEN**

#### Step 3: Visual Verification (30 minutes)

```bash
# Start app
pnpm dev

# Manual verification:
# 1. Open Settings → Shortcuts tab
# 2. Verify 16px margins visible on left and right
# 3. Test on different window sizes
```

---

### Phase 5: Streamlined Modal Closing (2 hours)

**Priority**: P3 (Low priority but easy win)

#### Step 1: Write Tests (RED - 30 minutes)

```bash
# Create test
touch tests/unit/renderer/components/prompt/ParameterInputModal.test.tsx

pnpm test:watch tests/unit/renderer/components/prompt/ParameterInputModal.test.tsx
```

**Test cases**:
```typescript
describe('ParameterInputModal', () => {
  it('should display X icon in header');
  it('should NOT display Cancel button in footer');
  it('should close when X icon clicked');
  it('should close when ESC key pressed');
  it('should close when backdrop clicked');
});
```

Run tests → **Should see RED**

#### Step 2: Implement Changes (GREEN - 1 hour)

```bash
code src/renderer/components/prompt/ParameterInputModal.tsx
```

**Implementation checklist**:
- [ ] Remove Cancel button from footer
- [ ] Verify X icon exists in header (likely already there)
- [ ] Verify ESC key closing (HeadlessUI Dialog should handle this)
- [ ] Verify backdrop click closing (HeadlessUI Dialog should handle this)

Run tests → **Should see GREEN**

#### Step 3: Refactor & Polish (REFACTOR - 30 minutes)

- [ ] Simplify footer markup (remove button wrapper if empty)
- [ ] Verify modal animations still work
- [ ] Test all modal close methods (X, ESC, backdrop)

Run full test suite: `pnpm test`

---

## Testing Strategy

### Run Tests in Watch Mode (During Development)

```bash
# All tests
pnpm test:watch

# Specific file
pnpm test:watch tests/unit/renderer/components/settings/UnifiedLLMSettings.test.tsx

# Specific test
pnpm test:watch -t "should validate timeout range"
```

### Run Full Test Suite (Before Commit)

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration
```

### Manual Testing Checklist

**Unified LLM Settings**:
- [ ] Open Settings → LLM tab
- [ ] Verify single-column layout
- [ ] Change provider → Verify both model fields update
- [ ] Enter invalid timeout (0, 1000) → Verify inline error
- [ ] Leave model field empty → Verify save disabled
- [ ] Fill valid config → Save → Reopen settings → Verify persistence

**Favorite Toggle**:
- [ ] View prompt list
- [ ] Verify all cards show star (filled or empty)
- [ ] Click empty star → Verify fills immediately
- [ ] Click filled star → Verify empties immediately
- [ ] Rapidly click star 5 times → Verify only final state persists
- [ ] Disconnect network → Click star → Verify error notification

**Shortcut List Spacing**:
- [ ] Open Settings → Shortcuts tab
- [ ] Verify margins visible on both sides
- [ ] Resize window → Verify margins consistent

**Modal Closing**:
- [ ] Open prompt use modal
- [ ] Verify X icon in header, no Cancel button in footer
- [ ] Click X → Modal closes
- [ ] Press ESC → Modal closes
- [ ] Click outside modal → Modal closes

---

## Code Quality Checks

### Linting

```bash
# Check for issues
pnpm lint

# Auto-fix
pnpm lint:fix
```

### Formatting

```bash
# Check formatting
pnpm format --check

# Auto-format
pnpm format
```

### Type Checking

```bash
# Main process
pnpm build:main

# Renderer process
pnpm build:renderer
```

---

## Commit Strategy

Use TDD commit pattern: Test → Implementation → Refactor

```bash
# After each GREEN phase
git add .
git commit -m "test: Add tests for unified LLM settings validation"

# After implementation
git add .
git commit -m "feat: Implement unified LLM settings component"

# After refactor
git add .
git commit -m "refactor: Extract validation logic into reusable function"
```

---

## Integration & Deployment

### Pre-merge Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] No type errors (`pnpm build`)
- [ ] Manual testing completed
- [ ] Constitution compliance verified
- [ ] Code reviewed by peer

### Build for Testing

```bash
# Development build
pnpm build

# Production build
pnpm dist

# Test packaged app
open release/mac/Promptory.app  # macOS
# or
start release/win-unpacked/Promptory.exe  # Windows
```

---

## Troubleshooting

### Tests Failing After Implementation

**Problem**: Tests still RED after implementation

**Solution**:
1. Read error messages carefully
2. Check mock setup (IPC, file system)
3. Verify imports and paths
4. Use `console.log` in tests to debug
5. Run single test in isolation

### IPC Handler Not Responding

**Problem**: Renderer can't communicate with main process

**Solution**:
1. Verify channel constant spelling
2. Check handler is registered in `main.ts`
3. Verify preload script exposes channel
4. Check Electron DevTools console for errors

### Optimistic Update Not Rolling Back

**Problem**: Favorite star stays filled after error

**Solution**:
1. Verify error handling in `catch` block
2. Check rollback logic updates local state
3. Ensure toast notification shown
4. Verify debounce not interfering with rollback

---

## Time Estimates

| Phase | Estimated Time | Buffer |
|-------|----------------|--------|
| Setup | 30 min | +15 min |
| Unified LLM Settings | 8-10 hours | +2 hours |
| Favorite Toggle | 4-5 hours | +1 hour |
| Shortcut Spacing | 1 hour | +30 min |
| Modal Closing | 2 hours | +30 min |
| **Total** | **16-20 hours** | **+4.25 hours** |

**Real-world estimate with buffer**: 20-24 hours across 3-4 working days

---

## Success Criteria

**Feature is complete when**:
- [ ] All 4 user stories implemented
- [ ] All tests passing (target: 15-20 new tests)
- [ ] No linting/type errors
- [ ] Manual testing checklist complete
- [ ] Constitution compliance verified
- [ ] Code reviewed and approved
- [ ] Merged to main branch

---

## Next Steps After Implementation

1. **Generate tasks**: Run `/speckit.tasks` to break down into atomic tasks
2. **Implement TDD**: Follow Red-Green-Refactor for each task
3. **Code review**: Submit PR with link to this spec
4. **Deploy**: Merge to main after approval
5. **Monitor**: Watch for user feedback or bug reports

---

## Resources

- **Spec**: `specs/005-ui-ux-polish/spec.md`
- **Data Model**: `specs/005-ui-ux-polish/data-model.md`
- **Contracts**: `specs/005-ui-ux-polish/contracts/*.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Test Examples**: `tests/unit/services/ParameterSubstitutionService.test.ts`

---

## Contact & Support

**Questions?** Review clarifications in `spec.md` (10 user questions answered)

**Stuck?** Check existing component patterns:
- Settings components: `src/renderer/components/settings/LLMSettings.tsx`
- Zustand stores: `src/renderer/stores/useLLMStore.ts`
- IPC handlers: `src/main/handlers/`
- Tests: `tests/unit/` and `tests/integration/`

**Good luck! Follow TDD discipline: Write tests first, verify they fail, then make them pass.** 🚀
