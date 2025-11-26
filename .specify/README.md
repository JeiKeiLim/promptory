# SpecKit for GitHub Copilot CLI

**SpecKit is a conversational workflow system for specification-driven development.**

When you mention SpecKit workflows in conversations with GitHub Copilot CLI, I understand and execute them automatically.

## Quick Start

Use slash commands (like in Cursor) or talk naturally:

```
You: /specify Add user authentication with OAuth2

You: /clarify

You: /plan

You: /checklist security

You: /tasks

You: /implement next 3
```

Or use natural language - both work!

```
You: Create a spec for user authentication

You: What's the current status?

You: Generate the implementation plan
```

I'll recognize and execute the appropriate SpecKit workflows automatically!

## Available Workflows

### Core Development Flow

| Workflow | What I Do | You Say |
|----------|-----------|---------|
| **speckit.specify** | Create feature specs | "Create a spec for [feature]" |
| **speckit.clarify** | Resolve ambiguities | "Clarify the specification" |
| **speckit.plan** | Generate tech plans | "Generate the implementation plan" |
| **speckit.tasks** | Create task breakdown | "Generate the task list" |
| **speckit.implement** | Execute tasks | "Implement the tasks" |

### Quality & Analysis

| Workflow | What I Do | You Say |
|----------|-----------|---------|
| **speckit.checklist** | Create quality gates | "Create a [type] checklist" |
| **speckit.analyze** | Validate consistency | "Analyze the artifacts" |
| **speckit.constitution** | Manage principles | "Show the constitution" |

### Information

| Command | What I Do | You Say |
|---------|-----------|---------|
| **Status** | Show progress | "What's the current status?" |
| **List** | Show all features | "List all features" |
| **Read** | Show file contents | "Show me spec.md" |

## Checklist Types

- `ux` - User experience & UI requirements
- `api` - API design & endpoints
- `security` - Security requirements & threat model
- `performance` - Performance targets & metrics
- `test` - Testing coverage & scenarios
- `deployment` - Deployment readiness

## Example Conversations

### Starting a New Feature

```
You: Create a specification for real-time chat with WebSocket

Me: [Creates branch, generates spec.md, validates]
    ✅ Created feature branch: 004-realtime-chat
    ✅ Generated spec.md with requirements
    ✅ Ready for clarification phase

You: Are there any ambiguities?

Me: [Analyzes spec]
    Found 3 areas needing clarification:
    Q1: Should messages persist across sessions?
    Q2: What's the maximum room size?
    Q3: Are read receipts required?

You: Yes to persistence, 50 users max, yes to read receipts

Me: [Updates spec.md with clarifications]
    ✅ Spec updated with clarified requirements

You: Generate the plan

Me: [Creates plan.md, data-model.md, contracts/]
    ✅ Technical plan created
    ✅ Data model defined (Message, Room, User entities)
    ✅ WebSocket contracts generated
```

### Resuming Work

```
You: What's the current feature status?

Me: Branch: 004-realtime-chat
    Artifacts:
      ✅ spec.md ✅ plan.md ✅ tasks.md
      ✅ checklists/ (2 files)
    
    Progress: 12/40 tasks completed (30%)
    Next: T013 - Implement message persistence

You: Show me the next 5 tasks

Me: [Reads tasks.md]
    T013: Message persistence service
    T014: Room management API
    T015: User presence tracking
    T016: Read receipt handling
    T017: Message history pagination

You: Implement T013

Me: [Creates/modifies files, marks task complete]
    ✅ Implemented message persistence
    ✅ Marked T013 complete in tasks.md
```

## How It Works

1. **You describe** what you want in natural language
2. **I interpret** your intent and identify the workflow
3. **I execute** the bash scripts and workflow steps
4. **I interact** with you for clarifications
5. **I report** results and suggest next steps

## Key Benefits

✅ **Natural language** - No command syntax to memorize  
✅ **Context-aware** - I know what phase you're in  
✅ **Interactive** - I ask questions when needed  
✅ **Intelligent** - I validate and suggest next steps  
✅ **Integrated** - Works seamlessly with other tasks  

## Technical Details

### Behind the Scenes
- Bash scripts: `.specify/scripts/bash/`
- Command definitions: `.cursor/commands/speckit.*.md`
- Templates: `.specify/templates/`
- Constitution: `.specify/memory/constitution.md`

### Directory Structure
```
specs/
└── 001-feature-name/
    ├── spec.md              # Requirements
    ├── plan.md              # Architecture
    ├── tasks.md             # Task breakdown
    ├── data-model.md        # Entities (optional)
    ├── research.md          # Decisions (optional)
    ├── quickstart.md        # Examples (optional)
    ├── checklists/          # Quality gates
    │   ├── ux.md
    │   ├── api.md
    │   └── security.md
    └── contracts/           # API specs (optional)
```

## Important Notes

- ✅ Works **only in conversations with me** (GitHub Copilot CLI)
- ❌ **Not** shell commands you type directly
- ✅ Always available - no setup needed
- ✅ Directory-specific to this project

## Complete Documentation

For detailed workflow definitions, see:
- `.specify/COPILOT_INTEGRATION.md` - Complete workflow reference
- `.cursor/commands/speckit.*.md` - Original command definitions

## Getting Started

Just start talking! Try:

```
You: What features exist in this project?

You: Create a spec for adding dark mode support

You: What's the status?
```

I'll take it from there! 🚀
