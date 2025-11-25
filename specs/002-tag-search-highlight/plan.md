# Implementation Plan: Tag Search Highlighting

**Branch**: `002-tag-search-highlight` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-tag-search-highlight/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add visual highlighting to tags in search results when they match the search query. This feature enhances user understanding of why prompts appear in search results by applying the same yellow highlight style (bg-yellow-200 text-yellow-900) used for title/description matching. Highlighting applies across both list view (plain text) and detail/editor views (badge components), respecting existing user settings (highlightMatches preference and search scope configuration).

**Primary Requirement**: When users search for prompts and the search term matches tags, highlight the matching portions of tags in real-time across all UI contexts.

**Technical Approach**: Extend the existing `highlightMatch` function in MainContent.tsx to support tag highlighting, create a reusable tag highlighting utility, and apply it to both plain text tag displays and badge components throughout the application.

## Technical Context

**Promptory Stack (Reference - adjusted for this feature):**

**Language/Version**: TypeScript 5.6+ (strict mode), Node.js 24.7.0 LTS  
**Primary Framework**: Electron 32+, React 18, Vite 6+  
**State Management**: Zustand (with persistence middleware)  
**Storage**: Local file system (Markdown + YAML), SQLite3 (cache/index)  
**UI Components**: Tailwind CSS, Headless UI, Monaco Editor  
**Testing**: Vitest, React Testing Library, jsdom  
**Build/Deploy**: electron-builder, pnpm  
**Target Platform**: Desktop (macOS, Windows, Linux)  
**Project Type**: Electron Desktop Application  

**Feature-Specific Context:**

**Search Engine**: Fuse.js (already in use for fuzzy search with title, tags, content)  
**Highlighting Pattern**: Already exists in MainContent.tsx for title/description matching  
**Performance Goals**: Maintain <200ms search response time (existing performance)  
**Constraints**: 
- Must respect user settings (highlightMatches, searchScope)
- Must preserve tag click functionality
- Must work with existing tag rendering in multiple contexts

**Scale/Scope**: 
- Applies to all tag displays during active search
- Handles up to 1000 prompts with multiple tags per prompt
- Real-time highlighting as user types (300ms debounce already in place)

**Affected Components**:
- `src/renderer/components/layout/MainContent.tsx` (list view, plain text tags)
- `src/renderer/components/prompt/PromptDetail.tsx` (detail view, badge tags)
- `src/renderer/components/editor/PromptEditor.tsx` (editor view, badge tags)

**Deferred (Optional Enhancement)**:
- `src/renderer/components/sidebar/Sidebar.tsx` (sidebar tag filter list - deferred pending user feedback)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Promptory-Specific Gates:**

- [x] **File-Based Transparency**: ✅ No changes to file storage - purely UI enhancement
- [x] **Type Safety**: ✅ All new code will use TypeScript strict mode, typed props for tag highlighting function
- [x] **Testing**: ✅ Unit tests planned for tag highlighting utility, integration tests for UI components
- [x] **Security**: ✅ No file paths or user input involved - purely display logic using existing search query
- [x] **UX**: ✅ Enhances existing search UX, respects user preferences, maintains <200ms performance
- [x] **Component Architecture**: ✅ Reusable utility in `src/renderer/utils/`, applied across existing feature components
- [x] **Error Handling**: ✅ Graceful degradation if highlighting fails (shows plain text)
- [x] **i18n**: ✅ No new user-facing strings - visual highlighting only

**Complexity Justification Required If:**
- ❌ Adding new Electron process or IPC pattern - NOT NEEDED (renderer-only feature)
- ❌ Introducing new state management approach - NOT NEEDED (uses existing search state)
- ❌ Adding new dependencies - NOT NEEDED (uses existing React and Tailwind)
- ❌ Breaking existing file format - NOT APPLICABLE (no file format changes)
- ❌ Deviating from established architecture patterns - NOT NEEDED (follows existing highlight pattern)

**Result**: ✅ ALL GATES PASSED - No complexity justification needed

## Project Structure

### Documentation (this feature)

```text
specs/002-tag-search-highlight/
├── spec.md              # Feature specification (completed)
├── checklists/
│   └── requirements.md  # Quality checklist (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (generated below)
├── data-model.md        # Phase 1 output (generated below)
├── quickstart.md        # Phase 1 output (generated below)
├── contracts/           # Phase 1 output (not needed - UI only)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (Promptory Structure)

**Files to Modify:**
```text
src/renderer/
├── components/
│   ├── layout/
│   │   └── MainContent.tsx          # [MODIFY] Extend tag highlighting in list view
│   ├── prompt/
│   │   └── PromptDetail.tsx         # [MODIFY] Add tag highlighting in badge view
│   ├── editor/
│   │   └── PromptEditor.tsx         # [MODIFY] Add tag highlighting in editor tags
│   └── sidebar/
│       └── Sidebar.tsx              # [OPTIONAL/DEFERRED] May add highlighting in future based on feedback
├── utils/
│   └── tagHighlighter.ts            # [CREATE] New utility for tag highlighting logic
└── i18n/
    └── locales/
        ├── ko.json                  # [NO CHANGE] No new strings needed
        ├── en.json                  # [NO CHANGE] No new strings needed
        └── ja.json                  # [NO CHANGE] No new strings needed

tests/
├── unit/
│   └── renderer/
│       └── utils/
│           └── tagHighlighter.test.ts  # [CREATE] Unit tests for highlighting logic
└── integration/
    └── components/
        └── TagHighlighting.test.tsx    # [CREATE] Integration tests for UI components
```

**Architecture**: Renderer-only feature extending existing search highlighting pattern

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this section is not needed.

## Phase 0: Research & Design Decisions

See [research.md](./research.md) for detailed findings.

**Key Decisions:**
1. **Reusability Pattern**: Create shared `highlightText` utility that works for both plain text and React elements
2. **Badge Highlighting**: Apply highlighting within badge spans to preserve styling and click handlers
3. **Settings Integration**: Check both `highlightMatches` and `searchScope.tags` before applying
4. **Performance**: Leverage existing memoization patterns and 300ms debounce

## Phase 1: Technical Design

See detailed design artifacts:
- [data-model.md](./data-model.md) - Data flow and component interfaces
- [quickstart.md](./quickstart.md) - Implementation guide for developers

## Next Steps

After this planning phase is complete:

1. **Run `/speckit.tasks`** to break down implementation into specific tasks
2. **Begin implementation** following the task breakdown
3. **Write tests first** (TDD approach per constitution)
4. **Test manually** across all affected UI contexts
5. **Verify settings integration** (highlightMatches and searchScope)

**Estimated Complexity**: Low
- **Effort**: 4-6 hours
- **Risk**: Low (extends existing pattern, no architectural changes)
- **Dependencies**: None (all required code already exists)
