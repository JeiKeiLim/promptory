# SpecKit Slash Commands for GitHub Copilot CLI

When you use SpecKit slash commands in your messages, I'll recognize and execute them automatically.

## Available Slash Commands

### `/specify <description>`
Create a feature specification from natural language description.

**Usage:**
```
/specify Add user authentication with OAuth2 and JWT tokens
/specify Implement dark mode toggle with theme persistence
```

**What I do:**
- Run `create-new-feature.sh` with your description
- Create feature branch (e.g., `004-feature-name`)
- Generate `spec.md` with requirements
- Validate specification quality
- Ask clarification questions if needed

---

### `/clarify`
Identify and resolve ambiguities in the current specification.

**Usage:**
```
/clarify
```

**What I do:**
- Run `check-prerequisites.sh --json --paths-only`
- Load current `spec.md`
- Identify ambiguous requirements (max 5 questions)
- Ask targeted clarification questions
- Update `spec.md` with your answers

---

### `/plan`
Generate technical implementation plan from specification.

**Usage:**
```
/plan
```

**What I do:**
- Run `setup-plan.sh --json`
- Generate `plan.md` with architecture decisions
- Create `data-model.md` with entities
- Generate API contracts in `contracts/`
- Create `research.md` for technical decisions
- Update agent context

---

### `/tasks`
Generate actionable task breakdown from plan and spec.

**Usage:**
```
/tasks
```

**What I do:**
- Run `check-prerequisites.sh --json`
- Load `plan.md` and `spec.md`
- Generate `tasks.md` organized by user stories
- Define dependencies and execution order
- Mark parallelizable tasks with [P]
- Include file paths for each task

---

### `/checklist <type>`
Create quality validation checklists.

**Usage:**
```
/checklist ux
/checklist security
/checklist api
```

**Types available:**
- `ux` - User experience & UI requirements
- `api` - API design & endpoints
- `security` - Security requirements & threat model
- `performance` - Performance targets & metrics
- `test` - Testing coverage & scenarios
- `deployment` - Deployment readiness

**What I do:**
- Run `check-prerequisites.sh --json`
- Generate checklist in `checklists/<type>.md`
- Create "unit tests for requirements" (not implementation tests)
- Validate requirement completeness and clarity

---

### `/analyze`
Validate cross-artifact consistency and quality.

**Usage:**
```
/analyze
```

**What I do:**
- Run `check-prerequisites.sh --json --require-tasks --include-tasks`
- Analyze `spec.md`, `plan.md`, `tasks.md`
- Detect gaps, ambiguities, duplications
- Check constitution compliance
- Generate detailed analysis report
- Suggest remediation actions

---

### `/implement`
Execute implementation tasks from tasks.md.

**Usage:**
```
/implement
/implement T001-T005
/implement next 3
```

**What I do:**
- Run `check-prerequisites.sh --json --require-tasks --include-tasks`
- Validate all checklists are complete (warn if not)
- Execute tasks in order from `tasks.md`
- Respect dependencies and parallel markers [P]
- Mark completed tasks as [X]
- Report progress

---

### `/status`
Show current feature status and progress.

**Usage:**
```
/status
```

**What I show:**
- Current git branch
- Available artifacts (spec.md, plan.md, tasks.md, etc.)
- Task completion progress (X/Y completed, Z%)
- Checklist status (✅ passed / ⏳ in progress)
- Next recommended action

---

### `/list`
List all features in the project.

**Usage:**
```
/list
```

**What I show:**
- All feature directories in `specs/`
- Status indicators (📄=spec 📋=plan ✅=tasks)
- Feature numbers and names

---

### `/constitution`
View or update project principles and governance.

**Usage:**
```
/constitution
/constitution update
```

**What I do:**
- Load `.specify/memory/constitution.md`
- Display project principles
- Update if requested
- Sync changes across templates

---

## Usage Examples

### Starting a New Feature

```
You: /specify Add real-time notifications with WebSocket

Me: [Executes speckit.specify workflow]
    ✅ Created branch: 004-realtime-notifications
    ✅ Generated spec.md with requirements
    
    Found 2 areas needing clarification:
    Q1: Should notifications persist across sessions?
    Q2: What's the maximum notification retention period?

You: Yes to persistence, 30 days retention

Me: ✅ Spec updated with clarifications
    Ready for planning phase

You: /plan

Me: [Executes speckit.plan workflow]
    ✅ Technical plan created
    ✅ Data model: Notification, User entities
    ✅ WebSocket contracts generated
    
    Ready for checklist or task generation

You: /checklist security

Me: ✅ Generated checklists/security.md
    - 25 security requirement validation items
    - Authentication for WebSocket connections
    - XSS protection for notification content
    - Rate limiting specifications

You: /tasks

Me: ✅ Generated tasks.md
    - Phase 1: Setup (5 tasks)
    - Phase 2: Foundation (8 tasks)
    - Phase 3: User Story 1 (15 tasks)
    - Phase 4: Polish (6 tasks)
    Total: 34 tasks

You: /analyze

Me: ✅ Analysis complete
    - All requirements have task coverage
    - No critical issues found
    - Constitution compliance verified
    
    Ready for implementation!

You: /implement next 3

Me: [Executes T001-T003]
    ✅ T001: Install ws package
    ✅ T002: Create WebSocket server file
    ✅ T003: Add connection handler
    
    Progress: 3/34 tasks completed (9%)
```

### Resuming Work

```
You: /status

Me: Branch: 004-realtime-notifications
    
    Artifacts:
      ✅ spec.md
      ✅ plan.md
      ✅ tasks.md
      ✅ checklists/ (2 files)
    
    Task Progress: 15/34 tasks completed (44%)
    
    Checklist Status:
      ✅ security.md: 25/25
      ⏳ performance.md: 8/12
    
    Next task: T016 - Implement notification persistence

You: /implement T016

Me: [Executes task T016]
    ✅ Implemented notification persistence service
    ✅ Marked T016 complete in tasks.md
    
    Progress: 16/34 tasks completed (47%)
```

### Checking Progress

```
You: /list

Me: 📚 Available Features:
    📄📋✅ 001-fix-modal-autoclose
    📄📋✅ 002-tag-search-highlight
    📄📋✅ 003-llm-integration
    📄📋✅ 004-realtime-notifications (current)
    
    Legend: 📄=spec 📋=plan ✅=tasks

You: /status

Me: [Shows detailed status for current feature]
```

## Alternative Syntax

You can also use natural language - I'll understand:

| Slash Command | Natural Language |
|---------------|------------------|
| `/specify X` | "Create a spec for X" |
| `/clarify` | "Clarify the spec" |
| `/plan` | "Generate the plan" |
| `/tasks` | "Generate tasks" |
| `/checklist ux` | "Create a UX checklist" |
| `/analyze` | "Analyze the artifacts" |
| `/implement` | "Implement the tasks" |
| `/status` | "What's the status?" |
| `/list` | "List all features" |

Both work the same way!

## Command Reference Quick Card

```
Core Workflow:
  /specify <description>  → Create feature specification
  /clarify                → Resolve ambiguities
  /plan                   → Generate implementation plan
  /tasks                  → Generate task breakdown
  /implement [tasks]      → Execute implementation

Quality & Analysis:
  /checklist <type>       → Create quality checklist
  /analyze                → Validate consistency

Information:
  /status                 → Show feature status
  /list                   → List all features
  /constitution           → View/update principles
```

## How It Works

1. **You type** a slash command in your message to me
2. **I recognize** the command pattern
3. **I execute** the appropriate bash scripts and workflow
4. **I interact** with you for any clarifications needed
5. **I report** results and suggest next steps

## Key Points

✅ Commands work **only in conversations with me** (GitHub Copilot CLI)  
✅ **No setup needed** - always available  
✅ Commands are **directory-specific** to this project  
✅ I maintain **context** across the conversation  
✅ I handle **errors** and validation gracefully  

## Getting Started

Try it now:

```
/list
/status
/specify Add a feature you want to build
```

I'll execute the SpecKit workflows automatically! 🚀
