# Implementation Plan: Automatic LLM Response Title Generation

**Branch**: `004-llm-response-titles` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-llm-response-titles/spec.md`

**Note**: This plan follows strict TDD discipline per Constitution Principle I. All tests MUST be written first, verified to fail, then implemented.

## Summary

**Primary Requirement**: Automatically generate short, descriptive titles (5-8 words) for LLM responses to make response history scannable without clicking into each response.

**Technical Approach**: 
- Extend existing LLM infrastructure (RequestQueue, providers) to support title generation as sequential post-processing after main response
- Add TitleGenerationService to orchestrate title generation using a separately configured LLM model
- Extend LLMResponseMetadata with title fields and persist to both SQLite (LLMStorageService) and markdown frontmatter (FileService)
- Update UI components to display titles prominently with loading states
- Title generation blocks next queued LLM call but not main response display (sequential execution model)

## Technical Context

**Language/Version**: TypeScript 5.6+ (strict mode enabled)
**Primary Dependencies**: 
- Electron 32.0+ (main process for title generation service)
- React 18.3+ (renderer process for UI components)
- Zustand 4.5+ (state management for title generation config and display)
- Existing LLM infrastructure: RequestQueue, LLMStorageService, providers (Ollama, OpenAI, Gemini)

**Storage**: 
- SQLite via LLMStorageService (fast queries, metadata cache)
- Markdown files via FileService (human-readable persistence, YAML frontmatter)
- Hybrid storage pattern already established for LLM responses

**Testing**: 
- Vitest 2.x with React Testing Library
- jsdom environment for browser simulation
- Current baseline: 291 tests passing (22 test files)
- TDD mandatory: RED → GREEN → REFACTOR cycle

**Target Platform**: Cross-platform desktop (macOS, Windows, Linux) via Electron
**Project Type**: Electron desktop app with main/renderer process separation

**Performance Goals**: 
- Title generation completes <30s for 95% of responses
- Main response display never blocked by title generation
- UI remains responsive during title generation (loading indicators)

**Constraints**: 
- Sequential execution: LLM call #1 → title #1 → LLM #2 → title #2
- Title generation blocks next main LLM call but not current response display
- Title generation considered part of parent LLM call (not counted separately in UI)
- Must work with all 3 providers (Ollama, OpenAI, Gemini)

**Scale/Scope**: 
- Typical response history: 10-50 recent responses
- Title length: 5-8 words (max 150 chars stored, truncated to 100 for display)
- Default timeout: 30 seconds
- Failure rate target: <5%

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**All features must comply with the seven core principles:**

- [x] **I. Test-Driven Development (NON-NEGOTIABLE)**: Tests will be written FIRST for TitleGenerationService, title storage/retrieval, UI components. All tests verified to FAIL before implementation. Red-Green-Refactor cycle strictly enforced.
- [x] **II. Component Modularity**: Clear separation maintained - TitleGenerationService in main process, UI components in renderer, IPC handlers for communication. Extends existing services (LLMStorageService, FileService) without modification.
- [x] **III. Type Safety**: All types explicitly defined in `src/shared/types/llm.ts` (extend LLMResponseMetadata with title fields). No `any` types. Typed IPC channels for title generation requests.
- [x] **IV. User Experience First**: Loading indicators during generation, prominent title display, silent failure handling. Keyboard shortcuts not needed (automated feature). Real-time UI updates when titles generated.
- [x] **V. Cross-Platform Consistency**: Works on all platforms via existing Electron infrastructure. No platform-specific code required.
- [x] **VI. Performance & Responsiveness**: Async title generation never blocks UI. Sequential execution prevents overwhelming APIs. Configurable 30s timeout. Main response display immediate.
- [x] **VII. Security & Privacy**: Title generation uses same encrypted credential system as main LLM calls. No additional security surface. Titles stored locally in same hybrid pattern (SQLite + markdown).

**Complexity Justification Required If:**
- Adding new process or service that overlaps existing functionality → **NO**: TitleGenerationService has clear single purpose (generate titles), delegates to existing RequestQueue/providers
- Introducing new external dependency → **NO**: Uses existing LLM infrastructure
- Creating abstractions that could be avoided → **NO**: Title generation naturally fits as service pattern consistent with codebase
- Adding non-standard patterns not present in codebase → **NO**: Follows established patterns (service layer, IPC handlers, Zustand stores, hybrid storage)

## Project Structure

### Documentation (this feature)

```text
specs/004-llm-response-titles/
├── plan.md              # This file (implementation plan)
├── spec.md              # Requirements and user stories
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (usage examples)
├── contracts/           # Phase 1 output (IPC channel definitions)
│   └── title-generation-ipc.ts
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
# Electron desktop app structure (existing)
src/
├── main/                # Main process (Node.js/Electron)
│   ├── services/
│   │   ├── LLMStorageService.ts          # EXTEND: Add title fields to metadata
│   │   ├── FileService.ts                # EXTEND: Add title to markdown frontmatter
│   │   ├── RequestQueue.ts               # USE: Queue title generation after main response
│   │   ├── TitleGenerationService.ts     # NEW: Orchestrate title generation
│   │   └── providers/                    # USE: Existing provider implementations
│   │       ├── OllamaProvider.ts
│   │       ├── OpenAIProvider.ts
│   │       └── GeminiProvider.ts
│   └── handlers/
│       └── llmHandlers.ts                # EXTEND: Add title generation IPC handlers
├── renderer/            # Renderer process (React)
│   ├── components/
│   │   └── llm/
│   │       ├── LLMResponsePanel.tsx      # EXTEND: Display titles with loading states
│   │       └── ResponseListItem.tsx      # NEW: Response history item with title
│   └── stores/
│       └── useLLMStore.ts                # EXTEND: Add title generation config and loading state
├── shared/              # Shared types between processes
│   └── types/
│       ├── llm.ts                        # EXTEND: Add title types to LLMResponseMetadata
│       └── llm-ipc.ts                    # EXTEND: Add title generation IPC types
└── preload/
    └── llm.ts                            # EXTEND: Expose title generation IPC

tests/
├── unit/
│   ├── services/
│   │   └── TitleGenerationService.test.ts    # NEW: Title generation logic tests
│   └── renderer/
│       └── components/
│           └── ResponseListItem.test.tsx     # NEW: Response list item with title tests
└── integration/
    ├── title-generation-flow.test.ts         # NEW: End-to-end title generation test
    └── ipc/
        └── titleGenerationHandlers.test.ts   # NEW: IPC handler integration tests
```

**Structure Decision**: Uses existing Electron desktop app structure with main/renderer separation. Title generation fits naturally as a service in the main process, with UI components in renderer process. Follows established patterns (services, IPC handlers, Zustand stores).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No complexity violations identified.** This feature:
- Uses existing service patterns (TitleGenerationService follows same pattern as ParameterSubstitutionService)
- Extends existing storage (LLMStorageService, FileService) without breaking changes
- Leverages established infrastructure (RequestQueue, providers, IPC handlers)
- Follows TDD discipline throughout
- Maintains clear main/renderer separation
- No new external dependencies introduced
