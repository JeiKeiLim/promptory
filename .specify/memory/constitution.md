<!--
SYNC IMPACT REPORT
==================
Version Change: TEMPLATE → 1.0.0
Type: MAJOR - Initial ratification establishing project governance

Principles Established:
- I. Test-Driven Development (NON-NEGOTIABLE)
- II. Component Modularity
- III. Type Safety
- IV. User Experience First
- V. Cross-Platform Consistency
- VI. Performance & Responsiveness
- VII. Security & Privacy

Sections Added:
- Core Principles (7 principles)
- Technical Constraints
- Development Workflow
- Governance

Templates Requiring Updates:
✅ .specify/templates/spec-template.md - Updated with TDD acceptance criteria format
✅ .specify/templates/plan-template.md - Updated with TDD constitution check
✅ .specify/templates/tasks-template.md - Updated with TDD task structure (tests before implementation)

Rationale for Version 1.0.0:
- Initial constitution ratification
- Establishes fundamental project governance
- Codifies existing TDD practices observed in codebase (75 tests: 20 unit + 55 integration)
- Sets architectural principles for Electron desktop app with React frontend

Next Actions:
- Validate templates consistency
- Ensure all future PRs reference constitution compliance
- Review against existing codebase for alignment
-->

# Promptory Constitution

## Core Principles

### I. Test-Driven Development (NON-NEGOTIABLE)

**All features MUST follow strict TDD discipline:**

- Tests written FIRST, approved by stakeholders, verified to FAIL, then and only then implement
- Red-Green-Refactor cycle strictly enforced: RED (failing test) → GREEN (minimal implementation) → REFACTOR (improve design)
- Unit tests MUST cover business logic, utilities, pure functions (target: models, services, utils)
- Integration tests MUST cover IPC communication, file system operations, store interactions, UI workflows
- NO code merged without accompanying tests demonstrating the change
- Test files MUST be colocated with source: `tests/unit/`, `tests/integration/`, organized by domain
- Vitest framework with React Testing Library for component testing, jsdom environment for browser simulation

**Rationale:** Quality and maintainability are non-negotiable. TDD prevents regressions, enables safe refactoring, serves as living documentation, and ensures features work before shipping. The existing test suite (75 tests) demonstrates this commitment.

### II. Component Modularity

**Architecture MUST maintain clear separation between main and renderer processes:**

- **Main process** (`src/main/`): Electron native operations, file system access, IPC handlers, database operations, system services
- **Renderer process** (`src/renderer/`): React UI components, state management (Zustand), user interactions, visual presentation
- **Preload scripts** (`src/preload/`): Secure IPC bridge between main and renderer, expose only necessary APIs
- **Shared** (`src/shared/`): TypeScript types, interfaces, constants, domain models used by both processes

**Services MUST be single-purpose and independently testable:**

- FileService: CRUD operations on markdown prompt files
- CredentialService: Secure credential storage and encryption
- LLMStorageService: LLM provider configuration persistence
- ParameterSubstitutionService: Template parameter parsing and substitution
- RequestQueue: LLM request queuing and concurrency management

**Components MUST be composable and reusable:**

- Atomic design principles: atoms (Button, Input) → molecules (SearchBar) → organisms (PromptEditor) → templates (MainLayout) → pages (App)
- Props-driven, minimal internal state
- Custom hooks for logic extraction (usePromptStore, useLLMStore, useSearch)

**Rationale:** Modularity reduces coupling, enables parallel development, simplifies testing, and ensures each piece has a clear responsibility. Electron's process isolation enforces this naturally.

### III. Type Safety

**TypeScript MUST be used throughout with strict mode enabled:**

- NO `any` types except where absolutely necessary (external library boundaries) - use `unknown` and type guards instead
- ALL function parameters, return values, and React props MUST have explicit types
- Shared types MUST be defined in `src/shared/types/` for consistency across processes
- Zustand stores MUST have typed state and actions
- IPC channels MUST use typed interfaces for request/response payloads

**Type definitions MUST be comprehensive:**

```typescript
// Example: Prompt type with complete domain model
interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  category: string;
  favorite: boolean;
  parameters: Parameter[];
  metadata: PromptMetadata;
}
```

**Rationale:** TypeScript catches errors at compile time, provides excellent IDE support, serves as inline documentation, and enables safe refactoring. The codebase already enforces strict mode across all modules.

### IV. User Experience First

**Every feature MUST prioritize user experience and accessibility:**

- **Keyboard shortcuts** for all primary actions (Cmd/Ctrl+N for new, Cmd/Ctrl+F for search, ESC for cancel)
- **Real-time feedback** via toast notifications, loading states, progress indicators
- **Search-driven navigation** with fuzzy search (Fuse.js), tag/category filtering, instant results
- **Markdown support** with Monaco Editor for rich text editing and live preview
- **File watching** for external changes with automatic synchronization and conflict resolution
- **Responsive design** with Tailwind CSS, adapts to window resizing, maintains usability at all sizes
- **i18n ready** with react-i18next for multi-language support

**Error handling MUST be user-friendly:**

- Clear, actionable error messages (not technical stack traces)
- Toast notifications for transient issues
- Modal dialogs for decisions requiring user input
- Graceful degradation when features unavailable

**Rationale:** Users are the reason this application exists. A beautiful, fast, intuitive interface drives adoption and satisfaction. The existing keyboard shortcut system and search functionality demonstrate this commitment.

### V. Cross-Platform Consistency

**Application MUST provide consistent experience across macOS, Windows, and Linux:**

- Electron Builder configurations for all platforms in `package.json`
- Platform-specific icons and assets in `build/` directory (icon.icns, icon.ico, icon.png)
- Path handling uses Node.js path module for cross-platform compatibility
- File system operations respect platform conventions (line endings, permissions, home directory)
- Keyboard shortcuts adapt to platform conventions (Cmd on macOS, Ctrl on Windows/Linux)
- Native dialogs and menus follow platform HIG (Human Interface Guidelines)

**Build targets:**

- macOS: 10.15+, Universal binary (Intel x64 + Apple Silicon arm64), ZIP distribution
- Windows: Windows 10+, NSIS installer + portable exe, x64 and ia32 architectures
- Linux: Ubuntu 18.04+, AppImage, deb, and rpm packages, x64 architecture

**Rationale:** Users expect native behavior on their platform. Cross-platform consistency without platform-specific quirks erodes trust. Electron enables this with appropriate configuration.

### VI. Performance & Responsiveness

**Application MUST remain fast and responsive under all conditions:**

- **Startup time**: < 3 seconds to fully loaded UI
- **Search latency**: < 100ms for typical prompt library (< 1000 items), debounced to 300ms for real-time typing
- **File operations**: Asynchronous with loading indicators, never block UI thread
- **Memory efficiency**: < 200MB RAM for typical usage (100 prompts), proper cleanup of listeners and subscriptions
- **LLM request handling**: Queue-based with configurable concurrency (default: 3), prevents overwhelming APIs
- **Token counting**: Lazy computation, cached results, only when displaying usage stats

**Optimization strategies:**

- React component memoization (React.memo, useMemo, useCallback) for expensive computations
- Virtualized lists for large datasets (not yet implemented but planned for 1000+ prompts)
- Debounced search input (300ms) to reduce unnecessary re-renders
- Lazy loading of Monaco Editor (code splitting)
- Efficient Zustand state updates (immutable updates, selective subscriptions)

**Rationale:** Performance is a feature. Slow software frustrates users and wastes time. The existing search debounce and request queue demonstrate performance consciousness.

### VII. Security & Privacy

**User data MUST be protected with industry-standard practices:**

- **Local-first storage**: All prompts stored in user's local file system (`~/Promptory` by default), no cloud sync without explicit opt-in
- **Credential encryption**: LLM API keys encrypted at rest using node:crypto, secure credential storage service
- **No telemetry by default**: Application does not phone home, respects user privacy
- **XSS protection**: Electron contextIsolation enabled, nodeIntegration disabled in renderer, all IPC through preload scripts
- **Input validation**: All user inputs sanitized, YAML front matter parsing with js-yaml (safe mode), parameter injection protection
- **File system isolation**: Prompts only read/written within configured project directory, no arbitrary file access

**Security checklist for new features:**

- [ ] Credentials never logged or exposed in UI
- [ ] User input sanitized before file system operations
- [ ] IPC channels use typed, validated payloads
- [ ] External data (LLM responses) treated as untrusted
- [ ] Dependencies regularly audited (`pnpm audit`)

**Rationale:** User trust is paramount. Promptory handles potentially sensitive prompts and API credentials. Security breaches destroy reputation and harm users.

## Technical Constraints

### Technology Stack

**Frontend (Renderer Process):**

- React 18.3+ with TypeScript 5.6+
- Zustand 4.5+ for state management (lightweight, minimal boilerplate)
- Tailwind CSS 3.4+ for styling (utility-first, consistent design system)
- Monaco Editor 4.6+ for code editing (VS Code engine)
- Fuse.js 7.0+ for fuzzy search
- react-i18next 16.0+ for internationalization

**Backend (Main Process):**

- Electron 32.0+ (Chromium + Node.js runtime)
- Node.js 18+ (LTS version for stability)
- Chokidar 3.6+ for file watching
- SQLite 5.1+ for local caching (optional metadata cache)
- js-yaml 4.1+ for YAML front matter parsing

**Build & Development:**

- Vite 6.0+ for fast development server and bundling
- Vitest 2.x for testing (unified with Vite configuration)
- Electron Builder 25.1+ for app packaging and distribution
- ESLint + Prettier for code quality and formatting
- pnpm as package manager (efficient, strict, deterministic)

### File Format & Storage

**Prompt files:**

- Markdown (`.md`) with YAML front matter
- UTF-8 encoding
- YAML front matter for metadata (title, description, tags, category, favorite)
- Body content for prompt template with `{{parameter}}` syntax
- Example:

```markdown
---
title: "Blog Post Generator"
description: "Generates blog posts"
tags: ["writing", "blog"]
category: "writing"
favorite: false
---

# Blog Post: {{title}}

Write a blog post about {{topic}} for {{audience}}.
```

**Storage location:**

- Default: `~/Promptory` (expandable user home directory)
- Configurable via settings (user can choose different directory)
- Flat structure or category-based subdirectories (user preference)

### Development Environment

**Required tools:**

- Node.js 18+ (LTS version)
- pnpm 9.0+ (package manager)
- Git for version control
- Platform-specific build tools (Xcode CLI tools for macOS, Visual Studio Build Tools for Windows)

**Development commands:**

- `pnpm dev` - Start development server (Vite + Electron)
- `pnpm test` - Run all tests (unit + integration)
- `pnpm test:watch` - Watch mode for TDD
- `pnpm lint` - Check code quality
- `pnpm build` - Build for production
- `pnpm dist` - Package application for distribution

## Development Workflow

### Feature Development Process

**Phase 1: Specification**

1. Create feature specification in `specs/###-feature-name/spec.md` using template
2. Define user stories with acceptance criteria (Given-When-Then format)
3. Identify functional requirements (FR-001, FR-002, etc.)
4. Document success criteria (measurable outcomes)
5. Clarify ambiguities with stakeholders

**Phase 2: Planning**

1. Generate implementation plan in `specs/###-feature-name/plan.md`
2. Document technical context (architecture, dependencies, constraints)
3. Create data model in `specs/###-feature-name/data-model.md` if feature involves new entities
4. Define API contracts in `specs/###-feature-name/contracts/` for IPC channels
5. Perform constitution check against all seven principles
6. Justify any complexity that violates simplicity principle

**Phase 3: Task Breakdown**

1. Generate task list in `specs/###-feature-name/tasks.md`
2. Organize tasks by user story (enable independent delivery)
3. Mark parallelizable tasks with `[P]` prefix
4. Test tasks MUST precede implementation tasks
5. Each task includes exact file paths

**Phase 4: TDD Implementation**

1. Write failing tests for next task (RED phase)
2. Run tests to verify they fail (`pnpm test`)
3. Implement minimal code to make tests pass (GREEN phase)
4. Run tests to verify they pass
5. Refactor code for quality (REFACTOR phase)
6. Run tests again to ensure refactoring didn't break anything
7. Commit with descriptive message
8. Mark task complete in `tasks.md`
9. Repeat for next task

**Phase 5: Review & Validation**

1. Run full test suite (`pnpm test`)
2. Run linter (`pnpm lint`)
3. Perform manual testing of user journeys
4. Verify constitution compliance
5. Update documentation if needed
6. Create pull request with spec reference
7. Address review feedback
8. Merge to main branch

### Code Review Standards

**Every PR MUST include:**

- Link to feature specification (`specs/###-feature-name/spec.md`)
- Description of what changed and why
- Tests demonstrating the change works
- Constitution compliance checklist (which principles apply)
- Screenshots/demo for UI changes

**Reviewers MUST verify:**

- Tests exist and pass
- TDD discipline followed (tests written first)
- Type safety maintained (no loose `any` types)
- Code follows existing patterns and conventions
- Documentation updated where relevant
- No performance regressions
- Security implications considered

### Commit Message Convention

Follow conventional commits format:

- `feat: Add LLM integration with Ollama provider` - New feature
- `fix: Prevent race condition in file watcher` - Bug fix
- `test: Add integration tests for IPC handlers` - Test additions
- `refactor: Extract parameter parsing into service` - Code refactoring
- `docs: Update README with keyboard shortcuts` - Documentation
- `chore: Upgrade Electron to v32` - Maintenance

Include issue/PR reference when applicable: `feat: Add dark mode support (#42)`

### Branch Strategy

- `main` - Production-ready code, protected branch
- `###-feature-name` - Feature branches from main, numbered sequentially
- PR required to merge to main
- Squash commits on merge for clean history
- Delete feature branch after merge

## Governance

### Authority & Precedence

This Constitution supersedes all other development practices, guidelines, and conventions. In case of conflict between this document and any other source, the Constitution takes precedence.

### Amendment Process

**Constitution amendments require:**

1. Proposal documenting change rationale
2. Impact analysis on existing codebase and templates
3. Version bump following semantic versioning:
   - MAJOR: Backward-incompatible governance changes, principle removal/redefinition
   - MINOR: New principle added, material expansion of guidance
   - PATCH: Clarifications, wording improvements, non-semantic refinements
4. Update of dependent templates (spec-template.md, plan-template.md, tasks-template.md)
5. Sync impact report prepended to constitution as HTML comment

### Compliance Review

**All PRs MUST verify constitution compliance before merge:**

- [ ] TDD discipline followed (tests written first, verified to fail, then implementation)
- [ ] Component modularity maintained (clear separation of concerns)
- [ ] Type safety enforced (explicit types, no loose `any`)
- [ ] User experience considered (keyboard shortcuts, error handling, responsiveness)
- [ ] Cross-platform compatibility verified (if affects native features)
- [ ] Performance impact assessed (no UI blocking, efficient state updates)
- [ ] Security reviewed (credential handling, input validation, IPC security)

### Complexity Justification

When a feature violates the simplicity principle or adds significant complexity:

1. Document in implementation plan's "Complexity Tracking" section
2. Explain why complexity is necessary
3. Document simpler alternatives considered and rejected
4. Justify with specific technical requirements or constraints
5. Include mitigation strategy (how to manage the added complexity)

### Exception Process

Constitution principles are intentionally strong and aspirational. If a principle genuinely cannot be followed:

1. Document the exception request with detailed rationale
2. Propose alternative approach that satisfies principle's intent
3. Get stakeholder approval
4. Document in feature specification
5. Consider if constitution needs amendment

### Living Document

This Constitution is a living document. It evolves with the project:

- Regular reviews (quarterly or after major milestones)
- Amendments proposed based on lessons learned
- Obsolete sections removed or updated
- New principles added as project scales

**Version**: 1.0.0 | **Ratified**: 2025-11-24 | **Last Amended**: 2025-11-24
