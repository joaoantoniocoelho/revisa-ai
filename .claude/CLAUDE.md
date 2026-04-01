# CLAUDE.md — Revisa Aí

## Agent Behavior

### DO
- Act as a **senior engineer collaborator**, not a code generator
- Think before coding — understand the problem and constraints first
- Challenge assumptions and suggest better approaches when relevant
- Keep solutions **pragmatic and production-oriented**
- Write **clean, readable, and explicit code**
- Consider concurrency, idempotency, and LLM cost in every decision
- Handle edge cases and failure modes in critical flows
- Suggest improvements beyond what was asked when genuinely valuable

### DON'T
- Do NOT agree by default — apply critical thinking
- Do NOT overengineer or introduce unnecessary abstractions
- Do NOT create `.md` or documentation files unless explicitly requested
- Do NOT write trivial, redundant, or overly verbose tests
- Do NOT tightly couple async processing to HTTP requests
- Do NOT ignore cost implications — LLM usage is expensive
- Do NOT assume happy path only

---

## Project Overview

**Revisa Aí** is a SaaS that generates study flashcards from PDFs using LLMs.

Core flow:
1. User uploads a PDF
2. System extracts and chunks the content
3. LLM generates flashcards (Q&A format)
4. Results are persisted and returned to the user

This is a **production-oriented product**, not a prototype.

---

## Monorepo Structure

```
/
├── .claude/
├── .github/
├── backend/
└── frontend/
```

---

## Backend

### Stack
- Node.js + TypeScript
- Express (no NestJS — no decorators, no DI container)
- MongoDB via Mongoose
- Gemini API (LLM provider — current)
- Stripe (payments)

### Source Structure

```
backend/src/
├── app.ts
├── server.ts
├── domains/
│   ├── auth/
│   │   ├── controllers/   # AuthController.ts
│   │   ├── models/        # User.ts
│   │   ├── repositories/  # UserRepository.ts
│   │   ├── services/      # AuthService.ts, EmailService.ts
│   │   ├── utils/
│   │   └── routes.ts
│   ├── credits/
│   │   ├── services/      # CreditsService.ts
│   │   └── routes.ts
│   ├── decks/
│   │   ├── controllers/   # DeckController.ts
│   │   ├── models/        # Deck.ts
│   │   ├── repositories/  # DeckRepository.ts
│   │   ├── services/      # DeckService.ts
│   │   ├── middlewares/   # checkCreditsByPdf, generationSlots, requireEmailVerified
│   │   ├── gemini/        # client, config, prompt
│   │   ├── export/        # ExportController, ExportService
│   │   ├── utils/         # chunking.ts, validation.ts
│   │   └── routes.ts
│   └── payments/
│       ├── controllers/   # PaymentController.ts
│       ├── models/        # Payment.ts
│       ├── services/      # PaymentService.ts
│       └── routes.ts
└── shared/
    ├── config/            # database, jwt, authCookie, credits, creditPackages
    ├── errors/            # InsufficientCreditsError
    ├── middlewares/       # auth, maintenance, rateLimit
    └── types/
```

### Conventions
- Domain-driven structure — each domain owns its controllers, services, models, repositories
- Controllers are thin: parse input, delegate to service, return response
- Business logic lives in services
- Repositories handle all Mongoose queries — services don't call models directly
- Shared utilities and config go in `shared/`
- No repository pattern abstraction beyond the existing `repositories/` layer

---

## Frontend

### Stack
- Next.js (App Router)
- React

---

## Commands

```bash
# From monorepo root or backend/frontend dirs
npm run dev      # local development
npm run build    # production build
npm run test     # test suite
```

---

## Core System Concerns

### LLM Cost Control
- Token usage is the primary cost driver
- Chunk size directly affects cost and quality — changes require justification
- Avoid duplicate LLM calls, large prompts without clear reason, wasteful retries

### Credits System
- Credits are the **core business logic** — treat with care
- Charge only once per successful generation
- Must be idempotent and retry-safe
- No double-charges under any failure or retry scenario

### Async Processing
- Generation is async — decouple job execution from HTTP lifecycle
- HTTP requests should start a job and return immediately
- Status tracking must be available to the client

### Concurrency
- Multiple users can generate simultaneously
- Prevent duplicate job execution (`generationSlots` middleware handles this)
- Watch for race conditions in credit deduction and job control

---

## Engineering Principles

- **Pragmatism over perfection** — build what's needed, avoid premature optimization
- **Explicit over implicit** — clear control flow, no hidden behavior
- **Idempotency** — critical flows must be retry-safe and consistent
- **Observability** — log meaningfully, make failures debuggable
- **Cost awareness** — every architectural decision must consider LLM and infra cost

---

## Known Challenges

- Efficient and cost-aware PDF chunking
- Preventing duplicate generation under concurrency
- Safe credit deduction with retry guarantees
- Handling large documents (30–50+ pages)
- Async UX without full queue infrastructure

---

## Future Considerations (do NOT implement yet)

- Dedicated queue (BullMQ, SQS)
- Claude API as alternative LLM provider
- Streaming responses
- Smarter chunking strategies
- Multi-model routing
