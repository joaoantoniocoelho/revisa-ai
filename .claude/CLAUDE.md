# CLAUDE.md — Revisa Aí

## About the project

Revisa Aí is a SaaS that turns PDFs into flashcards using LLMs.

Main flow:
upload PDF → process → generate flashcards → user reviews

This is a real system (not an experiment), with real users and real cost.

---

## How you should work

Act like an engineer working on a production system.

Before coding:
- understand the full flow
- think where it can break
- consider cost and concurrency

If something is unclear, question it.

---

## Important rules

### Code
- do not introduce unnecessary abstractions
- keep code simple and explicit
- avoid splitting files without need

### Processing
- do not block HTTP requests with LLM work
- assume operations can take time
- assume failures will happen

### Idempotency
critical operations must be safe to retry:
- deck generation
- payments
- credit application

no duplicate side effects allowed

### Cost
- LLM usage is expensive
- avoid unnecessary calls
- avoid reprocessing the same data

### Errors
- do not assume success
- handle partial failures
- always log relevant errors

### Git
- do not commit directly to main
- assume PR-based workflow

---

## Stack

### Backend
- Node.js
- Express
- MongoDB
- Gemini

Responsible for:
- PDF upload
- text extraction
- chunking
- LLM calls
- persistence
- billing

### Frontend
- Next.js
- React
- Tailwind

---

## Critical flow

1. upload PDF
2. extract text
3. split into chunks
4. process with LLM (limited concurrency)
5. generate flashcards
6. deduplicate
7. store results

---

## Notes

- PDFs vary a lot in size and quality
- LLM responses are inconsistent
- processing can take time

design with that in mind

---

## Monorepo Structure

```
/
├── .claude/
│   └── agents/        # backend-specialist.md, frontend-specialist.md, tech-lead.md
├── .github/
├── backend/           # Node.js + Express + MongoDB + Gemini
└── frontend/          # Next.js + React + Tailwind
```

Technical details for each layer live in the corresponding agent file.

---
