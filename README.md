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
- Fill in required credentials (typically Supabase and OpenRouter)

> Note: `.env.example` is the source of truth for required variables.

3. Start the dev server:

```bash
npm run dev
```

Then open the local URL printed in the terminal.

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
  - AI vs manual share: \(auto\_generated / (auto\_generated + manually\_created)\)

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

