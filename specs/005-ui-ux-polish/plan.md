# Implementation Plan: UI/UX Polish

**Branch**: `005-ui-ux-polish` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ui-ux-polish/spec.md`

## Summary

This feature consolidates and polishes multiple UI/UX aspects across the application:
1. **Unified LLM Settings**: Merge separate LLM call and title generation settings into a single tab with shared provider selection
2. **Always-Visible Favorite Toggle**: Display star icon on all prompt cards for improved discoverability
3. **Improved Shortcut List Spacing**: Add 16px margins to shortcut settings list
4. **Streamlined Modal Closing**: Remove redundant Cancel button from prompt use modal

Technical approach: Component refactoring following existing React/TypeScript patterns, maintaining TDD discipline with tests written first.

## Technical Context

**Language/Version**: TypeScript 5.6+  
**Primary Dependencies**: React 18.3+, Electron 32.0+, Zustand 4.5+ (state management), Tailwind CSS 3.4+  
**Storage**: Local file system (~/Promptory), SQLite 5.1+ for metadata caching  
**Testing**: Vitest 2.x with React Testing Library, jsdom environment  
**Target Platform**: Electron desktop app (macOS 10.15+, Windows 10+, Linux Ubuntu 18.04+)  
**Project Type**: Electron application (main process + renderer process separation)  
**Performance Goals**: <100ms UI response time, no blocking operations on main thread  
**Constraints**: Must maintain cross-platform compatibility, all operations async for responsiveness  
**Scale/Scope**: 26 React components, 75 existing tests (20 unit + 55 integration), ~100 prompts per typical user

**Existing Architecture**:
- **Main Process** (`src/main/`): File system operations, IPC handlers, LLM services
- **Renderer Process** (`src/renderer/`): React UI, Zustand stores, user interactions  
- **Preload** (`src/preload/`): Secure IPC bridge with window.electronAPI
- **Shared** (`src/shared/`): TypeScript types, IPC channel constants, domain models

**Current Settings Architecture**:
- Separate components: `LLMSettings.tsx` (provider config), `TitleGenerationSettings.tsx` (title gen config)
- Separate Zustand stores per feature area
- IPC channels: `LLM_PROVIDER_*` and `LLM_TITLE_CONFIG_*`
- Settings persisted via main process to file system

**Current Prompt Display**:
- `MainContent.tsx`: Renders prompt list with conditional favorite star (`{prompt.metadata.favorite && <star/>}`)
- `PromptMetadata` interface has `favorite: boolean` field
- No favorite toggle button visible on non-favorited prompts

**Current Modal Architecture**:
- `ParameterInputModal.tsx`: Prompt use modal with X icon + Cancel button
- Backdrop click closes modal (existing behavior)
- ESC key closes modal (existing behavior)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**All features must comply with the seven core principles:**

- [x] **I. Test-Driven Development (NON-NEGOTIABLE)**: Tests will be written FIRST for all component changes, verified to FAIL, then implemented following Red-Green-Refactor cycle. Unit tests for validation logic, integration tests for IPC interactions
- [x] **II. Component Modularity**: Feature maintains clear main/renderer separation - all UI changes in renderer components, settings persistence in main process via IPC. Components remain single-purpose (settings, modal, card)
- [x] **III. Type Safety**: All new/modified types explicitly defined in `src/shared/types/`, no loose `any` types, proper TypeScript strict mode enforcement
- [x] **IV. User Experience First**: Improves UX through consolidated settings, always-visible favorites, consistent spacing, streamlined modal. Maintains keyboard shortcuts (ESC for modal close), real-time feedback, responsive design
- [x] **V. Cross-Platform Consistency**: Changes are pure UI/layout - no platform-specific code. Works on macOS/Windows/Linux with Tailwind CSS responsive utilities
- [x] **VI. Performance & Responsiveness**: No performance impact - only UI adjustments. Favorite toggle uses debouncing (300ms) to prevent race conditions. All operations remain async and non-blocking
- [x] **VII. Security & Privacy**: No security implications - UI-only changes. Existing credential encryption, input validation, IPC security maintained unchanged

**Complexity Justification Required If:**
- Adding new process or service that overlaps existing functionality → **NOT APPLICABLE**: Using existing stores and IPC channels
- Introducing new external dependency → **NOT APPLICABLE**: No new dependencies required
- Creating abstractions that could be avoided → **NOT APPLICABLE**: Refactoring existing components, not adding abstractions
- Adding non-standard patterns not present in codebase → **NOT APPLICABLE**: Following established React component patterns

**Constitution Compliance**: ✅ ALL CHECKS PASSED - No violations, no complexity justification required

## Project Structure

### Documentation (this feature)

```text
specs/005-ui-ux-polish/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── llm-settings-unified.contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main/
│   ├── handlers/          # IPC handlers (minimal changes)
│   ├── services/          # Business logic services (no changes needed)
│   └── utils/             # Utilities (no changes needed)
│
├── renderer/
│   ├── components/
│   │   ├── settings/
│   │   │   ├── LLMSettings.tsx              # MODIFY: Merge with title generation
│   │   │   ├── TitleGenerationSettings.tsx  # REMOVE: Merge into LLMSettings
│   │   │   ├── ShortcutSettings.tsx         # MODIFY: Add margins
│   │   │   └── SettingsModal.tsx            # MODIFY: Update tab structure
│   │   ├── prompt/
│   │   │   └── ParameterInputModal.tsx      # MODIFY: Remove Cancel button
│   │   └── layout/
│   │       └── MainContent.tsx              # MODIFY: Always show favorite star
│   │
│   ├── stores/
│   │   └── useLLMStore.ts                   # VERIFY: May need minor adjustments
│   │
│   └── types/                                # (Note: types are in src/shared/)
│
├── shared/
│   ├── types/
│   │   ├── llm.ts                           # MODIFY: Unified config types
│   │   └── prompt.ts                        # VERIFY: No changes expected
│   └── constants/
│       └── ipcChannels.ts                   # VERIFY: May need channel consolidation
│
└── preload/                                  # No changes needed

tests/
├── unit/
│   ├── renderer/
│   │   └── components/
│   │       ├── settings/
│   │       │   ├── LLMSettings.test.tsx           # NEW: Unified settings tests
│   │       │   └── ShortcutSettings.test.tsx      # NEW: Margin tests
│   │       └── prompt/
│   │           └── ParameterInputModal.test.tsx   # NEW: Modal closing tests
│   └── services/                            # No new tests needed
│
└── integration/
    └── ui/
        ├── favorite-toggle.test.tsx         # NEW: Favorite star integration tests
        └── settings-persistence.test.tsx    # NEW: Unified settings persistence
```

**Structure Decision**: 
- **Electron desktop app** with main/renderer process separation maintained
- All UI changes isolated to **renderer process** components
- IPC layer adjustments minimal (possibly consolidate channels)
- Tests colocated in `tests/` directory following existing organization pattern
- Shared types updated in `src/shared/types/` for cross-process consistency

## Complexity Tracking

> **No complexity violations** - This feature refactors existing components following established patterns without adding architectural complexity.

**Justification for "No Entry Required"**:
- Uses existing Zustand stores and IPC channels (no new services or abstractions)
- Consolidates two settings components into one (reduces complexity)
- Component changes are straightforward UI adjustments
- No new external dependencies or frameworks
- Follows existing React component patterns throughout codebase

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | *N/A* | *N/A* |
