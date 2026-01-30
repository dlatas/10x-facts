# 10xFacts

![version](https://img.shields.io/badge/version-0.0.1-blue)
![license](https://img.shields.io/badge/license-TBD-lightgrey)

## Table of contents

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

## 1. Project name

**10xFacts**

## 2. Project description

10xFacts is a web app for collecting, browsing, and quickly discovering bite-sized facts in the form of flashcards. The product is designed for “quick discovery” (not memorization): it deliberately excludes learning modes like spaced repetition, quizzes, or tests.

Core content model:

- **Collection (category)** → **Topic** → **Flashcards**
- **Flashcard** = title (front, max 200 chars) + description (back, max 600 chars)

MVP highlights:

- AI-powered generation of **exactly one** flashcard per user action (topic-based or fully random).
- Manual creation of flashcards.
- Simple browsing, strict search, basic filtering, and favorites.
- User accounts for data persistence.
- Admin panel with basic quality/adoption metrics.

Additional docs:

- PRD: `.ai/prd.md`
- Tech stack notes: `.ai/tech-stack.md`

## 3. Tech stack

- **Frontend**: Astro 5 + React 19 (interactive components), TypeScript 5
- **Styling/UI**: Tailwind CSS 4, shadcn/ui, Radix UI primitives
- **Backend**: Supabase (PostgreSQL + Auth + SDK)
- **AI**: OpenRouter.ai (model gateway)
- **Testing (unit/component)**: Vitest, React Testing Library, MSW
- **Testing (E2E)**: Playwright
- **CI/CD**: GitHub Actions
- **Hosting**: DigitalOcean (Docker-based deployment)

## Project structure (types)

- `src/types.ts`: publiczny “barrel” eksportów typów (jeden punkt importu)
- `src/types/*`: typy podzielone domenowo (auth, topics, flashcards, admin itd.)

## 4. Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (see `.nvmrc`)
- **npm** (ships with Node)

If you use NVM:

```bash
nvm install
nvm use
```

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

- Copy `.env.example` to `.env`
- Fill in required credentials (Supabase + OpenRouter)

> Note: `.env.example` is the source of truth for required variables.

#### Environment variables

This project requires **your own** credentials. Do **not** commit `.env` (it is ignored by git).

- **Supabase**
  - `SUPABASE_URL`: Supabase project URL (or local Supabase URL if you use Supabase CLI)
  - `SUPABASE_KEY`: Supabase **anon** key (public) used by the app
  - Optional: `SUPABASE_SERVICE_ROLE_KEY` (server-only) — only needed for endpoints that must bypass RLS

- **AI (OpenRouter)**
  - `OPENROUTER_API_KEY`: your OpenRouter API key (server-side only; required for AI generation)
  - Optional: `OPENROUTER_MODEL`: overrides default model used by the backend (see `.env.example`)
  - Optional: `AI_DAILY_EVENT_LIMIT`: daily per-user generation limit (string/number)

3. Start the dev server:

```bash
npm run dev
```

Then open the local URL printed in the terminal.

### Supabase (local dev) + migrations

This repo uses Supabase locally via the Supabase CLI.

1. Start local Supabase:

```bash
npx supabase start
```

2. Apply migrations (this will recreate the local DB and run all migrations + seed):

```bash
npx supabase db reset
```

If you only need to ensure the latest migrations are applied (without a full reset), you can run:

```bash
npx supabase migration up
```

### RPC: random favorite flashcards

Endpoint `GET /api/v1/flashcards/favorites/random` prefers an RPC function in DB:

- SQL function: `public.get_random_favorite_flashcards(p_limit int)`
- Migration file: `supabase/migrations/20260120000200_add_random_favorite_flashcards_rpc.sql`

After running migrations, you can quickly test it (replace `<TOKEN>`):

```bash
curl -i -H "Authorization: Bearer <TOKEN>" "http://127.0.0.1:3000/api/v1/flashcards/favorites/random?limit=5"
```

### Production build (local)

```bash
npm run build
npm run preview
```

## 5. Available scripts

From `package.json`:

- **`npm run dev`**: start Astro dev server
- **`npm run build`**: build for production
- **`npm run preview`**: preview the production build locally
- **`npm run lint`**: run ESLint
- **`npm run lint:fix`**: run ESLint with auto-fix
- **`npm run format`**: format codebase using Prettier
- **`npm run test:unit`**: run unit tests (Vitest)
- **`npm run test:unit:watch`**: run unit tests in watch mode
- **`npm run test:e2e`**: run E2E tests (Playwright)
- **`npm run test:e2e:install`**: download Playwright browsers (first-time setup)
- **`npm run test:e2e:report`**: open Playwright HTML report

## 6. Project scope

### In scope (MVP)

- **Auth & access**
  - Email/password registration & login via Supabase Auth
  - Per-user data isolation
  - Admin-only access to the admin panel
- **Collections & topics**
  - Create collections and topics
  - Topic description as a list of points; the latest description is used to guide future AI generations
  - No renaming of collections/topics after creation (MVP constraint)
  - Hard delete with cascade (delete topic → its flashcards; delete collection → topics + flashcards)
- **Flashcards**
  - Manual creation (title/description with 200/600 char limits)
  - Edit title/description (with `edited_by_user` tracked for metrics)
  - Hard delete
  - Favorites toggle and filtering by favorites
  - Filtering by source: `manually_created` vs `auto_generated`
- **AI generation**
  - Generate **exactly 1** flashcard per action
  - For user topics: generation is guided by the topic description
  - Accept/Reject flow:
    - Accept = “Save” on the preview
    - Reject = “Reject”
    - Leaving without action = skip (not counted in acceptance rate)
  - Daily per-user generation limit:
    - Enforced in backend
    - Resets at **00:00 UTC**
- **Random mode**
  - A system, non-removable “Random collection” with a “Random topic”
  - Backend maintains a hidden list of domains for randomization
- **Browsing, search & filtering**
  - Lists for collections, topics, and flashcards
  - Strict search (no diacritics normalization, no typo tolerance)
- **Admin metrics**
  - AI acceptance rate: \(accepts / (accepts + rejects)\), skips excluded
  - AI vs manual share: \(auto_generated / (auto_generated + manually_created)\)

### Out of scope (explicitly not in MVP)

- Sharing/collaboration between users
- Native mobile apps (web-only)
- Learning mode (spaced repetition), quizzes, tests
- Advanced search (typo tolerance, diacritics normalization, stemming)
- Fact verification / citations / advanced quality systems
- Renaming collections/topics after creation
- Nested collections, tags, extra hierarchy levels

## 7. Project status

**MVP / in active development.**

Success metrics (as defined in PRD):

- **AI acceptance rate target**: ≥ 75%
- **AI usage share target**: ≥ 75%

## 8. License

**TBD.** No license file is currently provided in this repository.
