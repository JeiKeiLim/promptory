---
description: "Task list for fixing modal auto-close setting connection"
---

# Tasks: Fix Modal Auto-Close Setting Connection

**Input**: Design documents from `/specs/001-fix-modal-autoclose/`  
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Tests**: Component integration tests included as this is a behavior fix requiring verification.

**Organization**: Tasks are organized by user story (single story for this bug fix) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Promptory uses Electron architecture with clear process separation
- **Renderer process**: `src/renderer/` (React components, stores, hooks)
- **Tests**: `tests/unit/` and `tests/integration/`
- Paths shown below follow Promptory's established structure

## Phase 1: Setup

**Purpose**: Verify development environment is ready

- [X] T001 Verify branch `001-fix-modal-autoclose` is checked out and up to date with main
- [X] T002 [P] Verify development dependencies installed (run `pnpm install`)
- [X] T003 [P] Verify TypeScript compiles without errors (run `pnpm run build`)
- [X] T004 [P] Verify existing tests pass (run `pnpm test`)
- [X] T005 Verify development server starts successfully (run `pnpm dev`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Status**: ✅ **NO FOUNDATIONAL WORK NEEDED**

All required infrastructure already exists:
- ✅ Zustand store `useAppStore` with `settings.autoCloseModal` (already implemented)
- ✅ ParameterInputModal component (exists, just needs modification)
- ✅ Testing framework (Vitest + React Testing Library configured)
- ✅ TypeScript + ESLint + Prettier (configured)

**Checkpoint**: Foundation ready - user story implementation can begin immediately

---

## Phase 3: User Story 1 - Settings Sync for Modal Auto-Close (Priority: P1) 🎯 MVP

**Goal**: Connect the parameter input modal's auto-close behavior to the global "auto-close modal" setting so users' preferences are respected.

**Independent Test**: 
1. Set "auto-close modal" to OFF in general settings
2. Open any prompt with parameters  
3. Copy the prompt
4. Verify modal does NOT auto-close

**Success Criteria**:
- Modal initializes with global setting value
- Copy operation respects auto-close preference
- Local checkbox allows per-session override
- No persistence of local changes to global settings

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [P] [US1] Create integration test file in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T007 [P] [US1] Write test: "should initialize autoClose from global setting when enabled" in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T008 [P] [US1] Write test: "should initialize autoClose from global setting when disabled" in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T009 [P] [US1] Write test: "should close modal after copy when autoClose is true" in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T010 [P] [US1] Write test: "should keep modal open after copy when autoClose is false" in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T011 [P] [US1] Write test: "should keep modal open on copy failure regardless of autoClose" in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T012 [US1] Write test: "should allow toggling autoClose checkbox without persisting to global" in `tests/integration/components/ParameterInputModal.test.tsx`
- [X] T013 [US1] Run tests and verify they FAIL (expected - implementation not done yet) with `pnpm test ParameterInputModal.test.tsx`

### Implementation for User Story 1

- [X] T014 [US1] Add import for `useAppStore` at top of `src/renderer/components/prompt/ParameterInputModal.tsx` (after line 9)
- [X] T015 [US1] Add hook call `const { settings } = useAppStore();` before state declarations in `src/renderer/components/prompt/ParameterInputModal.tsx` (around line 26)
- [X] T016 [US1] Change autoClose state initialization from `useState(true)` to `useState(settings.autoCloseModal)` in `src/renderer/components/prompt/ParameterInputModal.tsx` (line 29)
- [X] T017 [US1] Run TypeScript compiler to verify no type errors with `pnpm run build:main && pnpm run build:renderer`
- [X] T018 [US1] Run ESLint to verify no linting errors with `pnpm lint src/renderer/components/prompt/ParameterInputModal.tsx`
- [X] T019 [US1] Run all tests and verify they PASS (especially the 6 new tests) with `pnpm test`

**Checkpoint**: At this point, User Story 1 should be fully functional and all tests passing

---

## Phase 4: Manual Testing & Verification

**Purpose**: Comprehensive manual testing across all scenarios to ensure real-world behavior matches specifications

### Manual Test Execution

- [ ] T020 Manual Test 1: Set "auto-close modal" to ON in Settings → General, open prompt modal, fill parameters, copy → verify modal closes automatically
- [ ] T021 Manual Test 2: Set "auto-close modal" to OFF in Settings → General, open prompt modal, fill parameters, copy → verify modal stays open
- [ ] T022 Manual Test 3: Open modal with setting OFF (checkbox unchecked), change setting to ON in Settings, close and reopen modal → verify checkbox now checked
- [ ] T023 Manual Test 4: Open modal, toggle local checkbox from unchecked to checked, copy (modal closes), reopen modal → verify checkbox reset to global setting
- [ ] T024 Manual Test 5: Open modal with required parameter empty, click copy → verify validation error shown and modal stays open regardless of autoClose setting
- [ ] T025 [P] Manual Test 6: Test keyboard shortcut Cmd+Shift+C (or Ctrl+Shift+C) respects autoClose setting - test both ON and OFF states
- [ ] T026 [P] Manual Test 7: Change language to English, verify behavior identical → change to Japanese, verify behavior identical → change back to Korean

### Edge Case Verification

- [ ] T027 Edge Case 1: Open modal, change global setting while modal is open → verify modal continues using original value (doesn't react to changes mid-session)
- [ ] T028 Edge Case 2: Deny clipboard permission (if possible), attempt copy → verify error shown and modal stays open
- [ ] T029 Edge Case 3: Open prompt with no parameters → verify modal works and autoClose still respected

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final code quality checks and documentation

- [X] T030 [P] Run full test suite and verify 100% pass rate with `pnpm test`
- [X] T031 [P] Run test coverage report and verify coverage maintained/improved with `pnpm test -- --coverage`
- [X] T032 [P] Verify TypeScript compilation succeeds with no errors with `pnpm run build`
- [X] T033 [P] Verify ESLint passes with no warnings across entire project with `pnpm lint`
- [X] T034 [P] Run Prettier to ensure code formatting is consistent with `pnpm format`
- [X] T035 [P] Remove any console.log statements or debug code from `src/renderer/components/prompt/ParameterInputModal.tsx`
- [X] T036 Verify no regression in existing functionality: test prompt creation, editing, parameter input, search, settings
- [X] T037 Review modified file against constitution compliance checklist (Type Safety, Testing, UX, i18n)
- [X] T038 Update CHANGELOG.md (if project maintains one) with bug fix entry: "Fixed modal auto-close setting not being respected"
- [X] T039 Validate quickstart.md instructions by following them step-by-step
- [X] T040 Final smoke test: Start fresh dev server, go through complete user workflow (settings → prompt → copy) in all three languages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **ALREADY COMPLETE** (no work needed)
- **User Story 1 (Phase 3)**: Depends on Foundational phase - can proceed immediately
- **Manual Testing (Phase 4)**: Depends on User Story 1 implementation (T006-T019) complete
- **Polish (Phase 5)**: Depends on all testing complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - can start immediately after Setup

### Within User Story 1

```
Phase Flow:
1. Tests (T006-T013) - All [P] except T013 (run tests)
2. Implementation (T014-T016) - Sequential (each builds on previous)
3. Verification (T017-T019) - Sequential (compile → lint → test)
```

**Critical Path**: T001 → T014 → T015 → T016 → T017 → T019 (can skip other tests during rapid iteration)

### Parallel Opportunities

**Setup Phase (T001-T005)**: T002, T003, T004 can run in parallel after T001

**Test Writing (T006-T012)**: All 7 test case implementations can be written in parallel (all [P])

**Manual Testing (T020-T029)**: Many can be done in parallel by different testers:
- T026, T027, T028, T029 are independent and can run in parallel

**Polish Phase (T030-T035)**: T030, T031, T032, T033, T034, T035 can all run in parallel

---

## Parallel Example: User Story 1

### Test Creation (Parallel)

```bash
# All test cases can be written simultaneously:
Task T007: Test initialization with setting enabled
Task T008: Test initialization with setting disabled
Task T009: Test close behavior when enabled
Task T010: Test close behavior when disabled
Task T011: Test error handling
Task T012: Test local override
# Then run together: T013
```

### Manual Testing (Parallel)

```bash
# Multiple testers can execute these simultaneously:
Tester 1: T020, T021, T022 (core functionality)
Tester 2: T023, T024, T025 (edge cases)
Tester 3: T026, T027 (keyboard & language)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Skip Phase 2: Foundational (already complete)
3. Complete Phase 3: User Story 1 (T006-T019)
4. **STOP and VALIDATE**: Run all tests, verify all pass
5. Complete Phase 4: Manual Testing (T020-T029)
6. **VALIDATE USER EXPERIENCE**: Verify settings work as expected
7. Complete Phase 5: Polish (T030-T040)
8. Ready to merge!

### Time Estimates

| Phase | Tasks | Estimated Time | Can Parallelize? |
|-------|-------|----------------|------------------|
| Phase 1: Setup | T001-T005 | 5 minutes | Yes (T002-T004) |
| Phase 2: Foundational | None | 0 minutes | N/A |
| Phase 3: User Story 1 | T006-T019 | 15 minutes | Yes (tests) |
| Phase 4: Manual Testing | T020-T029 | 10 minutes | Yes (many) |
| Phase 5: Polish | T030-T040 | 10 minutes | Yes (T030-T035) |
| **Total** | **40 tasks** | **~40 minutes** | **60% parallelizable** |

**Single Developer (Sequential)**: ~40 minutes  
**With Parallel Execution**: ~25 minutes  
**Core Implementation Only (Skip Manual Tests)**: ~20 minutes

### Critical Path (Minimum Viable Fix)

For fastest path to working fix:
1. T001 (checkout branch)
2. T014 (add import)
3. T015 (add hook call)
4. T016 (change initialization)
5. T019 (run tests)

**Fastest Path Time**: ~10 minutes

---

## Task Checklist Summary

**Total Tasks**: 40  
**Setup Phase**: 5 tasks  
**Foundational Phase**: 0 tasks (all infrastructure exists)  
**User Story 1 Phase**: 14 tasks (7 tests + 6 implementation + 1 verification)  
**Manual Testing Phase**: 10 tasks  
**Polish Phase**: 11 tasks

**Parallel Tasks**: 24 tasks marked [P] (60%)  
**Sequential Tasks**: 16 tasks (40%)

**Test Coverage**: 7 automated tests + 10 manual test scenarios = 17 test verifications

---

## Notes

- **[P] tasks** = different files, no dependencies on incomplete tasks
- **[US1] label** = belongs to User Story 1 (Settings Sync)
- All tasks include specific file paths for clarity
- Tests are written BEFORE implementation (TDD approach)
- Manual testing validates real-world user experience
- Commit after each logical group (tests, implementation, polish)
- Stop at any checkpoint to validate independently
- **This is a bug fix, not a feature** - implementation is very straightforward

---

## Success Criteria Validation

After completing all tasks, verify:

- [ ] **SC-001**: Users with setting OFF see modal stay open after copy ✅
- [ ] **SC-002**: Users with setting ON see modal close after copy ✅
- [ ] **SC-003**: Modal respects setting immediately (no delay) ✅
- [ ] **SC-004**: User confusion about settings eliminated ✅
- [ ] **SC-005**: Existing functionality (shortcuts, validation, errors) preserved ✅

---

## Functional Requirements Coverage

All 7 functional requirements mapped to tasks:

- **FR-001** (Read global setting): Covered by T014-T016
- **FR-002** (Use setting for close behavior): Covered by T016
- **FR-003** (Initialize checkbox from setting): Covered by T016
- **FR-004** (Local changes don't persist): Verified by T012, T023
- **FR-005** (Close only on success + enabled): Verified by T009, T010
- **FR-006** (Errors prevent close): Verified by T011, T024
- **FR-007** (Consistent across languages): Verified by T026

---

## Ready to Implement! 🚀

**Next Step**: Start with Phase 1 (Setup) - Task T001

**Suggested First Commit** (after T019):
```
fix: connect modal auto-close to global setting

- Add useAppStore import to ParameterInputModal
- Initialize autoClose state from settings.autoCloseModal
- Add integration tests for setting synchronization
- Fixes user confusion when preference not respected

Closes #[issue-number]
```

**Estimated Total Implementation Time**: 40 minutes (20 minutes for core fix + tests)

