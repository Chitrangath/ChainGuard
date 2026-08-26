---
id: save-context
name: Save and Load Chat Context
description: Serialize the current development session into project_snapshot.md and restore a previous project state from that snapshot.
---

# Save and Load Chat Context

This skill provides a persistent handoff mechanism between AI coding sessions.

It is designed for long-running development projects where the AI may lose conversational context because of context-window limits, session resets, or switching between agents.

The snapshot must preserve enough technical and project context for a fresh AI session to continue development without requiring the user to explain the project again.

---

# Protocol 1: Export Context

## Trigger

Run this protocol when the user explicitly asks to:

- save the session
- save the context
- create a checkpoint
- create a project snapshot
- preserve the current state
- prepare a handoff for another AI/session
- export the current project context

Do NOT trigger this protocol merely because the user says "remember this". That should be handled as persistent user memory instead.

## Procedure

1. Inspect the current workspace before generating the snapshot.
2. Review the relevant conversation context available to the agent.
3. Determine the actual current implementation state from the codebase rather than relying only on conversational claims.
4. Identify completed work, unfinished work, bugs, architectural decisions, and immediate next actions.
5. Create or overwrite:

`project_snapshot.md`

at the root of the workspace.

6. The snapshot must be concise but technically complete.
7. Never claim that a feature is implemented unless there is sufficient evidence from the workspace or conversation.
8. Clearly distinguish between:
   - implemented
   - partially implemented
   - planned
   - unknown/unverified

## Snapshot Format

```md
# Project Snapshot: [Project Name]

*Generated on: [Current Date]*
*Snapshot Version: [Version Number]*

## 1. Context State & Goals

### Core Concept

[What the project does and what problem it solves.]

### Current Status

[Prototype / MVP / Alpha / Beta / Production / Refactoring]

### Current Objective

[What the project is currently trying to accomplish.]

---

## 2. Technical Blueprint

### Tech Stack

- Frontend:
- Backend:
- Database:
- Blockchain:
- AI/ML:
- Infrastructure:
- Hosting:
- Testing:
- Package Manager:
- Other:

### Architecture

[Describe the current architecture and major components.]

### Repository Structure

```text
[Important repository structure]
```

### Architecture Rules

- [Established patterns]
- [Important conventions]
- [Security rules]
- [Coding conventions]
- [Deployment constraints]

---

## 3. Implemented vs In-Progress Features

### Completed

- [Feature]
- [Feature]

### In Progress

- [Feature]
  - Current state:
  - Remaining work:
  - Relevant files:

### Planned

- [Feature]

### Known Technical Debt / Bugs

- [Issue]
- [Issue]

### Important Decisions

- [Decision and reasoning]
- [Decision and reasoning]

---

## 4. Key Implementation Details

Include only code that is important for continuing development.

### Important Types / Interfaces

```text
[Code]
```

### Important Schemas / Contracts

```text
[Code]
```

### Important Functions / Logic

```text
[Code]
```

Do not unnecessarily copy entire source files into the snapshot.

---

## 5. Environment & Configuration

### Required Environment

- [Runtime versions]
- [Dependencies]
- [CLI tools]

### Environment Variables

List variable names only unless the value is explicitly safe to store.

```text
API_KEY=
DATABASE_URL=
...
```

Never store secrets, private keys, passwords, tokens, or credentials.

### Commands

```bash
# Install
...

# Development
...

# Test
...

# Build
...

# Deploy
...
```

---

## 6. Precise Next Steps

1. [Immediate next task]
2. [Follow-up task]
3. [Follow-up task]

The first item must be the highest-priority action that the next AI session should execute.

---

## 7. Handoff Notes

[Any critical information that a fresh AI agent must know before modifying the project.]

Examples:

- Do not modify X because Y depends on it.
- Contract deployment address is stored in X.
- Feature Y is intentionally disabled.
- Current implementation has an unresolved issue with Z.
```

---

# Protocol 2: Import Context

## Trigger

Run this protocol when the user references:

`@project_snapshot.md`

or explicitly asks the agent to restore/load/continue from the project snapshot.

## Procedure

1. Read `project_snapshot.md` completely.
2. Inspect the current workspace to verify that the snapshot still matches the actual codebase.
3. Identify differences between the snapshot and the current repository.
4. Treat the current repository as the source of truth when the snapshot conflicts with actual code.
5. Explicitly acknowledge:
   - current architecture
   - completed work
   - current implementation state
   - known technical debt
   - immediate pending task
6. Automatically begin executing **Precise Next Step #1**.
7. Do not ask the user to re-explain information already contained in the snapshot unless the information is contradictory or missing.
8. If Next Step #1 is impossible because of a missing dependency, credential, decision, or file, explain the blocker and proceed to the next actionable step where possible.

## Important Rule

The snapshot is a **handoff document, not the source of truth**.

When snapshot information conflicts with:

- actual source code
- configuration files
- package manifests
- git state
- deployed state

prefer the current workspace state and update the snapshot if necessary.

---

# Snapshot Maintenance

When exporting a new snapshot:

- overwrite the previous snapshot rather than creating multiple copies
- update the generation date
- increment the snapshot version
- remove obsolete information
- preserve important unresolved issues
- keep the file focused on information required to continue development

The goal is not to archive the entire conversation.

The goal is to create a **high-signal technical handoff** that allows another AI agent to continue work immediately.