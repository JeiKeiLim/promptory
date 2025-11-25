# SpecKit Integration for GitHub Copilot CLI

This document defines how SpecKit commands work within GitHub Copilot CLI conversations.

## Overview

SpecKit is a **conversational workflow system** for specification-driven development. When you mention SpecKit commands in conversations with GitHub Copilot CLI, I understand and execute the underlying workflows using the bash scripts in `.specify/scripts/bash/`.

## How It Works

You describe what you want in natural language, and I map it to the appropriate SpecKit workflow:

**You say:** "Create a specification for adding dark mode"
**I do:** Run `.specify/scripts/bash/create-new-feature.sh` with your description

**You say:** "Run the clarify workflow"
**I do:** Execute the clarification process from the command definition

**You say:** "Generate the implementation plan"
**I do:** Run `.specify/scripts/bash/setup-plan.sh` and follow the planning workflow

## Available SpecKit Workflows

### 1. speckit.specify
**Purpose:** Create feature specifications from natural language

**You can say:**
- "Create a spec for [feature description]"
- "Run speckit.specify for [feature]"
- "Start a new feature specification"

**What I do:**
- Run `create-new-feature.sh` with your description
- Create feature branch and directory structure
- Generate initial `spec.md` file
- Validate specification quality
- Handle clarification questions interactively

### 2. speckit.clarify
**Purpose:** Identify and resolve ambiguities in specifications

**You can say:**
- "Clarify the current specification"
- "Run the clarify workflow"
- "What ambiguities exist in the spec?"

**What I do:**
- Run `check-prerequisites.sh --json --paths-only`
- Load current spec.md
- Identify ambiguities and gaps
- Ask targeted clarification questions (max 5)
- Update spec.md with clarified information

### 3. speckit.plan
**Purpose:** Generate technical implementation plans

**You can say:**
- "Generate the implementation plan"
- "Create the technical plan"
- "Run speckit.plan"

**What I do:**
- Run `setup-plan.sh --json`
- Generate `plan.md` with architecture decisions
- Create `data-model.md` if needed
- Generate API contracts in `contracts/`
- Create `research.md` for technical decisions
- Update agent context

### 4. speckit.tasks
**Purpose:** Generate actionable task breakdowns

**You can say:**
- "Generate the task list"
- "Break down the implementation into tasks"
- "Run speckit.tasks"

**What I do:**
- Run `check-prerequisites.sh --json`
- Load plan.md and spec.md
- Generate `tasks.md` organized by user stories
- Define dependencies and execution order
- Mark parallelizable tasks with [P]

### 5. speckit.checklist
**Purpose:** Create quality validation checklists

**You can say:**
- "Create a UX checklist"
- "Generate security checklist"
- "Run speckit.checklist for [type]"

**Types available:** ux, api, security, performance, test, deployment

**What I do:**
- Run `check-prerequisites.sh --json`
- Generate checklist in `checklists/[type].md`
- Create "unit tests for requirements"
- Validate requirement completeness and clarity

### 6. speckit.analyze
**Purpose:** Validate cross-artifact consistency

**You can say:**
- "Analyze the specification artifacts"
- "Check for inconsistencies"
- "Run speckit.analyze"

**What I do:**
- Run `check-prerequisites.sh --json --require-tasks --include-tasks`
- Analyze spec.md, plan.md, tasks.md
- Detect gaps, ambiguities, duplications
- Check constitution compliance
- Generate analysis report

### 7. speckit.implement
**Purpose:** Execute implementation tasks

**You can say:**
- "Start implementation"
- "Implement the tasks"
- "Run speckit.implement"

**What I do:**
- Run `check-prerequisites.sh --json --require-tasks --include-tasks`
- Validate all checklists are complete (ask if you want to proceed if not)
- Execute tasks in order from tasks.md
- Respect dependencies and parallel markers
- Mark completed tasks as [X]

### 8. speckit.constitution
**Purpose:** Manage project principles and governance

**You can say:**
- "Show me the project constitution"
- "Update the constitution"
- "What are the project principles?"

**What I do:**
- Load `.specify/memory/constitution.md`
- Display or update project principles
- Sync changes across templates

## Utility Commands

### Show Status
**You can say:**
- "What's the current feature status?"
- "Show me the SpecKit status"
- "What features exist?"

**What I do:**
- Check current git branch
- List available artifacts (spec.md, plan.md, tasks.md, etc.)
- Show task completion progress
- Display checklist status

### List Features
**You can say:**
- "List all features"
- "What features are in the specs directory?"

**What I do:**
- Scan `specs/` directory
- List all feature directories with status indicators

### Navigate/Read Files
**You can say:**
- "Show me the spec.md"
- "Read the current plan.md"
- "What's in tasks.md?"

**What I do:**
- Locate the file in current feature directory
- Display contents with context

## Typical Workflow in Conversation

### Example Session 1: New Feature

```
You: Create a specification for adding real-time notifications with WebSocket

Me: [Executes speckit.specify workflow]
    - Creates branch: 004-realtime-notifications
    - Generates spec.md with requirements
    - Asks clarification questions if needed
    - Reports completion

You: Run the clarify workflow

Me: [Analyzes spec.md for ambiguities]
    - Q1: Should notifications persist across sessions?
    - Q2: What's the maximum notification retention period?
    [Updates spec.md with your answers]

You: Generate the implementation plan

Me: [Executes speckit.plan workflow]
    - Creates plan.md with WebSocket architecture
    - Generates data-model.md for notification entities
    - Creates contracts/notifications-api.yaml
    - Reports completion

You: Create a security checklist

Me: [Generates checklists/security.md]
    - Authentication requirements for WebSocket
    - XSS protection for notification content
    - Rate limiting specifications
    [30 security validation items]

You: Generate the task breakdown

Me: [Creates tasks.md]
    - Phase 1: Setup (WebSocket server, dependencies)
    - Phase 2: Foundation (connection management, auth)
    - Phase 3: User Story 1 (send/receive notifications)
    - Phase 4: Polish (error handling, monitoring)
    [45 tasks organized by phase]

You: Check if everything is consistent

Me: [Runs speckit.analyze]
    - ✅ All requirements have task coverage
    - ⚠️  Performance requirements not reflected in tasks
    - ✅ Constitution compliance verified
    [Suggests adding performance monitoring tasks]

You: Implement the first 3 tasks

Me: [Executes tasks T001-T003]
    - T001: Install ws package ✅
    - T002: Create WebSocket server file ✅
    - T003: Add connection handler ✅
    [Marks tasks complete in tasks.md]
```

### Example Session 2: Resume Work

```
You: What's the current status?

Me: [Checks current branch and artifacts]
    Branch: 004-realtime-notifications
    Available artifacts:
      ✅ spec.md
      ✅ plan.md  
      ✅ tasks.md
      ✅ checklists/ (2 files)
    
    Task Progress: 15/45 tasks completed (33%)
    
    Checklist Status:
      ✅ security.md: 30/30
      ⏳ performance.md: 12/18

You: What's the next task to implement?

Me: [Reads tasks.md]
    Next task: T016 - Implement notification persistence in src/services/notification-service.ts
    
    This task requires:
    - Database connection (T014 ✅ completed)
    - Notification model (T015 ✅ completed)

You: Implement T016

Me: [Executes the task]
    [Creates/modifies notification-service.ts]
    [Marks T016 as complete in tasks.md]
```

## How I Interpret Natural Language

### Trigger Phrases

| You Say | I Execute |
|---------|-----------|
| "create spec/specification for X" | speckit.specify |
| "clarify", "resolve ambiguities" | speckit.clarify |
| "generate plan", "create plan" | speckit.plan |
| "generate tasks", "break down" | speckit.tasks |
| "create [type] checklist" | speckit.checklist |
| "analyze", "check consistency" | speckit.analyze |
| "implement", "execute tasks" | speckit.implement |
| "show status", "what's the status" | Show feature status |
| "list features" | List all features |

### Context Awareness

I understand context from:
- Current git branch (feature number and name)
- Existing artifacts (spec.md, plan.md, tasks.md)
- Previous conversation in this session
- Constitution principles
- Task completion state

### Intelligent Workflow Execution

I don't just run scripts blindly - I:
- ✅ Check prerequisites before executing
- ✅ Load relevant context files
- ✅ Ask clarifying questions when needed
- ✅ Validate outputs
- ✅ Report what I did and what's next
- ✅ Handle errors gracefully
- ✅ Maintain conversation continuity

## Technical Details

### Script Locations
- `create-new-feature.sh` - Feature initialization
- `check-prerequisites.sh` - Validation and context gathering
- `setup-plan.sh` - Plan generation
- `update-agent-context.sh` - Context management

### Command Definitions
Original workflow logic is in `.cursor/commands/*.md`:
- `speckit.specify.md` - Specification workflow
- `speckit.clarify.md` - Clarification workflow
- `speckit.plan.md` - Planning workflow
- `speckit.tasks.md` - Task generation workflow
- `speckit.checklist.md` - Checklist generation workflow
- `speckit.analyze.md` - Analysis workflow
- `speckit.implement.md` - Implementation workflow
- `speckit.constitution.md` - Constitution management

### Execution Flow
1. You mention a SpecKit workflow in natural language
2. I identify the workflow from your intent
3. I check prerequisites and gather context
4. I execute the appropriate bash scripts and workflow steps
5. I parse outputs and continue the workflow
6. I report results and suggest next steps
7. I maintain state for follow-up commands

## Key Differences from Shell Commands

❌ **NOT:** Shell functions you type (like `speckit.status`)
✅ **IS:** Conversational workflows I execute for you

❌ **NOT:** Requires you to source a script first
✅ **IS:** Always available in our conversations

❌ **NOT:** Works in other terminal sessions
✅ **IS:** Only works when talking to me (GitHub Copilot CLI)

❌ **NOT:** Manual command execution
✅ **IS:** Natural language workflow automation

## Benefits of This Approach

✅ **Natural conversation** - No need to remember exact command syntax
✅ **Context-aware** - I understand what phase you're in
✅ **Interactive** - I can ask questions and adapt
✅ **Integrated** - Seamlessly works with other tasks
✅ **Persistent** - I remember the conversation context
✅ **Intelligent** - I validate and suggest next steps

## Getting Started

Just start talking to me about your feature work:

- "I want to add a user authentication system"
- "Create a spec for dark mode support"  
- "What's the status of the current feature?"
- "Generate the implementation plan"

I'll understand and execute the appropriate SpecKit workflows!
