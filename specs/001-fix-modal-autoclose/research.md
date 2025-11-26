# Research: Fix Modal Auto-Close Setting Connection

**Date**: 2025-11-11  
**Feature**: 001-fix-modal-autoclose  
**Research Phase**: Phase 0 - Problem Analysis & Solution Validation

## Problem Analysis

### Current Implementation

**File**: `src/renderer/components/prompt/ParameterInputModal.tsx`

**Current State Initialization** (Line 29):
```typescript
const [autoClose, setAutoClose] = useState(true);
```

**Issue**: Hardcoded `true` value ignores global setting

**Global Setting Location**:
- Store: `useAppStore()`
- Path: `settings.autoCloseModal`
- Type: `boolean`
- Default: `true`
- Persistence: Zustand middleware (localStorage)

### Root Cause

The modal component initializes its local state with a hardcoded value instead of reading from the global application settings store. This creates a disconnect between:
1. What the user configures in Settings → General → "Auto-close modal"
2. What actually happens when they copy a prompt

### User Impact

**Severity**: Medium  
**Frequency**: Affects all users who change the default setting  
**User Experience**: Violates principle of least surprise - settings don't work as expected

## Solution Design

### Decision: Use Zustand Store for Initialization

**Rationale**:
- Zustand store already exists and is used throughout the app
- Type-safe access to `settings.autoCloseModal`
- No additional dependencies required
- Maintains existing local state pattern for per-session overrides

**Implementation Approach**:
```typescript
// Current (Line 29)
const [autoClose, setAutoClose] = useState(true);

// Proposed Fix
const { settings } = useAppStore();
const [autoClose, setAutoClose] = useState(settings.autoCloseModal);
```

**Lines to change**: 2 lines (import + initialization)

### Alternatives Considered

#### Alternative 1: Remove Local State Entirely

**Approach**: Directly use `settings.autoCloseModal` without local state

**Rejected Because**:
- Users expect the modal checkbox to work for per-session overrides
- Removing local state would make the checkbox persist globally (unintended side effect)
- Current UX allows temporary changes without affecting global preference
- More disruptive change for marginal benefit

#### Alternative 2: Two-Way Sync with Global Settings

**Approach**: Update global setting when user toggles modal checkbox

**Rejected Because**:
- Spec explicitly states local changes should NOT persist (FR-004)
- Would confuse users - clicking checkbox in modal would change global setting
- Violates separation of concerns (modal shouldn't write to global settings)

#### Alternative 3: Add useEffect to Sync on Setting Changes

**Approach**: Listen to setting changes and update local state

**Rejected Because**:
- Over-engineering for edge case (changing setting while modal is open)
- Adds complexity without meaningful benefit
- Spec states modal should use value from when it opened

### Best Practices Applied

**React State Initialization**:
- ✅ Initialize state from props or external source in useState initializer
- ✅ Avoid side effects in render (reading from store in useState is fine)
- ✅ Keep component state isolated from global state changes during lifecycle

**Zustand Store Usage**:
- ✅ Use destructuring to access only needed values
- ✅ Store hook call at component top level (React rules of hooks)
- ✅ Read-only access (no mutations from modal)

## Testing Strategy

### Test Coverage Required

**Unit/Integration Test**: Modal initialization respects global setting

**Test Cases**:
1. **Default setting (true)**: Modal initializes with autoClose checked
2. **Setting disabled (false)**: Modal initializes with autoClose unchecked
3. **Local toggle**: Changing checkbox doesn't affect global setting
4. **Copy with autoClose enabled**: Modal closes after copy
5. **Copy with autoClose disabled**: Modal stays open after copy

**Test File**: `tests/integration/components/ParameterInputModal.test.tsx`

**Testing Tools**:
- Vitest (test runner)
- React Testing Library (component testing)
- Mock Zustand store for different setting values

### Manual Testing Checklist

- [ ] Set autoClose to OFF in settings, open modal → checkbox is unchecked
- [ ] Set autoClose to ON in settings, open modal → checkbox is checked
- [ ] Toggle local checkbox, close modal, reopen → uses global setting again
- [ ] Copy with autoClose ON → modal closes
- [ ] Copy with autoClose OFF → modal stays open
- [ ] Copy fails (validation error) → modal stays open regardless of setting
- [ ] Keyboard shortcut (Cmd+Shift+C) respects autoClose setting
- [ ] Test in all three languages (Korean, English, Japanese)

## Risk Assessment

**Technical Risk**: ⬛⬜⬜⬜⬜ (Very Low - 1/5)

**Reasons**:
- Minimal code change (2 lines)
- Using existing, well-tested Zustand store
- No new dependencies
- No API or data structure changes
- Existing error handling and validation untouched

**Regression Risk**: ⬛⬜⬜⬜⬜ (Very Low - 1/5)

**Mitigations**:
- Change is isolated to one component
- Existing modal functionality preserved
- Test coverage for both settings values
- Manual testing checklist covers edge cases

**User Impact Risk**: ⬜⬜⬜⬜⬜ (None)

**Positive Impact**:
- Fixes user confusion about settings not working
- Improves consistency across application
- No UI changes - pure behavior fix

## Implementation Notes

### Code Change Details

**File**: `src/renderer/components/prompt/ParameterInputModal.tsx`

**Import Addition** (after line 9):
```typescript
import { useAppStore } from '@renderer/stores/useAppStore';
```

**State Initialization Change** (line 26-29):
```typescript
// Add this line before useState
const { settings } = useAppStore();

// Change this line
const [autoClose, setAutoClose] = useState(settings.autoCloseModal);
```

**No Other Changes Required**:
- Copy handler (line 67-87) already uses `autoClose` state correctly
- Checkbox onChange (line 225-227) already updates local state only
- All existing functionality preserved

### Performance Considerations

**Store Access Impact**: Negligible
- Reading from Zustand store is extremely fast (< 1ms)
- Store is already loaded in memory
- No network calls or file I/O

**Re-render Behavior**: No change
- Component already uses useState for autoClose
- Same re-render pattern as before
- No additional subscriptions to store

## Dependencies & Prerequisites

**Dependencies**: None - all required packages already installed
- `zustand` - already in package.json
- `useAppStore` - already implemented

**Prerequisites**: None - can implement immediately

**Blockers**: None identified

## Conclusion

**Ready for Implementation**: ✅ YES

**Recommendation**: Proceed with proposed solution
- Minimal code change
- Low risk
- High user value
- No technical debt introduced
- Follows existing patterns

**Estimated Implementation Time**: 15 minutes
- Code change: 5 minutes
- Test creation: 5 minutes  
- Manual testing: 5 minutes

**Next Step**: Proceed to Phase 1 (Data Model & Contracts)

