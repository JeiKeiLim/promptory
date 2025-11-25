# Tasks: Automatic LLM Response Title Generation

**Input**: Design documents from `/specs/004-llm-response-titles/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Per Constitution Principle I (Test-Driven Development), tests are MANDATORY and MUST be written BEFORE implementation. All test tasks MUST precede their corresponding implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **ID**: Sequential number (T001, T002, ...)
- **[P]**: Parallelizable (optional marker)
- **[Story]**: User Story label ([US1], [US2], [US3]) - required for user story phases
- **Description**: Clear action with exact file path

---

## Phase 1: Setup & Infrastructure

**Purpose**: Initialize project environment and verify baseline

**Checkpoint**: Development environment ready, baseline tests passing

- [X] T001 Verify current test suite passes (pnpm test) - baseline: 291 tests passing
- [X] T002 Create feature branch 004-llm-response-titles if not exists
- [X] T003 [P] Review research.md technical decisions for implementation guidance
- [X] T004 [P] Review data-model.md entity definitions
- [X] T005 [P] Review contracts/title-generation-ipc.md IPC channel definitions
- [X] T006 Install dependencies if needed (pnpm install)
- [X] T007 Run pnpm build to verify build system works

---

## Phase 2: Foundational Types & Schema

**Purpose**: Extend shared types and database schema (blocking prerequisites for all user stories)

**Checkpoint**: Type definitions compile, schema extensions ready

### Type Extensions (MUST complete before any user story)

- [X] T008 [P] Extend LLMResponseMetadata interface in src/shared/types/llm.ts with title fields (generatedTitle, titleGenerationStatus, titleGeneratedAt, titleModel)
- [X] T009 [P] Add TitleGenerationStatus type ('pending' | 'completed' | 'failed') in src/shared/types/llm.ts
- [X] T010 [P] Add TitleGenerationConfig interface in src/shared/types/llm.ts
- [X] T011 [P] Add TitleStatusEvent interface in src/shared/types/llm-ipc.ts
- [X] T012 Run pnpm build to verify types compile with strict mode

### Database Schema Extensions (MUST complete before any user story)

- [X] T013 Create migrations subdirectory if needed (src/main/database/migrations/) and add migration script to add title columns to llm_responses table (generated_title, title_generation_status, title_generated_at, title_model). If migrations pattern not used, update LLMStorageService.ts schema initialization directly.
- [X] T014 Add index on title_generation_status column in migration script
- [X] T015 Test migration script on development database
- [X] T016 Verify backward compatibility: Existing responses load correctly with NULL title fields

**Checkpoint**: All foundational types compile, schema ready for title storage

---

## Phase 3: User Story 1 - Automatic Title Generation (Priority: P1) - MVP

**Goal**: Core functionality - automatically generate descriptive titles for LLM responses

**Independent Test**: Make an LLM call, wait for title generation to complete, verify response shows title in history list instead of just model name

### Tests for User Story 1 (REQUIRED per Constitution TDD Principle) ✅

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation**
> 
> Following Principle I (Test-Driven Development):
> - RED: Write failing test
> - GREEN: Minimal implementation to pass
> - REFACTOR: Improve design while keeping tests green

- [X] T017 [P] [US1] Write unit test for TitleGenerationService.generateTitle() in tests/unit/services/TitleGenerationService.test.ts (RED phase - test should FAIL)
- [X] T018 [P] [US1] Write unit test for title prompt template generation and word count validation (5-8 words) in tests/unit/services/TitleGenerationService.test.ts (RED phase)
- [X] T019 [P] [US1] Write unit test for title validation/truncation logic in tests/unit/services/TitleGenerationService.test.ts (RED phase)
- [X] T020 [P] [US1] Write integration test for complete title generation flow in tests/integration/title-generation-flow.test.ts (RED phase - test should FAIL)
- [X] T021 [P] [US1] Write integration test for title persistence in SQLite in tests/integration/title-generation-flow.test.ts (RED phase)
- [X] T022 [P] [US1] Write integration test for title persistence in markdown frontmatter in tests/integration/title-generation-flow.test.ts (RED phase)
- [X] T023 Run pnpm test to verify all new tests FAIL (RED phase confirmation)

### Implementation for User Story 1

- [X] T024 [US1] Create TitleGenerationService class in src/main/services/TitleGenerationService.ts with generateTitle() method (GREEN phase)
- [X] T024a [US1] Add timestamp logging for title generation duration in TitleGenerationService (start/end timestamps) to enable SC-002 measurement (95% complete within 30s)
- [X] T025 [US1] Implement title generation prompt templates (system and user prompts) in src/main/services/TitleGenerationService.ts
- [X] T026 [US1] Implement title validation (5-8 word count), truncation logic (>150 chars), and character limit enforcement in src/main/services/TitleGenerationService.ts
- [ ] T027 [US1] Integrate TitleGenerationService with existing provider infrastructure in src/main/services/TitleGenerationService.ts
- [ ] T028 [US1] Implement timeout handling (30s default) in src/main/services/TitleGenerationService.ts
- [X] T029 Run pnpm test to verify unit tests PASS (GREEN phase confirmation)
- [X] T030 [US1] Extend LLMStorageService.saveResponse() in src/main/services/LLMStorageService.ts to save title fields to SQLite
- [X] T031 [US1] Extend FileService markdown writing in src/main/services/FileService.ts to include title fields in YAML frontmatter
- [X] T032 [US1] Extend FileService markdown reading in src/main/services/FileService.ts to parse title fields from YAML frontmatter
- [X] T033 Run pnpm test to verify integration tests PASS (GREEN phase confirmation)
- [ ] T034 [US1] Integrate title generation as post-processing in RequestQueue in src/main/services/RequestQueue.ts (add postProcessing hook support)
- [ ] T035 [US1] Add title generation call to LLM response completion handler in src/main/handlers/llmHandlers.ts
- [ ] T036 Run pnpm test to verify all US1 tests PASS
- [ ] T037 [US1] REFACTOR: Extract prompt constants to separate file if needed
- [ ] T038 [US1] REFACTOR: Add error handling improvements
- [ ] T039 Run pnpm test to verify refactoring didn't break tests (REFACTOR phase confirmation)

### UI for User Story 1

- [ ] T040 [P] [US1] Write unit test for ResponseListItem component with title display in tests/unit/renderer/components/ResponseListItem.test.tsx (RED phase)
- [ ] T041 [P] [US1] Write unit test for loading indicator display in tests/unit/renderer/components/ResponseListItem.test.tsx (RED phase)
- [ ] T042 [P] [US1] Write unit test for title vs model name display logic in tests/unit/renderer/components/ResponseListItem.test.tsx (RED phase)
- [ ] T043 Run pnpm test to verify UI tests FAIL (RED phase confirmation)
- [ ] T044 [US1] Create ResponseListItem component in src/renderer/components/llm/ResponseListItem.tsx (GREEN phase)
- [ ] T045 [US1] Implement title display with prominent styling in src/renderer/components/llm/ResponseListItem.tsx
- [ ] T046 [US1] Implement model name as secondary info display in src/renderer/components/llm/ResponseListItem.tsx
- [ ] T047 [US1] Implement loading indicator for title generation in src/renderer/components/llm/ResponseListItem.tsx
- [ ] T048 [US1] Extend useLLMStore in src/renderer/stores/useLLMStore.ts to add titleGenerationLoading Map
- [ ] T049 [US1] Add updateResponseTitle action to useLLMStore in src/renderer/stores/useLLMStore.ts
- [ ] T050 [US1] Add setTitleLoading action to useLLMStore in src/renderer/stores/useLLMStore.ts
- [ ] T051 Run pnpm test to verify UI tests PASS (GREEN phase confirmation)
- [ ] T052 [US1] Integrate ResponseListItem into LLMResponsePanel in src/renderer/components/llm/LLMResponsePanel.tsx
- [ ] T053 Run pnpm test && pnpm build to verify US1 complete

### IPC for User Story 1

- [ ] T054 [P] [US1] Write integration test for 'llm:title:status' event listener in tests/integration/ipc/titleGenerationHandlers.test.ts (RED phase)
- [ ] T055 Run pnpm test to verify IPC tests FAIL (RED phase confirmation)
- [ ] T056 [US1] Implement IPC event emitter for title status updates in src/main/services/TitleGenerationService.ts
- [ ] T057 [US1] Extend preload API in src/preload/llm.ts to expose onTitleStatus listener
- [ ] T058 [US1] Implement IPC listener in useLLMStore or custom hook in src/renderer/stores/useLLMStore.ts
- [ ] T059 Run pnpm test to verify IPC tests PASS (GREEN phase confirmation)

**Checkpoint**: User Story 1 complete - automatic title generation works end-to-end with UI updates

---

## Phase 4: User Story 2 - Configurable Title Generation Settings (Priority: P2)

**Goal**: Allow users to configure title generation (enable/disable, model selection, timeout)

**Independent Test**: Open settings, change title generation configuration, make LLM calls, verify configured behavior is applied

### Tests for User Story 2 (REQUIRED per Constitution TDD Principle) ✅

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T060 [P] [US2] Write integration test for llm:title:config:get IPC handler in tests/integration/ipc/titleGenerationHandlers.test.ts (RED phase)
- [ ] T061 [P] [US2] Write integration test for llm:title:config:set IPC handler with validation in tests/integration/ipc/titleGenerationHandlers.test.ts (RED phase)
- [ ] T062 [P] [US2] Write unit test for config validation (timeout 10-120 seconds) in tests/unit/handlers/titleGenerationHandlers.test.ts (RED phase)
- [ ] T063 [P] [US2] Write integration test for enable/disable toggle affecting title generation in tests/integration/title-generation-flow.test.ts (RED phase)
- [ ] T064 Run pnpm test to verify US2 tests FAIL (RED phase confirmation)

### Implementation for User Story 2

- [ ] T065 [US2] Implement getTitleGenerationConfig() in LLMStorageService in src/main/services/LLMStorageService.ts (GREEN phase)
- [ ] T066 [US2] Implement updateTitleGenerationConfig() with validation in LLMStorageService in src/main/services/LLMStorageService.ts (GREEN phase)
- [ ] T067 [US2] Add IPC handler for 'llm:title:config:get' in src/main/handlers/llmHandlers.ts (GREEN phase)
- [ ] T068 [US2] Add IPC handler for 'llm:title:config:set' with validation in src/main/handlers/llmHandlers.ts (GREEN phase)
- [ ] T069 [US2] Extend preload API in src/preload/llm.ts to expose getTitleConfig and setTitleConfig
- [ ] T070 Run pnpm test to verify US2 IPC tests PASS (GREEN phase confirmation)
- [ ] T071 [US2] Update TitleGenerationService to check config.enabled before generating titles in src/main/services/TitleGenerationService.ts
- [ ] T072 [US2] Update TitleGenerationService to use config.selectedModel and config.selectedProvider in src/main/services/TitleGenerationService.ts
- [ ] T073 [US2] Update TitleGenerationService to respect config.timeoutSeconds in src/main/services/TitleGenerationService.ts
- [ ] T074 Run pnpm test to verify all US2 tests PASS (GREEN phase confirmation)

### UI for User Story 2

- [ ] T075 [P] [US2] Write unit test for TitleGenerationSettings component in tests/unit/renderer/components/TitleGenerationSettings.test.tsx (RED phase)
- [ ] T076 Run pnpm test to verify settings UI tests FAIL (RED phase confirmation)
- [ ] T077 [US2] Create TitleGenerationSettings component in src/renderer/components/settings/TitleGenerationSettings.tsx (GREEN phase)
- [ ] T078 [US2] Implement enable/disable toggle in TitleGenerationSettings component
- [ ] T079 [US2] Implement model selection dropdown in TitleGenerationSettings component
- [ ] T080 [US2] Implement timeout input field with validation (10-120) in TitleGenerationSettings component
- [ ] T081 [US2] Integrate TitleGenerationSettings into main settings panel in src/renderer/components/settings/SettingsPanel.tsx
- [ ] T082 Run pnpm test to verify settings UI tests PASS (GREEN phase confirmation)
- [ ] T083 Run pnpm test && pnpm build to verify US2 complete

**Checkpoint**: User Story 2 complete - users can configure title generation settings

---

## Phase 5: User Story 3 - Graceful Failure Handling (Priority: P3)

**Goal**: Handle title generation failures gracefully without disrupting user workflow

**Independent Test**: Simulate failure scenarios (timeout, network error), verify response remains accessible with fallback display

### Tests for User Story 3 (REQUIRED per Constitution TDD Principle) ✅

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T084 [P] [US3] Write integration test for timeout handling in tests/integration/title-generation-flow.test.ts (RED phase)
- [ ] T085 [P] [US3] Write integration test for network error handling in tests/integration/title-generation-flow.test.ts (RED phase)
- [ ] T086 [P] [US3] Write integration test for malformed title response handling in tests/integration/title-generation-flow.test.ts (RED phase)
- [ ] T087 [P] [US3] Write unit test for error logging without user-facing errors in tests/unit/services/TitleGenerationService.test.ts (RED phase)
- [ ] T088 [P] [US3] Write integration test for visual indicator distinguishing auto-titled vs fallback in tests/integration/components/ResponseListItem.test.tsx (RED phase)
- [ ] T089 Run pnpm test to verify US3 tests FAIL (RED phase confirmation)

### Implementation for User Story 3

- [ ] T090 [US3] Add comprehensive error handling with try-catch in TitleGenerationService.generateTitle() in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T091 [US3] Implement timeout with Promise.race in TitleGenerationService in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T092 [US3] Add error logging (console.error) without user-facing errors in TitleGenerationService in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T093 [US3] Implement fallback to model name on failure in TitleGenerationService in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T094 [US3] Update status to 'failed' on error and emit status event in TitleGenerationService in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T095 Run pnpm test to verify failure handling tests PASS (GREEN phase confirmation)
- [ ] T096 [US3] Add visual indicator (icon/badge) for fallback responses in ResponseListItem in src/renderer/components/llm/ResponseListItem.tsx
- [ ] T097 [US3] Update ResponseListItem to handle 'failed' status gracefully in src/renderer/components/llm/ResponseListItem.tsx
- [ ] T098 Run pnpm test to verify UI failure handling tests PASS (GREEN phase confirmation)
- [ ] T099 Run pnpm test && pnpm build to verify US3 complete

**Checkpoint**: User Story 3 complete - failure handling is graceful and doesn't disrupt workflow

---

## Phase 6: Edge Cases & Polish

**Purpose**: Handle edge cases and cross-cutting concerns

- [ ] T100 [P] Write unit test for short response handling (<20 words) in tests/unit/services/TitleGenerationService.test.ts (RED phase)
- [ ] T101 [P] Write unit test for long title truncation (>100 chars) in tests/unit/services/TitleGenerationService.test.ts (RED phase)
- [ ] T102 [P] Write integration test for multi-language title generation in tests/integration/title-generation-flow.test.ts (RED phase - test with Korean, Japanese samples)
- [ ] T103 Run pnpm test to verify edge case tests FAIL (RED phase confirmation)
- [ ] T104 [P] Implement short response fallback logic in TitleGenerationService in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T105 [P] Implement title truncation at word boundary in TitleGenerationService in src/main/services/TitleGenerationService.ts (GREEN phase)
- [ ] T106 [P] Add multi-language test samples and verify prompt handles language detection in tests/integration/title-generation-flow.test.ts (GREEN phase)
- [ ] T107 Run pnpm test to verify edge case tests PASS (GREEN phase confirmation)
- [ ] T108 [P] Code cleanup and refactoring (keeping all tests green per TDD principle)
- [ ] T109 [P] Add JSDoc comments to TitleGenerationService public methods
- [ ] T110 [P] Update README.md with title generation feature documentation if needed
- [ ] T111 Run pnpm lint to check code quality
- [ ] T112 Run pnpm format to format code
- [ ] T113 Run full test suite with coverage (pnpm test --coverage)
- [ ] T114 Verify test coverage meets requirements (target: >80% for new code)

**Checkpoint**: All edge cases handled, code polished and documented

---

## Phase 7: Final Validation & Documentation

**Purpose**: Comprehensive validation before merge

- [ ] T115 Run complete test suite (pnpm test) - verify all 310-320 tests pass (baseline 291 + ~20-30 new)
- [ ] T116 Run pnpm build - verify build succeeds
- [ ] T117 Manual testing: Make LLM call and verify title generation works end-to-end
- [ ] T118 Manual testing: Test with different providers (Ollama, OpenAI, Gemini if available)
- [ ] T119 Manual testing: Test configuration changes in settings panel
- [ ] T120 Manual testing: Test failure scenarios (disconnect network, timeout)
- [ ] T121 Manual testing: Test multi-language responses (English, Korean, Japanese if possible)
- [ ] T122 Verify backward compatibility: Existing responses without titles display correctly
- [ ] T123 Check that title generation respects sequential execution (doesn't block current response display)
- [ ] T124 Review all changes against constitution compliance checklist
- [ ] T125 Update CHANGELOG.md or release notes if applicable
- [ ] T126 Commit all changes with descriptive message: "feat: add automatic LLM response title generation (004-llm-response-titles)"
- [ ] T127 Push feature branch and create pull request

---

## Dependencies & Parallel Execution

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (Types & Schema) → MUST complete before ANY user story
    ↓
    ├─→ Phase 3: US1 (P1) - MVP ← Independent, can ship alone
    ├─→ Phase 4: US2 (P2) - Configuration ← Depends on US1
    └─→ Phase 5: US3 (P3) - Failure Handling ← Depends on US1
         ↓
    Phase 6: Edge Cases & Polish ← Depends on US1, US2, US3
         ↓
    Phase 7: Final Validation
```

### Parallelization Opportunities

**Phase 1 (Setup)**: Tasks T003, T004, T005 can run in parallel (independent reads)

**Phase 2 (Foundational)**:
- Type extensions (T008-T011) can all run in parallel - different type definitions
- After types compile (T012), schema tasks (T013-T016) can run in sequence

**Phase 3 (US1 - MVP)**:
- Test writing (T017-T022) can all run in parallel - independent test files
- UI tests (T040-T042) can run in parallel with service tests
- IPC test (T054) can run in parallel with other tests

**Phase 4 (US2 - Configuration)**:
- Test writing (T060-T063) can all run in parallel
- Settings UI test (T075) can run in parallel with handler tests

**Phase 5 (US3 - Failure Handling)**:
- Test writing (T084-T088) can all run in parallel

**Phase 6 (Edge Cases)**:
- Test writing (T100-T102) can all run in parallel
- Implementation (T104-T106) can run in parallel after tests written
- Polish tasks (T108-T110) can run in parallel

**Example: Parallel execution for US1 test writing**:
```bash
# Terminal 1
pnpm test tests/unit/services/TitleGenerationService.test.ts --watch

# Terminal 2
pnpm test tests/integration/title-generation-flow.test.ts --watch

# Terminal 3
pnpm test tests/unit/renderer/components/ResponseListItem.test.tsx --watch

# All three can write tests in parallel, then sync at T023 to verify all FAIL
```

---

## Implementation Strategy

### MVP Delivery (Ship Early)

**Minimum Viable Product**: User Story 1 only (Phase 3)
- Core automatic title generation working
- Titles display in UI with loading states
- Titles persist across sessions
- Can ship to users for immediate value

**Incremental Delivery**:
1. **v1.0**: US1 (MVP) - Auto-generate titles with defaults
2. **v1.1**: US1 + US2 - Add configuration options
3. **v1.2**: US1 + US2 + US3 - Production-ready with failure handling

### TDD Workflow Reminder

**For EVERY task that involves code:**

1. **RED**: Write failing test first
   ```bash
   pnpm test:watch tests/path/to/test.test.ts
   # Verify test FAILS
   ```

2. **GREEN**: Write minimal code to pass
   ```bash
   # Implement in src/...
   # Verify test PASSES
   ```

3. **REFACTOR**: Improve design while keeping tests green
   ```bash
   # Refactor code
   # Verify tests still PASS
   ```

4. **BUILD & TEST**: Before moving to next task
   ```bash
   pnpm build && pnpm test
   ```

5. **COMMIT**: Descriptive message
   ```bash
   git add .
   git commit -m "feat(title-gen): implement X (T###, US#)"
   ```

### Frequent Build & Test

**After every 3-5 tasks**:
```bash
pnpm build && pnpm test && pnpm lint
```

**Before pushing**:
```bash
pnpm test --coverage && pnpm build
```

---

## Task Summary

**Total Tasks**: 128 tasks
**Estimated Effort**: 3-5 days (with TDD discipline)

**By User Story**:
- Setup & Infrastructure (Phase 1): 7 tasks
- Foundational (Phase 2): 9 tasks
- User Story 1 (MVP): 44 tasks (including tests)
- User Story 2 (Configuration): 24 tasks (including tests)
- User Story 3 (Failure Handling): 16 tasks (including tests)
- Edge Cases & Polish (Phase 6): 15 tasks
- Final Validation (Phase 7): 13 tasks

**Test Coverage**:
- Unit tests: ~30 tests
- Integration tests: ~20 tests
- Component tests: ~15 tests
- **Total new tests**: ~65 tests
- **Target total**: ~356 tests (baseline 291 + 65 new)

**Parallel Opportunities**: 40+ tasks marked [P] can run in parallel within their phase

**Constitution Compliance**: ✅ All tasks follow TDD discipline (tests FIRST, RED-GREEN-REFACTOR)

---

**Status**: Tasks ready for implementation. Follow TDD workflow strictly: Write test → Verify FAIL → Implement → Verify PASS → Refactor → Test again → Commit.
