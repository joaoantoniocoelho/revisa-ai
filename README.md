# Revisa Aí (pdf2anki)

Revisa Aí helps students turn long PDF materials into study-ready flashcards in minutes.
Instead of manually extracting concepts and writing cards one by one, users upload a PDF, choose a generation density, and get a deck they can review in the app or export directly to Anki (`.apkg`).

## The Idea

Most students waste time converting passive material (slides, notes, chapters) into active recall formats.
This project focuses on removing that friction:

- Input: a PDF
- Processing: AI-assisted extraction + card generation
- Output: clean flashcards ready for spaced repetition

The goal is simple: reduce prep time so users can spend more time studying.

## Core User Flow

1. User signs up / logs in.
2. User uploads a PDF and selects a density (`low`, `medium`, `high`).
3. Backend extracts text, chunks content, generates flashcards with Gemini, validates/deduplicates results, and saves a deck.
4. User reviews cards in the app.
5. User exports the deck as `.apkg` and imports it into Anki.

## Tech Stack

- Frontend: Next.js 14 + React + Tailwind
- Backend: Node.js + Express + TypeScript
- Database: MongoDB
- AI: Google Gemini
- Auth: JWT in `HttpOnly` cookie
- Email: Resend (email verification)

## Repository Structure

- `frontend/`: web app (Next.js)
- `backend/`: API (Express)

## Prerequisites

- Node.js 20+
- npm
- MongoDB (local or Atlas)

## Local Setup

## 1) Backend

```bash
cd backend
npm install
cp env.example .env
```
> Fill all variables

Run backend:

```bash
npm run dev
```

API runs at `http://localhost:3001`.

## 2) Frontend

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your_google_client_id>
```

Run frontend:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Useful Scripts

### Backend

```bash
cd backend
npm run dev
npm run build
npm run start
npm run lint
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```