# Dashboard Filter/Search Feature

- [x] Review current data model (AnalyticsContext) to understand available fields for filtering
- [x] Review Dashboard.tsx to understand current tab structure
- [x] Add filter state to AnalyticsContext (selectedThemes, selectedInstitutions, selectedProgramLevels, selectedSchools)
- [x] Create FilterBar component with multi-select dropdowns for each filter dimension
- [x] Add theme search/text filter capability
- [x] Integrate filters into Summary tab
- [x] Integrate filters into Themes tab
- [x] Integrate filters into Sentiment tab
- [x] Integrate filters into Trends tab
- [x] Integrate filters into Quotes tab
- [x] Integrate filters into Validation tab
- [x] Test all tabs with filters applied
- [x] Checkpoint and deliver

## Full-Stack Upgrade

- [x] Resolve merge conflicts from web-db-user upgrade (Home.tsx, NotFound.tsx)
- [x] Design and create database schema (analyses, analysis_comments, shared_links tables)
- [x] Push database migrations
- [x] Build backend API routes (save analysis, list analyses, load analysis, compare analyses, share link)
- [x] Update frontend: Save Analysis flow after processing
- [x] Build Analysis Library page (list saved analyses with metadata)
- [x] Build Comparison View page (side-by-side semester comparison)
- [x] Build Share Link functionality (generate & consume share links)
- [x] Update navigation and routing in App.tsx
- [x] Write vitest tests for backend routes (13 tests passing)
- [x] Test end-to-end and checkpoint

## CSV Export Feature

- [x] Create reusable CSV export utility (csvExport.ts)
- [x] Add export button to Summary tab (executive summary text export)
- [x] Add export button to Themes tab (topic distribution data)
- [x] Add export button to Sentiment tab (sentiment breakdown data)
- [x] Add export button to Trends tab (weekly trend data)
- [x] Add export button to Quotes tab (representative quotes with metadata)
- [x] Add export button to Validation tab (validation metrics data)
- [x] Add "Export All" button in dashboard header for full filtered dataset
- [x] Test all exports with filters applied
- [x] Checkpoint and deliver

## Real Client-Side NLP Pipeline (Option A)

- [x] Research Transformers.js browser compatibility and model sizes
- [x] Install @huggingface/transformers, ml-kmeans, vader-sentiment, papaparse
- [x] Build embeddings module (all-MiniLM-L6-v2 via Transformers.js)
- [x] Build sentiment module (VADER pure-JS, no model download needed)
- [x] Build clustering module (k-means on embeddings for topic discovery)
- [x] Build quote extraction module (cosine similarity to cluster centroids)
- [x] Build seed topic matching (map clusters to higher-ed seed topics)
- [x] Fix CSV parser using PapaParse (handles quoted fields, commas, multi-line)
- [x] Add auto-detection of column mapping with fuzzy matching
- [x] Replace generateDemoResult() with real pipeline in AnalyticsContext
- [x] Update progress indicators with real pipeline step progress
- [x] Demo mode generates real CSV from sample comments and runs through real pipeline
- [x] Test with real CSV data end-to-end (50 comments, 7 themes, 4.9s)
- [x] Write vitest tests for pipeline modules (13 new tests, 34 total)
- [x] Checkpoint and deliver

## Global Navigation Bar

- [x] Review current page structure and identify redundant navigation
- [x] Build GlobalNav component with branding, nav links, auth state, mobile menu
- [x] Integrate GlobalNav into App.tsx as a persistent layout wrapper
- [x] Update Home page to remove any conflicting header
- [x] Update Dashboard page to integrate with global nav (remove standalone back/library buttons)
- [x] Update Library page to work within global nav layout
- [x] Update Compare page to work within global nav layout
- [x] Update AnalysisView, ShareAnalysis, SharedView pages
- [x] Ensure responsive mobile hamburger menu
- [x] Test all pages with global nav, write tests, and checkpoint

## HDBSCAN Clustering Upgrade

- [x] Research JavaScript HDBSCAN implementations (hdbscanjs, custom, WASM)
- [x] Implement HDBSCAN clustering module replacing K-Means
- [x] Handle genuine noise points (cluster label -1) in the pipeline
- [x] Update topic labeling to work with variable cluster counts
- [x] Update validation metrics (noise ratio, coherence) to use real HDBSCAN noise
- [x] Update pipeline.ts to integrate new clustering module
- [x] Write vitest tests for HDBSCAN clustering
- [x] Test end-to-end with demo data and verify improved topic quality
- [x] Add per-topic coherence scores (replacing single global coherence)
- [x] Improve quality flag logic (relative size thresholds)
- [x] Checkpoint and deliver

## Interactive Column Mapper

- [x] Review existing CSV parser and column auto-detection logic
- [x] Create ColumnMapper component with dropdown selectors for each field
- [x] Show CSV preview (first 5 rows) so users can see their data
- [x] Auto-detect columns on file load and pre-fill dropdowns
- [x] Allow manual override of any column mapping
- [x] Mark required vs optional fields (Comment_Text required, others optional)
- [x] Add "Confirm & Analyze" button to proceed with chosen mapping
- [x] Integrate ColumnMapper into Home.tsx upload flow (file → mapper → analysis)
- [x] Handle edge cases (missing columns, duplicate mappings, empty CSV)
- [x] Write vitest tests for column mapping logic (9 tests)
- [x] Test end-to-end with demo and real CSV data
- [x] Checkpoint and deliver

## Word Cloud Widget

- [x] Review Themes tab layout and data flow in Dashboard.tsx
- [x] Build term frequency extraction utility from comments per topic
- [x] Build WordCloud component (SVG-based, sized by frequency, themed colors)
- [x] Integrate WordCloud into Themes tab (per-topic or global toggle)
- [x] Ensure word cloud respects active filters
- [x] Write vitest tests for term frequency extraction (10 tests)
- [x] Test end-to-end with demo data
- [x] Checkpoint and deliver
