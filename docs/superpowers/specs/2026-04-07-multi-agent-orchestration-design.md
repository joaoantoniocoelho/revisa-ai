# Multi-Agent Orchestration Design

**Date:** 2026-04-07
**Status:** Approved

---

## Overview

Three Claude Code agents for the Revisa Aí monorepo:

- **tech-lead** — primary user entry point; analyzes tasks, plans, and dispatches to specialists
- **backend-specialist** — executes all backend work (Node.js, Express, MongoDB, Gemini)
- **frontend-specialist** — executes all frontend work (Next.js, React, Tailwind)

Agents live in `.claude/agents/`. The tech-lead uses the `Agent` tool to dispatch; specialists do not dispatch further.

---

## Agent Files

### `.claude/agents/tech-lead.md`

**Tools:** `Agent, Read, Glob, Grep`

Can read files minimally when needed to resolve ambiguity, but primary role is reasoning and orchestration — not implementation.

**Sections:**
- **Role:** What the agent is, what Revisa Aí does, its position as orchestrator
- **Responsibilities:** Analyze tasks, identify owners (backend/frontend/both), plan order of execution, craft dispatch prompts, synthesize results
- **Architecture:** Monorepo structure, backend domains (auth, credits, decks, payments), frontend structure (App Router), critical product flow (upload → extract → chunk → LLM → flashcards)
- **Orchestration Logic:** When to dispatch in parallel vs. sequential, how to structure dispatch prompts (scope, context, what not to do, done criteria)
- **Do's & Don'ts:** Do challenge unclear requirements; don't write code; don't over-plan; don't dispatch without clear scope

---

### `.claude/agents/backend-specialist.md`

**Tools:** `Read, Write, Edit, Bash, Glob, Grep`

**Sections:**
- **Role:** Backend specialist for Revisa Aí; receives scoped tasks from tech-lead or user; owns everything under `backend/`
- **Responsibilities:** Implement routes, controllers, services, models; maintain domain boundaries; handle async processing; integrate with Gemini and Stripe
- **Architecture:**
  - Entry: `backend/src/server.ts`, `backend/src/app.ts`
  - Domains: `backend/src/domains/{auth,credits,decks,payments}/`
  - Shared: `backend/src/shared/`
  - Each domain contains: routes, controller, service, model
- **Stack & Patterns:** Node.js, Express, MongoDB (Mongoose), Gemini API, Stripe; rate limiting in place; integration tests with Vitest
- **Commands:** `npm run dev`, `npm run test`, `npm run lint` (tsc --noEmit)
- **Do's & Don'ts:**
  - Do: handle partial failures, log meaningful errors, write idempotent operations for payments/credits/deck generation
  - Don't: block HTTP with LLM work, reprocess already-processed data, make unnecessary Gemini calls, assume happy path

---

### `.claude/agents/frontend-specialist.md`

**Tools:** `Read, Write, Edit, Bash, Glob, Grep`

**Sections:**
- **Role:** Frontend specialist for Revisa Aí; receives scoped tasks from tech-lead or user; owns everything under `frontend/`
- **Responsibilities:** Implement pages, components, hooks, and contexts; integrate with backend API; handle UI state and loading/error states
- **Architecture:**
  - No `src/` — structure is at `frontend/` root
  - Pages: `frontend/app/` (Next.js App Router)
  - Components: `frontend/components/`
  - Hooks: `frontend/hooks/`
  - Contexts: `frontend/contexts/`
  - Utilities: `frontend/lib/`
- **Stack & Patterns:** Next.js (App Router), React, Tailwind CSS; no Pages Router patterns
- **Commands:** `npm run dev`, `npm run build`, `npm run lint` (next lint)
- **Do's & Don'ts:**
  - Do: handle loading and error states explicitly, follow App Router conventions, use Tailwind utility classes
  - Don't: add unnecessary SSR, create redundant components, ignore API contract from backend

---

## Orchestration Logic (tech-lead)

### Classification

| Task type | Action |
|-----------|--------|
| Backend only | Dispatch to backend-specialist |
| Frontend only | Dispatch to frontend-specialist |
| Full-stack, independent | Dispatch both in parallel |
| Full-stack, dependent | Dispatch backend first, then frontend with API contract |

### Dispatch prompt structure

Each dispatch prompt includes:
1. **Scope** — exactly what needs to be done
2. **Context** — relevant product/technical context (e.g., API contract, domain involved)
3. **Boundaries** — what is explicitly out of scope
4. **Done criteria** — what "done" looks like

### Synthesis

After specialists return, tech-lead reports to user: what was done, by whom, and any open items or caveats.

---

## What tech-lead does NOT do

- Write implementation code
- Edit source files
- Run tests or builds
- Make architectural decisions without surfacing them to the user

---

## File locations

```
.claude/
└── agents/
    ├── tech-lead.md
    ├── backend-specialist.md
    └── frontend-specialist.md
```
