# IR Qualitative Analytics Engine — System Overview

**Document Type:** High-Level System Overview  
**Audience:** Institutional Research professionals, academic technology teams, AI tools, and technical collaborators  
**Last Updated:** March 2026

---

## What This System Is

The IR Qualitative Analytics Engine is a web-based platform designed specifically for Institutional Research (IR) offices in higher education. Its purpose is to automate the qualitative analysis of open-ended survey responses — the kind of free-text feedback that students provide in course evaluations, student experience surveys, program exit surveys, and institutional climate assessments.

The central challenge this system addresses is scale. A mid-sized university might collect 10,000 to 50,000 open-ended survey responses per semester. Reading and manually coding those responses is impractical for most IR teams. Outsourcing the analysis to commercial text analytics vendors raises serious concerns under FERPA (the Family Educational Rights and Privacy Act), which governs the handling of student education records. This system resolves both problems: it applies real AI-powered NLP analysis at scale while keeping all student data entirely within the user's browser — nothing is transmitted to any external server for processing.

---

## The Problem It Solves

Higher education IR offices face a consistent set of challenges with qualitative data:

**Volume without structure.** Open-ended survey questions generate rich, nuanced feedback, but the sheer volume makes systematic analysis impossible without technology. A single semester's course evaluation data might contain 20,000 individual comments across hundreds of courses and programs.

**FERPA compliance barriers.** Student survey responses are education records under FERPA. Uploading them to commercial text analytics platforms (many of which are cloud-based and use data for model training) creates legal and ethical exposure. Most IR offices either avoid qualitative analysis entirely or rely on small, non-representative samples they can manually review.

**Lack of temporal insight.** Even when qualitative coding is done, it is typically done once per semester in isolation. There is no systematic way to detect whether a concern raised in Spring 2025 has grown, shrunk, or shifted in character by Fall 2025.

**Inconsistent methodology.** Manual qualitative coding is subject to inter-rater reliability problems. Different analysts may categorize the same comment differently, making longitudinal comparison unreliable.

This system addresses all four challenges through a combination of browser-based AI processing, structured topic modeling, automated trend detection, and a persistent analysis library that enables cross-semester comparison.

---

## How the System Works

### The User Journey

A typical analysis session follows four stages:

**1. Upload.** The user uploads a CSV file exported from their survey platform (Qualtrics, SurveyMonkey, or any standard CSV format). The system immediately reads the file headers and presents a column mapping interface.

**2. Column Mapping.** The column mapper auto-detects which CSV columns correspond to the expected fields (comment text, response ID, institution, school/department, program level, survey date) using a library of 50+ aliases for common column name variations. Users can review and override any mapping, and preview the first five rows of their data before proceeding. This step is critical for supporting the wide variety of CSV export formats that different survey platforms produce.

**3. Analysis.** The NLP pipeline runs entirely in the browser. A progress bar with step-level labels keeps the user informed as the system works through seven stages: CSV parsing, model loading, embedding generation, sentiment scoring, topic clustering, result assembly, and executive summary generation. For a dataset of 50 comments, this takes approximately 3–4 seconds. For larger datasets (1,000+ comments), it may take 30–60 seconds depending on the device.

**4. Dashboard.** Results are presented in a six-tab dashboard. Users can apply filters to narrow results by institution, school, program level, or theme, and all six tabs update simultaneously to reflect the filtered view.

### The NLP Pipeline in Plain Language

The analysis pipeline is the technical core of the system. It consists of five distinct computational stages:

**Semantic Embedding.** Each comment is converted into a 384-dimensional numerical vector (called an embedding) that captures its semantic meaning. This is done using the `all-MiniLM-L6-v2` Sentence Transformer model, a compact but highly capable model developed by Microsoft Research and available via Hugging Face. The model runs entirely in the browser via WebAssembly. Crucially, embeddings encode meaning rather than keywords: "The professor never responds to emails" and "My advisor is completely unreachable" will produce similar vectors even though they share no words, because they express the same underlying concern.

**Density-Based Clustering (HDBSCAN).** The embeddings are clustered using HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise), a state-of-the-art algorithm developed by Campello, Moulavi, and Sander (2013). Unlike K-Means, HDBSCAN does not require the analyst to specify the number of topics in advance. It discovers clusters of varying density and explicitly identifies "noise points" — comments that do not belong to any coherent theme. This noise detection is a meaningful quality signal: a high noise ratio (above 20%) suggests the dataset may be too heterogeneous for reliable topic modeling. The system implements HDBSCAN from scratch in pure TypeScript, without any external dependencies, to ensure it runs in the browser without a server call.

**Topic Labeling.** Once clusters are identified, each cluster needs a human-readable label. The system compares each cluster's centroid (the average embedding of all comments in the cluster) against eight pre-defined higher-education seed topics: Instructor Support, Advising & Communication, Course Workload, Curriculum Relevance, Campus Resources, Technical Platform Issues, Diversity & Inclusion, and Student Engagement. The seed topic whose embedding is most similar (by cosine similarity) to the cluster centroid is assigned as the topic label. This approach grounds the discovered clusters in domain-relevant terminology that IR professionals will recognize.

**Sentiment Analysis.** Each comment is scored using VADER (Valence Aware Dictionary and sEntiment Reasoner), a rule-based sentiment analysis tool specifically designed for short social text. VADER assigns a compound score from -1.0 (most negative) to +1.0 (most positive) and classifies each comment as Positive, Negative, or Neutral. VADER requires no model download and runs instantly.

**Trend Detection.** If survey dates are present in the data, the system groups comments by ISO week and computes topic frequency over time. It then compares the first half of the date range against the second half to identify rising, stable, and declining themes. A theme is flagged as "emerging" if its frequency more than doubled in the later period.

---

## What the Dashboard Shows

The six-tab dashboard presents the analysis results in a structured, filterable format.

| Tab | Content |
|---|---|
| **Summary** | Key metrics (total responses, valid comments, theme count, emerging issues), executive summary narrative, and stratified breakdowns by institution, program level, and school |
| **Themes** | Topic distribution bar chart, theme cards with comment counts, percentages, and up to three representative quotes per theme |
| **Sentiment** | Overall sentiment pie chart, sentiment breakdown by topic (positive/negative/neutral percentages and average compound score) |
| **Trends** | Weekly frequency line chart for each topic, emerging theme indicators with growth multipliers |
| **Quotes** | Filterable table of all comments with their assigned topic, sentiment label, and metadata |
| **Validation** | Per-topic coherence scores, noise ratio, average cluster size, and quality flags (e.g., "High Noise" if noise exceeds 20%) |

The filter bar above the tabs supports multi-select filtering by institution, school/department, program level, and theme name. All six tabs update simultaneously when filters are applied.

---

## Persistence and Collaboration Features

Beyond the in-browser analysis, the system provides a set of server-backed features for saving, organizing, and sharing results.

**Analysis Library.** Authenticated users can save any completed analysis to the database with a title, semester label (e.g., "Fall 2025"), and academic year. The Library page lists all saved analyses with metadata and allows users to reload, rename, or delete them.

**Cross-Semester Comparison.** The Compare page allows users to select two to four saved analyses and view them side-by-side. This is the primary tool for longitudinal analysis — for example, comparing student feedback themes from Fall 2024 and Spring 2025 to see whether concerns about advising communication have improved or worsened.

**Shareable Links.** Users can generate a tokenized read-only share link for any saved analysis. Recipients can view the full analysis dashboard without logging in. Links can be labeled (e.g., "For Dean of Students Review"), set to expire after a specified number of days, and deactivated at any time.

**CSV Export.** Every tab has an export button that downloads the currently filtered data as a CSV file. A global "Export All" button in the dashboard header downloads the complete filtered comment dataset with all metadata, suitable for import into Power BI, Tableau, or other reporting tools.

---

## System Design Decisions

Several design decisions reflect the specific constraints and priorities of the IR context:

**Browser-only NLP.** The decision to run all NLP processing in the browser — rather than sending data to a server-side model API — was driven entirely by FERPA compliance. This required implementing HDBSCAN from scratch in TypeScript (no suitable browser-compatible library existed), using a compact embedding model that fits in browser memory, and accepting the trade-off that analysis speed depends on the user's device.

**Seed-topic labeling over pure unsupervised labeling.** Purely unsupervised topic labeling (e.g., using the top TF-IDF terms from each cluster) produces labels that are often opaque to non-technical users ("professor assignment feedback grade" is not a useful label for an IR professional). By anchoring labels to a curated set of higher-education seed topics, the system produces immediately interpretable results. The trade-off is that topics outside the seed set may be mislabeled; the Validation tab's coherence scores help users identify when this is happening.

**JSON storage for analysis results.** Rather than normalizing the full analysis results into a complex relational schema, the system stores the complete results object as a JSON column in the `analyses` table. Individual comments are stored in a separate `analysis_comments` table to enable filtering and cross-analysis queries. This hybrid approach balances query flexibility with schema simplicity.

**tRPC for the API layer.** Using tRPC provides end-to-end TypeScript type safety between the frontend and backend without requiring a separate API schema definition step. The `AppRouter` type is the single source of truth for all API contracts.

---

## Data Model Summary

The system's database consists of four tables:

**`users`** stores authenticated user accounts created via OAuth. Each user has a role (`user` or `admin`) and is linked to their analyses by foreign key.

**`analyses`** is the central table. Each row represents one complete analysis run and stores metadata (title, semester, academic year, file name, response counts, processing time) alongside the full results JSON blob (topics, sentiment, trends, validation metrics, executive summary).

**`analysis_comments`** stores individual comments per analysis. Each comment record includes the raw text, assigned topic, sentiment label and score, institution, program level, school, and survey date. This table enables the filtered Quotes tab and cross-analysis comment queries.

**`share_links`** stores tokenized share links. Each link is associated with an analysis and a creating user, and includes an optional expiry timestamp and an access counter.

---

## Limitations and Known Constraints

**Model accuracy on small datasets.** HDBSCAN requires a minimum density of points to form clusters. On datasets with fewer than 30–40 comments, the algorithm may classify most points as noise and fall back to K-Means. Results on very small datasets should be interpreted with caution.

**Seed topic coverage.** The eight seed topics cover the most common themes in higher-education student feedback, but they do not cover every possible topic. Comments about financial aid, housing, dining, or athletics, for example, may be assigned to the nearest seed topic rather than a more specific label. The Validation tab's coherence scores help identify poorly-matched topics.

**Date parsing.** Trend analysis requires survey dates in a parseable format. Dates stored as text strings in unusual formats (e.g., "January 15, 2025" rather than "2025-01-15") may not parse correctly, resulting in those comments being excluded from trend charts.

**Browser memory.** Generating embeddings for very large datasets (10,000+ comments) may exhaust browser memory on low-RAM devices. The practical upper limit on most modern laptops is approximately 5,000–8,000 comments per analysis session.

**First-run model download.** The `all-MiniLM-L6-v2` model (~22 MB) is downloaded from the Hugging Face CDN on the first analysis run. Subsequent runs use the cached version from the browser's IndexedDB. Users on slow connections may experience a delay on their first use.

---

## Intended Users

The primary users of this system are Institutional Research analysts and directors at colleges and universities. Secondary users include academic deans, assessment coordinators, and student affairs professionals who receive shared analysis links from IR. The system assumes basic familiarity with survey data and CSV files but does not require any technical or statistical background to use.

---

## Summary

The IR Qualitative Analytics Engine is a purpose-built tool that brings modern NLP capabilities to higher education IR offices without compromising on FERPA compliance. It combines a browser-based AI pipeline (semantic embeddings, HDBSCAN clustering, VADER sentiment analysis) with a full-stack persistence layer (MySQL, tRPC, OAuth) to deliver a complete qualitative analysis workflow: from CSV upload through column mapping, analysis, dashboard exploration, filtering, cross-semester comparison, and shareable reporting. The system is designed to be used by non-technical IR professionals while being fully transparent and extensible for technical teams.
