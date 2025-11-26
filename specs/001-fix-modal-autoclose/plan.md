# Implementation Plan: Fix Modal Auto-Close Setting Connection

**Branch**: `001-fix-modal-autoclose` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-modal-autoclose/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Problem**: The parameter input modal's auto-close behavior is disconnected from the global "auto-close modal" setting in application settings. The modal uses a hardcoded local state value instead of reading from `useAppStore().settings.autoCloseModal`, causing user confusion when their preference is not respected.

**Solution**: Update `ParameterInputModal.tsx` to read the global `autoCloseModal` setting from Zustand store and use it to initialize the local state. The local checkbox remains for per-session overrides but doesn't persist globally.

**Impact**: Low risk, single component change. No new dependencies, no API changes, no data migrations. Fixes a UX inconsistency that violates user expectations.

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

**Affected Component**: `src/renderer/components/prompt/ParameterInputModal.tsx`  
**State Management**: Zustand store `useAppStore` - reading `settings.autoCloseModal`  
**Existing State**: Local useState hook with hardcoded `true` value  
**Change Type**: Bug fix - state synchronization  
**Performance Goals**: No performance impact (reading from existing state)  
**Constraints**: Must not break existing modal functionality (keyboard shortcuts, validation, error handling)  
**Scale/Scope**: Single component change, affects all users who use the settings panel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Promptory-Specific Gates:**

- [x] **File-Based Transparency**: ✅ N/A - No file storage changes, only UI state synchronization
- [x] **Type Safety**: ✅ TypeScript strict mode maintained, using existing typed interfaces from useAppStore
- [x] **Testing**: ✅ Component test planned for modal initialization with global setting
- [x] **Security**: ✅ N/A - No file operations, no user input handling changes
- [x] **UX**: ✅ No UX changes - existing keyboard shortcuts and behavior preserved, only fixes setting sync
- [x] **Component Architecture**: ✅ Modification to existing component in correct location (components/prompt/)
- [x] **Error Handling**: ✅ No new error scenarios introduced, existing error handling preserved
- [x] **i18n**: ✅ No new strings, existing translation keys remain unchanged

**Complexity Justification**: None required

- ❌ NOT adding new Electron process or IPC pattern
- ❌ NOT introducing new state management approach (using existing Zustand)
- ❌ NOT adding new dependencies
- ❌ NOT breaking existing file format
- ❌ NOT deviating from established architecture patterns

**Constitution Check Result**: ✅ **ALL GATES PASSED** - This is a compliant bug fix

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

### Files Modified (this fix)

```text
src/renderer/components/prompt/
└── ParameterInputModal.tsx         # MODIFIED - Add useAppStore import, read settings.autoCloseModal

tests/integration/components/
└── ParameterInputModal.test.tsx    # NEW - Test modal initialization with global setting
```

**Change Summary**:
- **1 file modified**: ParameterInputModal.tsx (~5 line change)
- **1 test file added**: Component integration test
- **0 files created**: No new components
- **0 dependencies added**: Using existing Zustand store

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - Constitution check passed all gates. No complexity justification required.

## Phase 0: Research (Complete) ✅

**Status**: ✅ Complete  
**Output**: [research.md](./research.md)

**Summary**:
- Analyzed root cause: Hardcoded `useState(true)` instead of reading from global settings
- Evaluated 3 alternative solutions, selected best approach
- Identified implementation: 2-line change (import + initialization)
- Confirmed low risk, no dependencies needed
- Estimated implementation time: 15 minutes

**Key Decisions**:
1. **Use Zustand store for initialization** - Existing pattern, type-safe, no new dependencies
2. **Keep local state for per-session overrides** - Maintains current UX, prevents unintended global changes
3. **No two-way sync** - Avoids complexity, matches user expectations per spec

**Risks Assessed**: Very low (1/5) - Isolated change, existing infrastructure, no breaking changes

## Phase 1: Design & Contracts (Complete) ✅

**Status**: ✅ Complete  
**Outputs**: 
- [data-model.md](./data-model.md)
- [contracts/ParameterInputModal.contract.md](./contracts/ParameterInputModal.contract.md)
- [quickstart.md](./quickstart.md)
- `.cursor/rules/specify-rules.mdc` (updated)

**Data Model Summary**:
- **Global State**: `useAppStore().settings.autoCloseModal` (boolean, persisted)
- **Local State**: `autoClose` (boolean, per-session, resets on modal reopen)
- **State Flow**: Global (init) → Local (use) → Reset (on close)
- **No schema changes**: Using existing data structures

**Component Contract Summary**:
- **Props**: `prompt`, `isOpen`, `onClose` (unchanged)
- **Behavior Fix**: Initialize `autoClose` from `settings.autoCloseModal` instead of hardcoded `true`
- **Guarantees**: Type-safe, i18n support, keyboard accessible, error resilient
- **Contract Violation**: Currently broken settings sync - will be fixed

**Testing Strategy**:
- 7 manual test scenarios documented in quickstart
- 6 automated test cases planned
- Test fixtures for enabled/disabled states
- Multi-language verification required

**Constitution Re-Check** (Post-Design): ✅ **STILL PASSING**

- [x] File-Based Transparency: No changes
- [x] Type Safety: Maintained (using typed `settings` object)
- [x] Testing: Test plan complete (6 test cases)
- [x] Security: No security implications
- [x] UX: Improves UX (fixes user confusion)
- [x] Component Architecture: Clean modification to existing component
- [x] Error Handling: Preserved (no changes to error paths)
- [x] i18n: No new strings (existing translations work)

## Phase 2: Ready for Tasks Generation

**Next Command**: `/speckit.tasks`

**What's Ready**:
- ✅ Complete problem analysis
- ✅ Solution validated
- ✅ Data model documented
- ✅ Component contract defined
- ✅ Testing strategy planned
- ✅ Manual testing guide ready
- ✅ Agent context updated

**Implementation Complexity**: **Very Low**
- 1 file to modify (`ParameterInputModal.tsx`)
- 2 lines to add/change (import + useState initialization)
- 1 test file to create (component integration test)
- ~15 minutes estimated implementation time

**Confidence Level**: **High** (95%)
- Simple synchronization fix
- Clear requirements
- Existing infrastructure supports solution
- Low regression risk
- Easy to test and verify
