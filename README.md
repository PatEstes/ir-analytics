# IR Qualitative Analytics Engine

> **FERPA-Safe · 100% Local Processing · No Data Leaves Your Browser**

A full-stack web application for Institutional Research (IR) offices that transforms open-ended survey responses into structured qualitative insights. The engine discovers themes, scores sentiment, detects emerging trends, and generates executive summaries — entirely within the user's browser using real AI/NLP models.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [NLP Pipeline](#nlp-pipeline)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Privacy & FERPA Compliance](#privacy--ferpa-compliance)

---

## Overview

The IR Qualitative Analytics Engine was built to solve a real problem in higher education: IR offices receive thousands of open-ended survey responses each semester (from student experience surveys, course evaluations, exit surveys, etc.) and have no scalable way to analyze them qualitatively. Manual coding is time-consuming and inconsistent; commercial tools often require uploading sensitive student data to external servers, raising FERPA concerns.

This application runs all NLP processing — embedding generation, clustering, sentiment analysis — directly in the browser using WebAssembly-powered models. No student data is ever transmitted to any server for analysis purposes.

---

## Key Features

**NLP Analysis (Client-Side)**

The core analysis pipeline runs entirely in the browser. When a user uploads a CSV file, the application generates 384-dimensional semantic embeddings for each comment using the `all-MiniLM-L6-v2` model (via `@huggingface/transformers`), clusters them using a custom HDBSCAN implementation, scores sentiment with VADER, and labels topics by semantic similarity to a curated set of higher-education seed topics.

**Interactive Column Mapper**

Before analysis begins, users are presented with a column mapping interface that auto-detects CSV column names using 50+ aliases for common variations (e.g., `University`, `Degree`, `Open_Response`, `Date_Submitted`). Users can manually override any mapping via dropdown selectors and preview the first five rows of their data before confirming.

**Six-Tab Analysis Dashboard**

Results are presented across six tabs: Summary (executive summary with key metrics), Themes (topic distribution with representative quotes), Sentiment (breakdown by topic and overall), Trends (weekly frequency analysis), Quotes (filterable representative quotes), and Validation (per-topic coherence scores and noise ratio).

**Multi-Dimensional Filtering**

Every dashboard tab respects a persistent filter bar that supports multi-select filtering by institution, school/department, program level, and theme. A text search box filters themes by name.

**Analysis Library & Persistence**

Authenticated users can save analyses to a MySQL database with a title, semester label, and academic year. The Library page lists all saved analyses with metadata. Analyses can be reloaded, deleted, or shared.

**Cross-Semester Comparison**

The Compare page allows side-by-side comparison of up to four saved analyses, surfacing shifts in topic distribution, sentiment trends, and emerging themes across semesters.

**Shareable Read-Only Links**

Users can generate tokenized share links for any saved analysis. Recipients can view the full analysis without authentication. Links can be labeled, set to expire, and deactivated.

**CSV Export**

Every dashboard tab has an export button that downloads the filtered data as a CSV file. A global "Export All" button downloads the complete filtered comment dataset with all metadata.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | React 19 + TypeScript | UI components and state management |
| Styling | Tailwind CSS 4 + shadcn/ui | Design system and component library |
| Routing | Wouter | Client-side routing |
| Charts | Recharts | Data visualizations |
| Animation | Framer Motion | UI transitions and micro-interactions |
| API Layer | tRPC 11 + Zod | End-to-end type-safe API |
| Server | Express 4 + Node.js | Backend HTTP server |
| Database ORM | Drizzle ORM | Type-safe MySQL queries |
| Database | MySQL / TiDB | Persistent storage for analyses |
| Authentication | Manus OAuth | Session-based user authentication |
| Embeddings | `@huggingface/transformers` | `all-MiniLM-L6-v2` (384-dim, ~22MB WASM) |
| Sentiment | `vader-sentiment` | Rule-based sentiment scoring |
| CSV Parsing | PapaParse | Robust CSV parsing with quoted fields |
| Testing | Vitest | Unit and integration tests |
| Build Tool | Vite 7 | Frontend bundler |
| Package Manager | pnpm | Dependency management |

---

## Architecture

The application follows a clean separation between client-side NLP processing and server-side persistence.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                             │
│  React 19 + Tailwind CSS + shadcn/ui                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Home Page   │  │  Dashboard   │  │  Library/Compare │  │
│  │  (Upload +   │  │  (6 tabs +   │  │  (Saved analyses │  │
│  │  Col. Mapper)│  │  Filters)    │  │  + Comparison)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │               AnalyticsContext (React Context)        │  │
│  │  Holds: analysis results, filters, processing state  │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼────────────────────────────┐  │
│  │                   NLP Pipeline (WebWorker-like)       │  │
│  │  csvParser → embeddings → sentiment → hdbscan →      │  │
│  │  clustering → labeling → quote extraction → summary  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ tRPC over HTTP
                              │ (save/load/share only)
┌─────────────────────────────▼───────────────────────────────┐
│                     Express Server (Node.js)                 │
│                                                             │
│  tRPC Router: auth · analysis · share                       │
│  Manus OAuth callback handler                               │
│  Session cookie management (JWT)                            │
│                              │                              │
│              ┌───────────────▼──────────────┐               │
│              │    MySQL / TiDB Database     │               │
│              │  users · analyses ·          │               │
│              │  analysis_comments ·         │               │
│              │  share_links                 │               │
│              └──────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## NLP Pipeline

The pipeline runs in seven sequential steps, each reporting progress to the UI.

**Step 1 — CSV Parsing.** PapaParse reads the uploaded file row by row. The column mapper resolves user-defined or auto-detected field mappings. Comments shorter than 10 characters are skipped.

**Step 2 — Model Loading.** The `all-MiniLM-L6-v2` Sentence Transformer model is loaded from the Hugging Face CDN via WebAssembly. The model is cached in the browser after the first download (~22 MB).

**Step 3 — Embedding Generation.** Each comment is converted to a 384-dimensional dense vector. Embeddings capture semantic meaning, so "The professor never responds to emails" and "My advisor is impossible to reach" will cluster together even though they share no keywords.

**Step 4 — Sentiment Analysis.** VADER (Valence Aware Dictionary and sEntiment Reasoner) scores each comment on a compound scale from -1.0 (most negative) to +1.0 (most positive). VADER is a rule-based lexicon designed for short social text and requires no model download.

**Step 5 — Topic Discovery (HDBSCAN).** A custom pure-TypeScript implementation of HDBSCAN* clusters the embeddings. Unlike K-Means, HDBSCAN does not require a pre-specified number of clusters and naturally identifies noise points (comments that do not belong to any coherent theme). The algorithm follows the Campello, Moulavi & Sander (2013) paper: core distances → mutual reachability graph → minimum spanning tree (Prim's) → cluster hierarchy condensation → stability-based cluster extraction. K-Means is used as a fallback for very small datasets.

**Step 6 — Topic Labeling.** Each cluster centroid is compared by cosine similarity against eight higher-education seed topic embeddings (Instructor Support, Advising & Communication, Course Workload, Curriculum Relevance, Campus Resources, Technical Platform Issues, Diversity & Inclusion, Student Engagement). The best-matching seed label is assigned to each cluster.

**Step 7 — Results Assembly.** Topics, sentiment breakdowns, weekly trends, emerging theme detection, per-topic coherence scores, stratified breakdowns by institution/program/school, and an executive summary are assembled and returned to the UI.

---

## Database Schema

Four tables are defined in `drizzle/schema.ts`:

| Table | Purpose |
|---|---|
| `users` | OAuth user accounts with role (`user` / `admin`) |
| `analyses` | Saved analysis runs with metadata and full results JSON |
| `analysis_comments` | Individual comments per analysis for filtering and drill-down |
| `share_links` | Tokenized read-only share links with optional expiry |

---

## API Reference

All API calls use tRPC procedures defined in `server/routers.ts`. The router is split into three namespaces:

**`auth`**
- `auth.me` — Returns the current authenticated user (public)
- `auth.logout` — Clears the session cookie (public)

**`analysis`**
- `analysis.save` — Saves a new analysis with all results and comments (protected)
- `analysis.list` — Lists all analyses for the current user (protected)
- `analysis.get` — Retrieves a single analysis with full results (protected)
- `analysis.update` — Updates analysis metadata (protected)
- `analysis.delete` — Deletes an analysis and all related data (protected)
- `analysis.compare` — Returns 2–4 analyses for side-by-side comparison (protected)

**`share`**
- `share.create` — Creates a tokenized share link (protected)
- `share.listByAnalysis` — Lists share links for an analysis (protected)
- `share.deactivate` — Deactivates a share link (protected)
- `share.access` — Retrieves a shared analysis by token (public)

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL or TiDB database
- Environment variables (see below)

### Environment Variables

```env
DATABASE_URL=mysql://user:password@host:port/dbname
JWT_SECRET=your-jwt-secret
VITE_APP_ID=your-oauth-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
```

### Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

The development server starts on port 3000 by default. The Vite dev server and Express backend are served from the same port via a proxy.

---

## Project Structure

```
ir-analytics/
├── client/
│   └── src/
│       ├── components/
│       │   ├── ColumnMapper.tsx      # Interactive column mapping UI
│       │   ├── FilterBar.tsx         # Multi-select filter bar
│       │   ├── GlobalNav.tsx         # Persistent navigation bar
│       │   ├── SaveAnalysisDialog.tsx
│       │   └── ExportButton.tsx
│       ├── contexts/
│       │   └── AnalyticsContext.tsx  # Central analysis state
│       ├── hooks/
│       │   └── useFilters.ts         # Filter state management
│       ├── lib/
│       │   ├── nlp/
│       │   │   ├── pipeline.ts       # Main pipeline orchestrator
│       │   │   ├── hdbscan.ts        # Custom HDBSCAN implementation
│       │   │   ├── clustering.ts     # Clustering + seed topic labeling
│       │   │   ├── embeddings.ts     # Transformers.js wrapper
│       │   │   ├── sentiment.ts      # VADER wrapper
│       │   │   └── csvParser.ts      # PapaParse wrapper + column detection
│       │   └── csvExport.ts          # CSV export utilities
│       └── pages/
│           ├── Home.tsx              # Upload + column mapper
│           ├── Dashboard.tsx         # Six-tab analysis dashboard
│           ├── Library.tsx           # Saved analyses list
│           ├── Compare.tsx           # Cross-semester comparison
│           ├── AnalysisView.tsx      # Single saved analysis view
│           └── SharedView.tsx        # Public shared analysis view
├── server/
│   ├── routers.ts                    # tRPC procedures
│   ├── db.ts                         # Database query helpers
│   ├── index.ts                      # Express entry point
│   └── _core/                        # Framework plumbing (OAuth, context, etc.)
├── drizzle/
│   └── schema.ts                     # Database schema definitions
├── shared/
│   └── types.ts                      # Shared TypeScript types
└── vitest.config.ts                  # Test configuration
```

---

## Testing

The project has 53 tests across 6 test files covering server-side API routes, NLP utilities, and CSV parsing:

```bash
pnpm test
```

| Test File | Tests | Coverage |
|---|---|---|
| `server/analysis.test.ts` | 12 | Analysis CRUD + share link procedures |
| `server/nlpSentiment.test.ts` | 13 | VADER sentiment scoring |
| `server/hdbscan.test.ts` | 10 | HDBSCAN algorithm correctness |
| `server/csvExport.test.ts` | 8 | CSV export formatting |
| `server/auth.logout.test.ts` | 1 | Auth logout procedure |
| `client/src/lib/nlp/csvParser.test.ts` | 9 | Column auto-detection |

---

## Privacy & FERPA Compliance

All NLP processing (embedding generation, clustering, sentiment analysis) runs entirely within the user's browser. No student comments or personally identifiable information are transmitted to any external server for analysis purposes. The only data sent to the server is what the user explicitly chooses to save (via the Save Analysis button), and that data is stored in the user's own database instance.

The application does not use any third-party analytics services that could capture survey content. The Hugging Face model is downloaded once and cached locally in the browser's IndexedDB.

---

## License

MIT
