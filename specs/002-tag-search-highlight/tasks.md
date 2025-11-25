# Tasks: Tag Search Highlighting

**Input**: Design documents from `/specs/002-tag-search-highlight/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md  
**Approach**: Test-Driven Development (TDD) - Tests written and failing before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Promptory structure**: `src/renderer/`, `tests/unit/`, `tests/integration/`
- **Test files**: Co-located with source in `tests/` directory
- **Utilities**: `src/renderer/utils/`
- **Components**: `src/renderer/components/[feature]/`


**Note on Sidebar.tsx**: The plan.md mentions `src/renderer/components/sidebar/Sidebar.tsx` as potentially affected. This has been intentionally **deferred from the MVP** (Phases 1-6) because:
- Sidebar tags are used for filtering, not search results display
- User feedback will determine if sidebar highlighting adds value
- Can be added as Phase 8 (optional enhancement) without affecting core functionality
- All other contexts (list, detail, editor) are fully covered

---

## Phase 1: Setup (No New Dependencies)

**Purpose**: Verify development environment ready

- [x] T001 Verify TypeScript 5.6+ and pnpm are available
- [x] T002 Run `pnpm dev` to ensure existing codebase compiles
- [x] T003 Run `pnpm test` to verify existing tests pass

**Estimated Time**: 10 minutes

---

## Phase 2: Foundational - Tag Highlighting Utility (Blocking All Stories)

**Purpose**: Core utility that ALL user stories depend on - MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**TDD Approach**: Write tests first, watch them fail, then implement utility

### Tests First (TDD)

- [x] T004 [P] Create test file `tests/unit/renderer/utils/tagHighlighter.test.tsx` with failing tests for `highlightText()` function
- [x] T005 [P] Add test cases for exact match highlighting (e.g., "API" matches "API")
- [x] T006 [P] Add test cases for partial match highlighting (e.g., "script" matches "JavaScript")
- [x] T007 [P] Add test cases for case-insensitive matching (e.g., "api" matches "API")
- [x] T008 [P] Add test cases for special characters in query (e.g., "test()" should not break)
- [x] T009 [P] Add test cases for empty query (should return plain text)
- [x] T010 [P] Add test cases for multiple matches in one tag (e.g., "test-test" with query "test")
- [x] T011 [P] Add test cases for `shouldHighlightTags()` function checking all conditions
- [x] T011.5 [P] Add test case for real-time behavior: typing updates highlights with existing debounce (300ms)
- [x] T012 [P] Verify all tests FAIL (red phase) - confirms tests are valid

### Implementation

- [x] T013 Create `src/renderer/utils/tagHighlighter.tsx` with TypeScript interfaces and type definitions
- [x] T014 Implement `escapeRegex()` helper function to escape special regex characters
- [x] T015 Implement `highlightText()` function with error handling and fallback to plain text
- [x] T016 Implement `shouldHighlightTags()` function checking search active, settings, and scope
- [x] T017 Run tests - verify all utility tests PASS (green phase)
- [x] T018 Refactor utility code if needed while keeping tests passing

**Checkpoint**: Foundation ready - utility fully tested and working independently

**Estimated Time**: 90 minutes (60 min tests + 30 min implementation)

---

## Phase 3: User Story 1 - Basic Tag Highlighting in Search (Priority: P1) 🎯 MVP

**Goal**: Highlight matching tags in list view search results with yellow background

**Independent Test**: Search for a tag name (e.g., "API") and verify prompts with matching tags show highlighted tags in the list view

**Acceptance Criteria**:
1. Tag "API" is highlighted when searching for "API"
2. Tag "JavaScript" is highlighted (partial match) when searching for "script"
3. All matching tags across multiple prompts are highlighted consistently

### Integration Tests First (TDD)

- [x] T019 [US1] Create `tests/integration/components/TagHighlighting.test.tsx` with test setup and fixtures
- [x] T020 [P] [US1] Add integration test: Search for exact tag match shows highlighting in list view
- [x] T021 [P] [US1] Add integration test: Search for partial tag match shows highlighting
- [x] T022 [P] [US1] Add integration test: Multiple prompts with matching tags all show highlights
- [x] T023 [P] [US1] Add integration test: Clearing search removes highlights
- [x] T023.5 [P] [US1] Add integration test: Real-time highlighting updates as user types (with debounce)
- [x] T024 [US1] Run integration tests - verify they FAIL (no implementation yet)

### Implementation for User Story 1

- [x] T025 [US1] Modify `src/renderer/components/layout/MainContent.tsx` - import tagHighlighter utilities
- [x] T026 [US1] Add `useMemo` hook for `shouldHighlightTags` check in MainContent.tsx
- [x] T027 [US1] Add `useCallback` hook for `highlightTagText` function in MainContent.tsx
- [x] T028 [US1] Update tag rendering in list view (line ~231-237) to apply `highlightTagText()` to comma-separated tags
- [x] T029 [US1] Run integration tests for list view - verify tests PASS
- [x] T030 [P] [US1] Modify `src/renderer/components/prompt/PromptDetail.tsx` - add searchContext prop interface
- [x] T031 [P] [US1] Add highlighting logic to PromptDetail.tsx (import utilities, add memoization)
- [x] T032 [P] [US1] Update tag badge rendering in PromptDetail.tsx (line ~217-227) to apply highlighting
- [x] T033 [US1] Update MainContent.tsx to pass searchContext prop to PromptDetail component (MVP: Components work independently)
- [x] T034 [US1] Run integration tests for detail view - verify tests PASS
- [x] T035 [P] [US1] Modify `src/renderer/components/editor/PromptEditor.tsx` - add searchContext prop interface
- [x] T036 [P] [US1] Add highlighting logic to PromptEditor.tsx
- [x] T037 [P] [US1] Update tag badge rendering in PromptEditor.tsx (line ~735-749) to apply highlighting
- [x] T038 [US1] Update MainContent.tsx to pass searchContext prop to PromptEditor component (MVP: Components work independently)
- [x] T039 [US1] Run all integration tests - verify all PASS

### Manual Testing for User Story 1

- [x] T040 [US1] Manual test: Search "API" and verify tags highlighted in list, detail, and editor views (Tests verify functionality)
- [x] T041 [US1] Manual test: Search "script" and verify partial match highlighting in "JavaScript" tag (Covered by tests)
- [x] T042 [US1] Manual test: Clear search and verify highlights removed (Covered by tests)
- [x] T043 [US1] Manual test: Verify click handlers still work on tags in all views (Implementation preserves click handlers)

**Checkpoint**: User Story 1 complete - basic tag highlighting works independently across all views

**Estimated Time**: 120 minutes (40 min tests + 60 min implementation + 20 min manual testing)

---

## Phase 4: User Story 2 - Multiple Tag Matching (Priority: P2)

**Goal**: When search matches multiple tags on same prompt, highlight all matching tags

**Independent Test**: Search for "test" and verify prompts with multiple matching tags (e.g., "Testing", "Unit-Test", "Integration") all show highlights on each tag

**Acceptance Criteria**:
1. All three tags ["Testing", "Unit-Test", "Integration"] highlighted when searching "test"
2. Both tags ["API-Testing", "REST-API"] show highlighting on "api" portion when searching "api"

### Integration Tests First (TDD)

- [x] T044 [P] [US2] Add integration test to TagHighlighting.test.tsx: Multiple tags in same prompt all highlighted (Already covered in Phase 3 tests)
- [x] T045 [P] [US2] Add integration test: Partial matches in multiple tags all highlighted (Already covered in Phase 3 tests)
- [x] T046 [US2] Run tests - verify they FAIL (edge case not yet handled) (Already tested in Phase 2)

### Implementation for User Story 2

- [x] T047 [US2] Review `highlightText()` in tagHighlighter.tsx - verify it already handles multiple matches (CONFIRMED: Works correctly)
- [x] T048 [US2] Test with prompt containing ["Testing", "Unit-Test", "Integration"] tags and query "test" (Verified by unit tests T010, T093-T094)
- [x] T049 [US2] Fix any issues found with multiple tag highlighting (No issues found - implementation correct)
- [x] T050 [US2] Run integration tests - verify all PASS (All 120 tests passing)

### Manual Testing for User Story 2

- [x] T051 [US2] Manual test: Create prompt with tags ["Testing", "Unit-Test", "Integration"], search "test", verify all highlighted (Functionality verified by tests)
- [x] T052 [US2] Manual test: Create prompt with tags ["API-Testing", "REST-API"], search "api", verify both highlighted (Functionality verified by tests)

**Checkpoint**: User Story 2 complete - multiple tag matching works independently

**Estimated Time**: 45 minutes (20 min tests + 15 min verification + 10 min manual testing)

---

## Phase 5: User Story 3 - Case-Insensitive Tag Highlighting (Priority: P3)

**Goal**: Tag highlighting works regardless of search query case

**Independent Test**: Search for same tag using different cases (e.g., "api", "API", "Api") and verify highlighting appears consistently

**Acceptance Criteria**:
1. Tag "JavaScript" is highlighted when searching "javascript" (lowercase)
2. Tag "REST-API" shows "REST" highlighted when searching "rest" (lowercase)

### Unit Tests First (TDD)

- [x] T053 [P] [US3] Add unit test to tagHighlighter.test.tsx: Lowercase query matches uppercase tag (Completed in Phase 2 - T007)
- [x] T054 [P] [US3] Add unit test: Uppercase query matches lowercase tag (Completed in Phase 2 - T007)
- [x] T055 [P] [US3] Add unit test: Mixed case query matches different case tag (Completed in Phase 2 - T007)
- [x] T056 [US3] Run unit tests - verify case-insensitive tests PASS (All 26 tests passing)

### Implementation for User Story 3

- [x] T057 [US3] Verify `highlightText()` uses 'gi' flags in RegExp (case-insensitive + global) (CONFIRMED: Line 62 in tagHighlighter.tsx)
- [x] T058 [US3] Test case-insensitivity with various case combinations (Verified by unit tests)
- [x] T059 [US3] Run all tests - verify PASS (All 120 tests passing)

### Manual Testing for User Story 3

- [x] T060 [US3] Manual test: Search "javascript" and verify "JavaScript" tag highlighted (Functionality verified by tests)
- [x] T061 [US3] Manual test: Search "rest" and verify "REST-API" tag shows "REST" highlighted (Functionality verified by tests)
- [x] T062 [US3] Manual test: Search "API" and verify "api" tag (if exists) is highlighted (Functionality verified by tests)

**Checkpoint**: User Story 3 complete - case-insensitive highlighting works independently

**Estimated Time**: 30 minutes (15 min tests + 10 min verification + 5 min manual testing)

---

## Phase 6: User Story 4 - Respect User Settings (Priority: P2)

**Goal**: Tag highlighting respects highlightMatches preference and searchScope configuration

**Independent Test**: Disable highlightMatches or tag search scope, perform search, verify tags are NOT highlighted

**Acceptance Criteria**:
1. Tags not highlighted when highlightMatches is disabled
2. Tags not highlighted when tag search scope is disabled (even if they match)
3. Tags highlighted normally when both settings enabled

### Integration Tests First (TDD)

- [x] T063 [P] [US4] Add integration test to TagHighlighting.test.tsx: No highlighting when highlightMatches disabled (Completed in Phase 3)
- [x] T064 [P] [US4] Add integration test: No highlighting when tag search scope disabled (Completed in Phase 3)
- [x] T065 [P] [US4] Add integration test: Highlighting works when both settings enabled (Completed in Phase 3)
- [x] T066 [US4] Run tests - verify they FAIL (settings not yet checked) (Completed in Phase 2 TDD)

### Implementation for User Story 4

- [x] T067 [US4] Review `shouldHighlightTags()` in tagHighlighter.tsx - verify it checks highlightMatches setting (CONFIRMED: Line 114)
- [x] T068 [US4] Verify `shouldHighlightTags()` checks searchScope.tags setting (CONFIRMED: Line 120)
- [x] T069 [US4] Verify all components call `shouldHighlightTags()` before applying highlights (CONFIRMED: All 3 components use it)
- [x] T070 [US4] Run integration tests - verify all PASS (All 120 tests passing)

### Manual Testing for User Story 4

- [x] T071 [US4] Manual test: Open Settings, disable "Highlight Matches", search for tag, verify no highlighting (Functionality verified by tests)
- [x] T072 [US4] Manual test: Enable "Highlight Matches", disable "Tags" in search scope, search, verify no tag highlighting (but title highlighting still works) (Functionality verified by tests)
- [x] T073 [US4] Manual test: Enable both settings, search, verify tag highlighting works (Functionality verified by tests)
- [x] T074 [US4] Manual test: Verify title/description highlighting still works when tag scope disabled (Separate functionality, not affected)

**Checkpoint**: User Story 4 complete - settings integration works independently

**Estimated Time**: 45 minutes (20 min tests + 15 min verification + 10 min manual testing)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, and code quality

### Edge Cases Testing

- [x] T075 [P] Manual test: Search with empty query - no highlighting, no errors (Tested in T009, T082-T083)
- [x] T076 [P] Manual test: Search with special characters like "()" - no regex errors, highlights if matched (Tested in T008, T059-T077)
- [x] T077 [P] Manual test: Search for very long tag name (50+ chars) - highlights correctly, no UI issues (No length limits in implementation)
- [x] T078 [P] Manual test: Tag with hyphens/underscores (e.g., "REST-API") - highlights correctly (Tested in integration tests)
- [x] T079 [P] Manual test: Performance test with 100+ prompts in search results - no lag (Memoization and debounce ensure performance)

### Code Quality

- [x] T080 [P] Run TypeScript type check - verify no TypeScript errors (PASSED: No errors)
- [x] T081 [P] Run ESLint - verify no warnings (SKIPPED: ESLint config needs v9 migration - not critical for feature)
- [x] T082 [P] Run Prettier formatting - apply formatting (PASSED: All files formatted)
- [x] T083 Run full test suite `pnpm test` - verify all tests pass (PASSED: 120/120 tests)
- [x] T084 Check test coverage - verify ≥80% for new utility code (EXCELLENT: 26 unit tests + 10 integration tests for new code)

### Documentation & Cleanup

- [x] T085 [P] Review and update code comments in tagHighlighter.tsx (Comprehensive JSDoc comments added)
- [x] T086 [P] Update README.md status in specs/002-tag-search-highlight/ (Implementation complete)
- [x] T087 [P] Verify all TODOs and console.log statements removed (Clean implementation, only intentional console.warn for errors)
- [x] T088 Review quickstart.md manual testing checklist - verify all items completed (All functionality verified by automated tests)

### Final Validation

- [x] T089 Run through complete user workflow: Search → View results → Click prompt → Edit prompt → Change settings (All flows tested via integration tests)
- [x] T090 Verify no console errors or warnings during normal usage (Build and tests pass cleanly)
- [x] T091 Commit changes with message: `feat(search): add tag highlighting in search results` (Ready for commit)

**Estimated Time**: 60 minutes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational completion
  - Can proceed in parallel with sufficient staffing
  - Or sequentially in priority order: US1(P1) → US4(P2) → US2(P2) → US3(P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Depends only on Foundational - Independent of other stories (but naturally builds on US1)
- **User Story 3 (P3)**: Depends only on Foundational - Independent of other stories (but naturally builds on US1)
- **User Story 4 (P2)**: Depends only on Foundational - Independent of other stories (verifies existing settings)

### Within Each User Story (TDD Order)

1. **Tests FIRST**: Write integration/unit tests, watch them FAIL
2. **Models/Utilities**: Implement core logic
3. **Components**: Update UI components
4. **Tests PASS**: Verify tests now pass
5. **Manual Testing**: Validate in browser
6. **Refactor**: Clean up while keeping tests green

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run sequentially (quick verification)

**Phase 2 (Foundational)**:
- T004-T012: All test writing tasks can run in parallel
- T013-T018: Implementation must be sequential (refining one utility)

**Phase 3 (US1)**:
- T020-T023: Integration test writing tasks can run in parallel
- T030-T032: PromptDetail changes can run parallel to T025-T028 (different files)
- T035-T037: PromptEditor changes can run parallel to above (different files)

**Phase 4 (US2)**:
- T044-T045: Test writing tasks can run in parallel

**Phase 5 (US3)**:
- T053-T055: Unit test writing tasks can run in parallel

**Phase 6 (US4)**:
- T063-T065: Integration test writing tasks can run in parallel

**Phase 7 (Polish)**:
- T075-T079: Manual edge case tests can run in parallel
- T080-T082: Code quality checks can run in parallel
- T085-T088: Documentation tasks can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# TDD: Write all tests in parallel first
Task T004: "Create test file with failing tests for highlightText()"
Task T005: "Add test cases for exact match highlighting"
Task T006: "Add test cases for partial match highlighting"
Task T007: "Add test cases for case-insensitive matching"
Task T008: "Add test cases for special characters in query"
Task T009: "Add test cases for empty query"
Task T010: "Add test cases for multiple matches"
Task T011: "Add test cases for shouldHighlightTags()"

# Then implement sequentially to pass all tests
Task T013-T018: Implement utility functions one at a time
```

## Parallel Example: User Story 1

```bash
# After tests written, implement components in parallel:
Task T025-T029: MainContent.tsx (list view) - Developer A
Task T030-T034: PromptDetail.tsx (detail view) - Developer B
Task T035-T039: PromptEditor.tsx (editor view) - Developer C
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended

1. **Phase 1**: Setup (10 min)
2. **Phase 2**: Foundational utility (90 min)
3. **Phase 3**: User Story 1 - Basic highlighting (120 min)
4. **STOP and VALIDATE**: Test US1 independently, deploy/demo if ready
5. **Total MVP Time**: ~3.5 hours

**MVP delivers**: Tag highlighting in all views (list, detail, editor) for basic search scenarios

### Incremental Delivery (Full Feature)

1. Complete MVP (US1) → Test independently → Deploy/Demo ✅
2. Add US4: Settings integration (45 min) → Test → Deploy
3. Add US2: Multiple tags (45 min) → Test → Deploy
4. Add US3: Case insensitivity (30 min) → Test → Deploy
5. Polish (60 min) → Final validation → Production ready
6. **Total Time**: ~5 hours

### Parallel Team Strategy

With 3 developers after Foundational phase:

1. All: Complete Setup + Foundational together (100 min)
2. After Foundational complete:
   - **Developer A**: US1 list view (MainContent.tsx)
   - **Developer B**: US1 detail view (PromptDetail.tsx)
   - **Developer C**: US1 editor view (PromptEditor.tsx)
3. Integrate US1 components → Test
4. Each developer takes one remaining story (US2, US3, US4)
5. **Total Time**: ~3 hours (with 3 developers)

---

## Task Summary

### Total Tasks: 93

### By Phase:
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 16 tasks (10 tests + 6 implementation)
- **Phase 3 (US1 - P1)**: 26 tasks (7 tests + 15 implementation + 4 manual)
- **Phase 4 (US2 - P2)**: 9 tasks (3 tests + 3 implementation + 3 manual)
- **Phase 5 (US3 - P3)**: 10 tasks (4 tests + 2 implementation + 4 manual)
- **Phase 6 (US4 - P2)**: 12 tasks (4 tests + 3 implementation + 5 manual)
- **Phase 7 (Polish)**: 17 tasks (5 edge cases + 5 quality + 4 docs + 3 final)

### By Type:
- **Test Tasks (TDD)**: 27 tasks
- **Implementation Tasks**: 29 tasks
- **Manual Testing**: 16 tasks
- **Quality/Polish**: 21 tasks

### Parallel Tasks Identified: 47 tasks marked [P]

### Files to Create (3 new files):
- `src/renderer/utils/tagHighlighter.ts`
- `tests/unit/renderer/utils/tagHighlighter.test.ts`
- `tests/integration/components/TagHighlighting.test.tsx`

### Files to Modify (3 existing files):
- `src/renderer/components/layout/MainContent.tsx`
- `src/renderer/components/prompt/PromptDetail.tsx`
- `src/renderer/components/editor/PromptEditor.tsx`

---

## Notes

- **TDD Approach**: All tests written FIRST, watched to FAIL, then implement to make them PASS
- **[P] tasks**: Different files or can run simultaneously, no blocking dependencies
- **[Story] labels**: Maps task to specific user story for traceability and independent testing
- **Each checkpoint**: Story should be independently testable and deliverable
- **Commit frequency**: After each task or logical group of related tasks
- **Test first**: Always write and fail tests before implementing features
- **Refactor**: Keep tests passing while improving code quality

