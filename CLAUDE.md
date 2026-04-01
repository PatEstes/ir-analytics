# CLAUDE.md — IR Qualitative Analytics Engine

## Project Overview

FERPA-compliant, browser-based qualitative analytics platform for institutional research in higher education. Analyzes 10,000–50,000+ open-ended survey responses per semester. **All NLP processing runs 100% client-side** — no survey data is transmitted to the server.

## Tech Stack

- **Frontend:** React 19, TypeScript (strict), Vite 7, Tailwind CSS 4, shadcn/ui (Radix)
- **Backend:** Express 4, tRPC 11, Drizzle ORM
- **Database:** MySQL / TiDB
- **NLP (client-side):** Hugging Face Transformers.js (`all-MiniLM-L6-v2`), VADER sentiment, custom HDBSCAN\*
- **Package Manager:** pnpm

## Quick Reference Commands

```bash
pnpm dev        # Start dev server (Express + Vite HMR, port 3000)
pnpm build      # Production build (Vite frontend + esbuild server)
pnpm start      # Run production build
pnpm check      # TypeScript type-check (tsc --noEmit)
pnpm format     # Prettier formatting
pnpm test       # Run all tests (Vitest)
pnpm db:push    # Generate and apply database migrations
```

## Project Structure

```
client/              # React frontend
  src/
    pages/           # Route pages (Home, Dashboard, Library, Compare, AnalysisView, SharedView)
    components/      # Domain components (ColumnMapper, FilterBar, GlobalNav, ExportButton, etc.)
    components/ui/   # shadcn/ui primitives (50+ components)
    contexts/        # React contexts (AnalyticsContext, ThemeContext)
    hooks/           # Custom hooks (useFilters, useAuth, useMobile, etc.)
    lib/nlp/         # Client-side NLP pipeline (embeddings, sentiment, hdbscan, clustering, csvParser)
    lib/             # Utilities (trpc client, csvExport, utils)
server/              # Express + tRPC backend
  index.ts           # Express entry point, static file serving
  routers.ts         # All tRPC procedures (auth, analysis, share)
  db.ts              # Database CRUD helpers
  storage.ts         # Data persistence utilities
  _core/             # Framework plumbing (OAuth, context, tRPC setup, cookies)
  *.test.ts          # Server-side tests
shared/              # Shared code between client and server
  types.ts           # Unified type exports from Drizzle schema
  const.ts           # Constants (cookie name, durations, error messages)
  _core/errors.ts    # HttpError class
drizzle/             # Database layer
  schema.ts          # Table definitions (users, analyses, analysis_comments, share_links)
  migrations/        # SQL migration files
patches/             # pnpm package patches (wouter)
```

## Architecture

### Client-Side NLP Pipeline

All analysis happens in the browser — this is the core FERPA-compliance guarantee:

```
CSV Upload → Column Mapper → Embeddings → Sentiment → HDBSCAN → Labeling → Quotes → Summary
```

1. CSV parsing (PapaParse + auto-detection of 50+ column aliases)
2. Model loading (`all-MiniLM-L6-v2`, cached in IndexedDB, ~22MB WASM)
3. Embedding generation (384-dimensional vectors)
4. Sentiment scoring (VADER rule-based)
5. Topic discovery (custom HDBSCAN\* — no pre-specified k)
6. Topic labeling (cosine similarity to 8 seed topics)
7. Results assembly (topics, sentiment, trends, executive summary)

Key files: `client/src/lib/nlp/pipeline.ts`, `hdbscan.ts`, `embeddings.ts`, `sentiment.ts`, `clustering.ts`

### Server (Persistence Only)

The server stores saved analyses and manages sharing — it never processes survey text.

**tRPC Router:**
- `auth.me`, `auth.logout` — Session management (public)
- `analysis.save/list/get/update/delete/compare` — CRUD for saved analyses (protected)
- `share.create/listByAnalysis/deactivate/access` — Tokenized read-only share links

**Database Tables:** `users`, `analyses`, `analysis_comments`, `share_links` (defined in `drizzle/schema.ts`)

### State Management

- **AnalyticsContext** — Holds analysis results, filters, processing state
- **React Query + tRPC** — Server state caching
- **useFilters hook** — Computes filtered datasets across all dashboard tabs

## Code Conventions

### TypeScript

- Strict mode enabled (`tsconfig.json`)
- All API inputs validated with Zod schemas via tRPC
- Shared types derived from Drizzle schema (`shared/types.ts`)
- End-to-end type safety from DB schema → API → React components

### Formatting

- **Prettier** with: double quotes, semicolons, trailing commas (es5), 2-space indent, 80 char width, LF line endings
- Run `pnpm format` before committing

### Testing

- **Framework:** Vitest (53 tests across 6 files)
- **Pattern:** `describe` / `it` / `expect`
- **Locations:** `server/*.test.ts`, `client/src/**/*.test.ts`
- Server tests mock DOM APIs where needed (csvExport tests)
- HDBSCAN tests use synthetic data with seeded pseudo-random generation
- Run `pnpm test` — all tests must pass

### Routing

- Client routing via Wouter (lightweight, patched via pnpm)
- Pages: `/` (Home), `/dashboard`, `/library`, `/compare`, `/analysis/:id`, `/shared/:token`

### UI Components

- Use shadcn/ui components from `client/src/components/ui/`
- Icons from `lucide-react`
- Animations via Framer Motion
- Charts via Recharts
- Toast notifications via Sonner

## Environment Variables

**Required:**
```
DATABASE_URL=mysql://user:pass@host:port/dbname
JWT_SECRET=<secret>
VITE_APP_ID=<oauth-app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
```

**Optional:**
```
NODE_ENV=production|development
PORT=3000
OWNER_OPEN_ID=<admin-user-id>
```

No `.env` file is committed — variables must be injected at deploy time.

## Important Notes

- **Never transmit survey/comment data to the server** — this breaks FERPA compliance
- The `@huggingface/transformers` package is excluded from Vite optimization (WASM)
- One active pnpm patch: `wouter@3.7.1`
- No ESLint configured — rely on TypeScript strict mode + Prettier
- No CI/CD pipelines — run `pnpm check && pnpm test` locally before pushing
