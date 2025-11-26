# Quickstart Guide: Fix Modal Auto-Close Setting Connection

**Feature**: 001-fix-modal-autoclose  
**Branch**: `001-fix-modal-autoclose`  
**Type**: Bug Fix  
**Estimated Time**: 15 minutes

## Overview

This quickstart guide walks you through testing and verifying the fix for connecting the global "auto-close modal" setting to the parameter input modal's behavior.

## Prerequisites

- Promptory development environment set up
- Node.js 24.7.0 LTS installed
- pnpm package manager
- Branch `001-fix-modal-autoclose` checked out

## Quick Setup

```bash
# Ensure you're on the correct branch
git checkout 001-fix-modal-autoclose

# Install dependencies (if not already done)
pnpm install

# Start development server
pnpm dev
```

## Understanding the Fix

### What Was Broken

The parameter input modal hardcoded its auto-close behavior:
```typescript
// ❌ BEFORE (Bug)
const [autoClose, setAutoClose] = useState(true);  // Always true!
```

### What Was Fixed

The modal now reads from global settings:
```typescript
// ✅ AFTER (Fix)
const { settings } = useAppStore();
const [autoClose, setAutoClose] = useState(settings.autoCloseModal);
```

## Manual Testing Guide

### Test 1: Global Setting Enabled (Default)

**Expected Behavior**: Modal closes automatically after copy

**Steps**:
1. Open Promptory
2. Click Settings icon (or press `Cmd+,` / `Ctrl+,`)
3. Go to "General" tab
4. Verify "Auto-close modal" checkbox is **checked** ✅
5. Close settings
6. Open any prompt that has parameters
   - Click the "Use" button on a prompt card
   - Or press `Cmd+U` / `Ctrl+U`
7. Fill in parameter values
8. Click "Copy to Clipboard" (or press `Cmd+Shift+C`)

**✅ Pass Criteria**:
- Modal closes immediately after successful copy
- Success toast appears: "클립보드에 복사되었습니다" (or English/Japanese equivalent)

**❌ Fail If**:
- Modal stays open after copy
- No success toast appears

---

### Test 2: Global Setting Disabled

**Expected Behavior**: Modal stays open after copy

**Steps**:
1. Open Settings (`Cmd+,` / `Ctrl+,`)
2. Go to "General" tab
3. **Uncheck** "Auto-close modal" checkbox ❌
4. Close settings
5. Open any prompt with parameters
6. Fill in parameter values
7. Click "Copy to Clipboard"

**✅ Pass Criteria**:
- Modal remains open after successful copy
- Success toast still appears
- You can copy again or manually close with ESC

**❌ Fail If**:
- Modal closes automatically
- Copy doesn't work

---

### Test 3: Setting Change Reflects in Modal

**Expected Behavior**: Modal checkbox matches global setting

**Steps**:
1. Open Settings
2. Set "Auto-close modal" to **OFF** ❌
3. Close settings
4. Open parameter input modal
5. Look at the checkbox at bottom-left of modal

**✅ Pass Criteria**:
- Checkbox is **unchecked** (matches global setting)

**Then**:
6. Close modal
7. Open Settings
8. Set "Auto-close modal" to **ON** ✅
9. Close settings
10. Open parameter input modal again
11. Look at the checkbox

**✅ Pass Criteria**:
- Checkbox is now **checked** (updated from global setting)

**❌ Fail If**:
- Checkbox always shows the same state regardless of global setting
- Checkbox is checked when global setting is OFF
- Checkbox is unchecked when global setting is ON

---

### Test 4: Local Override Doesn't Persist

**Expected Behavior**: Local checkbox changes don't save globally

**Steps**:
1. Open Settings
2. Set "Auto-close modal" to **ON** ✅
3. Close settings
4. Open parameter input modal
5. **Uncheck** the local checkbox at bottom-left ❌
6. Copy prompt (modal should stay open)
7. Close modal manually (ESC or X button)
8. Open parameter input modal again
9. Look at the checkbox

**✅ Pass Criteria**:
- Checkbox is **checked** again (reset from global setting)
- Local change did NOT persist

**❌ Fail If**:
- Checkbox remembers the unchecked state
- Global setting in Settings page changed

---

### Test 5: Error Handling (Modal Stays Open)

**Expected Behavior**: Modal stays open on errors regardless of setting

**Steps**:
1. Open Settings
2. Set "Auto-close modal" to **ON** ✅
3. Close settings
4. Open a prompt with required parameters
5. **Leave a required parameter empty**
6. Click "Copy to Clipboard"

**✅ Pass Criteria**:
- Error toast appears: "필수 파라미터를 입력해주세요: [param name]"
- Modal stays open (doesn't auto-close on error)
- You can fix the parameter and try again

**❌ Fail If**:
- Modal closes despite validation error
- No error message shown
- Copy succeeds with empty required parameter

---

### Test 6: Keyboard Shortcuts

**Expected Behavior**: Keyboard shortcuts respect auto-close setting

**Steps**:
1. Open Settings, set "Auto-close modal" to **ON** ✅
2. Open parameter input modal
3. Fill parameters
4. Press `Cmd+Shift+C` (or `Ctrl+Shift+C` on Windows/Linux)

**✅ Pass Criteria**:
- Copy succeeds
- Modal closes automatically

**Then**:
5. Open Settings, set "Auto-close modal" to **OFF** ❌
6. Open parameter input modal again
7. Fill parameters
8. Press `Cmd+Shift+C`

**✅ Pass Criteria**:
- Copy succeeds
- Modal stays open

**❌ Fail If**:
- Keyboard shortcut behaves differently than button click
- Modal behavior doesn't match setting

---

### Test 7: Multi-Language Support

**Expected Behavior**: Works in all supported languages

**Steps**:
1. Test with language set to **한국어** (Korean)
   - Verify UI strings are in Korean
   - Verify auto-close behavior works
2. Change language to **English** in settings
   - Verify UI strings are in English
   - Verify auto-close behavior works
3. Change language to **日本語** (Japanese)
   - Verify UI strings are in Japanese
   - Verify auto-close behavior works

**✅ Pass Criteria**:
- Auto-close behavior identical in all languages
- No translation errors
- Checkbox label translates correctly

---

## Automated Testing

### Run Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test file (once created)
pnpm test ParameterInputModal.test.tsx

# Watch mode (auto-rerun on changes)
pnpm test:watch

# With UI (visual test runner)
pnpm test:ui
```

### Expected Test Results

```
✅ ParameterInputModal
  ✅ Initialization
    ✅ should initialize autoClose from global setting (enabled)
    ✅ should initialize autoClose from global setting (disabled)
  ✅ Auto-Close Behavior  
    ✅ should close modal after copy when autoClose is true
    ✅ should keep modal open after copy when autoClose is false
    ✅ should keep modal open on copy failure regardless of autoClose
  ✅ Local Override
    ✅ should allow toggling autoClose checkbox without persisting
```

## Verification Checklist

Before considering this fix complete, verify all of the following:

### Functional Requirements

- [ ] **FR-001**: Modal reads `autoCloseModal` from global settings on init
- [ ] **FR-002**: Modal uses global setting to determine close behavior
- [ ] **FR-003**: Modal checkbox initialized with global setting value
- [ ] **FR-004**: Local checkbox changes don't persist globally
- [ ] **FR-005**: Modal only closes when copy succeeds AND autoClose is true
- [ ] **FR-006**: Failed copies don't trigger auto-close
- [ ] **FR-007**: Behavior consistent in Korean, English, Japanese

### Success Criteria

- [ ] **SC-001**: Setting OFF → modal stays open after copy (100%)
- [ ] **SC-002**: Setting ON → modal closes after copy (100%)
- [ ] **SC-003**: Setting respected immediately (no delay/mismatch)
- [ ] **SC-004**: Fix eliminates user confusion about settings
- [ ] **SC-005**: Existing functionality preserved (shortcuts, validation, errors)

### Code Quality

- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] Prettier formatting applied
- [ ] No `console.log` statements left in code
- [ ] Test coverage added for fix

### Constitution Compliance

- [ ] Type safety maintained (no `any` types)
- [ ] Component architecture preserved
- [ ] No security issues introduced
- [ ] i18n support maintained
- [ ] Error handling unchanged

## Troubleshooting

### Issue: Modal always auto-closes

**Symptoms**: Even with setting OFF, modal closes after copy

**Possible Causes**:
- `useAppStore` import missing
- Reading wrong property from settings
- Not using `settings.autoCloseModal` for initialization

**Debug**:
```typescript
// Add temporary log in ParameterInputModal
const { settings } = useAppStore();
console.log('Auto-close setting:', settings.autoCloseModal);  // Should match global setting
```

### Issue: Checkbox doesn't match setting

**Symptoms**: Checkbox state doesn't reflect global setting

**Possible Causes**:
- State initialized with hardcoded value
- useEffect missing dependency
- Multiple state initializations conflicting

**Debug**:
```typescript
// Check initialization
console.log('Initial autoClose:', settings.autoCloseModal);
console.log('State autoClose:', autoClose);
// These should be identical when modal opens
```

### Issue: Local changes persist

**Symptoms**: Toggling checkbox changes global setting

**Possible Causes**:
- Accidentally calling `updateSettings()` in onChange
- Wrong state update function
- Store mutation instead of local state

**Solution**: Ensure onChange only calls `setAutoClose()`

### Issue: Tests failing

**Symptoms**: Jest/Vitest tests fail after fix

**Possible Causes**:
- Mock store not configured correctly
- Missing `useAppStore` mock
- Test assertions checking old behavior

**Solution**:
```typescript
// Mock useAppStore in tests
vi.mock('@renderer/stores/useAppStore', () => ({
  useAppStore: () => ({
    settings: {
      autoCloseModal: true  // or false for specific tests
    }
  })
}));
```

## Performance Verification

**Expected Performance**: No degradation

**Metrics to Check**:
- Modal open time: < 100ms (unchanged)
- Copy operation: < 50ms (unchanged)
- Memory usage: No increase
- Re-render count: Same as before

**How to Measure**:
```bash
# Open React DevTools
# Check "Profiler" tab
# Record while opening modal and copying
# Compare with baseline (before fix)
```

## Deployment Checklist

Before merging to main:

- [ ] All manual tests passed
- [ ] All automated tests passed
- [ ] Code review completed
- [ ] No linter errors
- [ ] Constitution check passed
- [ ] Documentation updated (if needed)
- [ ] Changelog entry added (if maintaining one)
- [ ] Branch rebased on latest main
- [ ] No merge conflicts

## Rollback Plan

If issues are discovered after merge:

```bash
# Revert the commit
git revert <commit-hash>

# Or reset local state in modal (temporary workaround)
const [autoClose, setAutoClose] = useState(true);  # Back to hardcoded

# Push fix branch for proper solution
```

## Additional Resources

- **Spec**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Component Contract**: [contracts/ParameterInputModal.contract.md](./contracts/ParameterInputModal.contract.md)
- **Research**: [research.md](./research.md)
- **Implementation Plan**: [plan.md](./plan.md)

## Questions?

If you encounter issues not covered here:
1. Check the component contract for detailed behavior specs
2. Review the research document for implementation rationale
3. Examine existing tests for pattern examples
4. Check constitution for compliance requirements

## Summary

**This fix should take about 15 minutes to implement and test.**

**Key Points**:
- ✅ Simple 2-line change (import + initialization)
- ✅ Low risk - isolated to one component
- ✅ High user value - fixes confusing behavior
- ✅ Easy to test manually and automatically
- ✅ No performance impact
- ✅ Constitution compliant

**Next Steps**: Proceed to `/speckit.tasks` to generate implementation task list.

