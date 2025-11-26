# Implementation Plan: Direct LLM Integration for Prompts

**Branch**: `003-llm-integration` | **Date**: 2025-11-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-llm-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to call LLM providers (Ollama as MVP, plus OpenAI, Azure OpenAI, Gemini) directly from within the application. Users can execute prompts with parameter substitution, view responses in a side panel with history, and manage results per prompt. Technical approach uses hybrid storage (SQLite for metadata, Markdown files for response content), sequential API call queue, and per-provider timeout configuration. UI features side panel attached to ParameterInputModal, per-prompt badges for new results, and global queue indicator with "Cancel All" functionality.

## Technical Context

**Promptory Stack (Reference - adjust if feature requires):**

**Language/Version**: TypeScript 5.6+ (strict mode), Node.js 24.7.0 LTS  
**Primary Framework**: Electron 32+, React 18, Vite 6+  
**State Management**: Zustand (with persistence middleware)  
**Storage**: Local file system (Markdown + YAML), SQLite3 (cache/index)  
**UI Components**: Tailwind CSS, Headless UI, Monaco Editor  
**Testing**: Vitest, React Testing Library, jsdom  
**Build/Deploy**: electron-builder, pnpm  
**Target Platform**: Desktop (macOS, Windows, Linux)  
**Project Type**: Electron Desktop Application  

**Feature-Specific Context**:

**New Dependencies**:
- Ollama API client (HTTP fetch, no external library needed)
- OpenAI SDK (`openai` npm package)
- Azure OpenAI SDK (part of `openai` package)  
- Google Generative AI SDK (`@google/generative-ai` npm package)
- Electron safeStorage API (built-in, no extra dependency)

**Performance Goals**:
- API call response handling: <100ms overhead (excluding LLM processing time)
- Side panel rendering with 1000 results: <500ms
- Real-time file existence checks: <50ms per batch of 20 results
- Badge indicator updates: <100ms
- Background SQLite cleanup: <1s on app start

**Constraints**:
- Per-provider timeout configurable (default: 120 seconds)
- Sequential API call processing (one at a time, FIFO queue)
- Response history: 1000 entries per prompt maximum
- File-based response content: `.promptory/llm_results/{prompt-id}/{response-id}.md`
- SQLite for metadata only (not for response content)

**Scale/Scope**:
- Support 4 LLM providers (Ollama, OpenAI, Azure OpenAI, Gemini)
- Handle 1000+ stored responses per prompt without performance degradation
- Support concurrent prompts with isolated result histories
- Global queue can handle 10+ pending requests efficiently

**App Lifecycle**:
- On graceful quit: Cancel all pending/in-progress requests (completed responses already saved)
- On app launch: Check for orphaned queue state (from unexpected kill/crash) and clear it
- Queue state is in-memory only (not persisted to disk)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Promptory-Specific Gates:**

- [x] **File-Based Transparency**: ✅ PASS - Response content stored as `.md` files in `.promptory/llm_results/{prompt-id}/{response-id}.md`. SQLite only for metadata (fast querying). Users can view/edit/backup response files manually. Aligns with Principle I.
- [x] **Type Safety**: ✅ PASS - All new code will use TypeScript strict mode. Typed interfaces for all entities (LLM Provider Configuration, Model Definition, LLM Request, LLM Response). IPC communication will use typed interfaces from `@shared/types`.
- [x] **Testing**: ✅ PASS - Unit tests planned for: LLM service, API clients, parameter substitution, queue management, file operations. Integration tests for: IPC handlers, provider configuration, end-to-end API calls (mocked). Component tests for: side panel, badges, modal interactions.
- [x] **Security**: ✅ PASS - API credentials stored via Electron safeStorage (OS-level keychain). File paths validated through PathValidator. User input (parameters, model names) sanitized. IPC channels whitelisted. No direct eval of user input.
- [x] **UX**: ✅ PASS - Loading indicators with elapsed time. Per-prompt badges + global queue indicator. Cancel button (individual + "Cancel All"). User-friendly error messages. Keyboard shortcuts deferred to post-MVP but documented for future. All requirements specify immediate feedback.
- [x] **Component Architecture**: ✅ PASS - New components organized under `components/llm/` (LLMSidePanel, LLMResultItem, LLMQueueIndicator, LLMBadge). Reuses existing ParameterInputModal (extended). New service: LLMService in `services/`. Clear separation main/renderer.
- [x] **Error Handling**: ✅ PASS - Graceful degradation: manual file deletion handled via filtering + background cleanup. Timeout errors show retry option. Network errors allow retry. Missing credentials prompt user. All edge cases documented with recovery paths (13+ scenarios).
- [x] **i18n**: ✅ PASS - All user-facing strings will use translation keys. Error messages, button labels, status indicators will support ko/en/ja. Translation keys organized under `llm.*` namespace (e.g., `llm.callButton`, `llm.errors.timeout`).

**Complexity Justification**:

| Item | Justification | Alternatives Rejected |
|------|---------------|----------------------|
| 3 new npm packages (openai, @google/generative-ai) | Required for cloud provider support. Official SDKs provide type safety, error handling, and API compatibility. | Manual HTTP calls rejected: lack of type safety, maintenance burden, no streaming support for future. |
| Hybrid storage (SQLite + file system) | Balances performance (SQLite queries) with transparency (human-readable .md files). Aligns with File-Based Transparency principle while enabling fast filtering/searching. | Pure file system rejected: slow queries for 1000+ entries. Pure SQLite rejected: violates transparency principle, no manual inspection. |
| New IPC channels (llm:call, llm:cancel, llm:getHistory, etc.) | LLM operations require main process for API calls (security). Standard Electron IPC pattern already established in project. | Direct renderer API calls rejected: security risk (exposes credentials), violates Electron best practices. |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (Promptory Structure)

```text
src/
├── main/                          # Electron Main Process
│   ├── services/                  # Business logic services
│   │   ├── FileService.ts
│   │   ├── CacheService.ts
│   │   ├── SearchService.ts
│   │   └── FileWatcherService.ts
│   ├── handlers/                  # IPC handlers
│   │   ├── fileHandlers.ts
│   │   ├── dialogHandlers.ts
│   │   └── windowHandlers.ts
│   ├── utils/                     # Utilities
│   │   ├── yamlParser.ts
│   │   ├── pathValidator.ts
│   │   └── environment.ts
│   ├── database/                  # SQLite schema
│   │   └── schema.sql
│   └── main.ts                    # Main process entry
│
├── renderer/                      # React Renderer Process
│   ├── components/                # React components by feature
│   │   ├── layout/
│   │   ├── sidebar/
│   │   ├── prompt/
│   │   ├── search/
│   │   ├── editor/
│   │   ├── parameter/
│   │   ├── settings/
│   │   └── common/                # Reusable components
│   ├── stores/                    # Zustand state management
│   │   ├── useAppStore.ts
│   │   ├── usePromptStore.ts
│   │   └── useTemplateStore.ts
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Renderer utilities
│   ├── i18n/                      # Internationalization
│   │   └── locales/
│   │       ├── ko.json
│   │       ├── en.json
│   │       └── ja.json
│   ├── styles/                    # Global styles
│   └── App.tsx                    # React app entry
│
├── shared/                        # Shared types and constants
│   ├── types/
│   │   ├── prompt.ts
│   │   ├── ipc.ts
│   │   └── template.ts
│   └── constants/
│       └── ipcChannels.ts
│
└── preload/                       # Preload scripts
    └── preload.ts                 # Context bridge

tests/
├── unit/                          # Unit tests
│   ├── services/
│   ├── utils/
│   └── renderer/
└── integration/                   # Integration tests
    ├── ipc/
    ├── filesystem/
    ├── stores/
    └── components/
```

**Architecture**: Electron + React + TypeScript with clear process separation (main/renderer/preload)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
