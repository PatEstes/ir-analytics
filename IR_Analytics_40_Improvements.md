# IR Qualitative Analytics Engine — 40 Recommended Improvements

**Audit Date:** March 4, 2026
**Current State:** Full-stack web application with real client-side NLP pipeline (Transformers.js), database backend, save/load/compare/share functionality, CSV export, global navigation, and Observatory dark-mode design.

---

## Category 1 — NLP Pipeline Accuracy & Depth

These improvements address the core analysis engine — the most impactful area for producing trustworthy, actionable insights from student feedback.

### 1. Replace K-Means with HDBSCAN for Topic Clustering

The current pipeline uses k-means, which forces every comment into a cluster and requires pre-specifying the number of clusters. HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise) is the standard in BERTopic because it naturally identifies noise points and discovers clusters of varying density. A JavaScript implementation such as `hdbscanjs` or a WebAssembly port would produce more accurate topic boundaries and a genuine noise ratio rather than the current statistical approximation.

**Priority:** Critical | **Effort:** Medium

### 2. Add TF-IDF Keyword Extraction per Topic

The current pipeline labels clusters solely by cosine similarity to seed topic descriptions. Adding TF-IDF (Term Frequency–Inverse Document Frequency) keyword extraction within each cluster would surface the actual vocabulary students use, making topic labels more transparent and auditable. This also enables the word cloud visualization (see item 22). A pure-JS implementation like `natural` or a custom tokenizer would keep processing local.

**Priority:** High | **Effort:** Low

### 3. Implement Dynamic Seed Topic Management

The 8 seed topics are hardcoded in `clustering.ts`. Different institutions have different concerns — a community college may care about "Transfer Readiness" while a research university may need "Research Opportunities." The system should allow users to add, edit, and remove seed topics through a settings UI, with those custom seeds stored per-user in the database.

**Priority:** High | **Effort:** Medium

### 4. Add Bi-gram and Tri-gram Analysis

Single-word analysis misses important phrases like "office hours," "group projects," or "mental health." Adding n-gram extraction (bigrams and trigrams) to the pipeline would capture these compound concepts and improve both topic labeling and the keyword displays shown in the dashboard.

**Priority:** Medium | **Effort:** Low

### 5. Implement Aspect-Based Sentiment Analysis

The current VADER sentiment scores each comment as a whole, but a single comment often contains both praise and criticism (e.g., "The professor was great but the textbook was terrible"). Aspect-based sentiment would decompose comments into aspect-sentiment pairs, providing much richer insight. This could be implemented using the LLM integration on the server side (with user consent) or via a lightweight client-side model.

**Priority:** Medium | **Effort:** High

### 6. Add Comment Deduplication and Near-Duplicate Detection

Survey exports frequently contain duplicate or near-duplicate responses (copy-paste, re-submissions, or survey platform artifacts). Using the existing embeddings, the pipeline should detect comments with cosine similarity above 0.95 and flag or merge them before clustering, improving topic purity and accurate counts.

**Priority:** Medium | **Effort:** Low

### 7. Support Multi-Language Comment Detection

International student populations produce comments in multiple languages. The pipeline should detect the language of each comment (using a lightweight language detection library like `franc`) and either filter non-English comments into a separate category or translate them using a client-side model before analysis.

**Priority:** Low | **Effort:** Medium

---

## Category 2 — Data Architecture & Backend Robustness

These improvements strengthen the data layer, ensuring the system handles real-world scale, edge cases, and data integrity.

### 8. Store Original CSV in S3 with Download Capability

Currently, the original CSV file is parsed client-side and discarded. The system should upload the original file to S3 (using the built-in `storagePut` helper) and store the S3 URL in the `analyses` table. This enables re-analysis with updated pipeline versions, audit trails, and the ability to download the source data from the Library page.

**Priority:** High | **Effort:** Low

### 9. Add Database Indexes for Query Performance

The `analyses` table lacks indexes on `userId`, `semester`, `academicYear`, and `createdAt`. The `analysis_comments` table lacks an index on `analysisId`. As the database grows, list queries and joins will slow significantly. Adding composite indexes (e.g., `userId + createdAt DESC`) is a one-line schema change with major performance impact.

**Priority:** High | **Effort:** Low

### 10. Implement Pagination for Analysis List and Comments

The `analysis.list` route currently returns all analyses for a user with no limit. The `analysis.get` route loads the entire `resultsJson` blob. For power users with dozens of analyses, each containing thousands of comments, this will cause memory issues and slow page loads. Server-side cursor pagination with a default page size of 20 analyses and lazy-loaded comments would solve this.

**Priority:** High | **Effort:** Medium

### 11. Validate and Type the `resultsJson` Field

The `analysis.save` procedure accepts `resultsJson: z.any()`, which is a security and data integrity risk. A Zod schema matching the `AnalysisResult` TypeScript interface should validate the JSON before storage. This prevents malformed data from corrupting the database and provides runtime type safety.

**Priority:** High | **Effort:** Low

### 12. Add Soft Delete with Undo Capability

The current delete is permanent and immediate. Implementing a `deletedAt` timestamp column with a 30-day retention window would allow users to recover accidentally deleted analyses. The Library UI would show a "Recently Deleted" section with a restore button.

**Priority:** Medium | **Effort:** Low

### 13. Implement Background Job Processing for Large Datasets

For CSV files with 5,000+ comments, the client-side NLP pipeline can take 30+ seconds, during which the browser tab must remain open. A background processing architecture — using a server-side queue that accepts the CSV, runs analysis asynchronously, and notifies the user when complete — would handle large institutional datasets gracefully. The client-side pipeline would remain the default for smaller files.

**Priority:** Medium | **Effort:** High

### 14. Add Rate Limiting on Share Link Access

The `share.access` endpoint is a public procedure with no rate limiting. An attacker could brute-force share tokens (currently 21-character nanoid, which is secure, but defense-in-depth matters). Adding IP-based rate limiting (e.g., 10 requests per minute per IP) via Express middleware would mitigate this.

**Priority:** Medium | **Effort:** Low

### 15. Add Analysis Versioning

When a user re-runs analysis on the same dataset (e.g., after updating seed topics), the old results are overwritten. Adding a version history — storing each analysis run as a version with a timestamp — would let users compare how results change with different parameters or pipeline updates.

**Priority:** Low | **Effort:** Medium

---

## Category 3 — Frontend UX & Interaction Design

These improvements enhance usability, accessibility, and the overall user experience.

### 16. Add Column Mapping UI for Non-Standard CSVs

The CSV parser auto-detects columns by fuzzy-matching header names, but many institutional exports use non-standard headers (e.g., "Response" instead of "Comment_Text", or "Term" instead of "SurveyDate"). A column mapping dialog should appear after CSV upload, showing detected mappings with dropdowns to override each one. This is the single biggest usability barrier for new users.

**Priority:** Critical | **Effort:** Medium

### 17. Implement Dark/Light Theme Toggle

The Observatory dark theme is visually striking but problematic for users presenting in well-lit conference rooms or projecting onto screens. A theme toggle in the GlobalNav (already stubbed in the code via `ThemeProvider`) would let users switch to a light mode with proper CSS variable overrides. The toggle state should persist in `localStorage`.

**Priority:** High | **Effort:** Medium

### 18. Add Keyboard Accessibility and Focus Management

The FilterBar toggle buttons, tab navigation, and export buttons lack visible focus indicators and keyboard navigation support. Adding `tabIndex`, `aria-label`, `role` attributes, and visible focus rings (`:focus-visible` styles) would make the application accessible to screen reader users and keyboard-only navigators — important for institutional compliance with Section 508 and WCAG 2.1 AA.

**Priority:** High | **Effort:** Medium

### 19. Build an Onboarding Tour for First-Time Users

IR professionals are not always technically savvy. A guided tour (using a library like `react-joyride`) that walks first-time users through the upload flow, explains what each dashboard tab shows, and demonstrates the filter/export features would dramatically reduce the learning curve and support requests.

**Priority:** Medium | **Effort:** Medium

### 20. Add Loading Skeletons Instead of Spinners

The Library, AnalysisView, and Compare pages show a centered spinner during data loading. Replacing these with skeleton screens (using shadcn's Skeleton component) that match the layout of the actual content would reduce perceived loading time and prevent layout shift when data arrives.

**Priority:** Medium | **Effort:** Low

### 21. Improve Mobile Responsiveness of Dashboard Charts

While the GlobalNav has a mobile hamburger menu, the dashboard charts (Recharts BarChart, PieChart, LineChart) overflow on screens below 640px. The charts need responsive container widths, smaller font sizes at mobile breakpoints, and the filter bar should stack vertically. The tab navigation should become a horizontal scrollable strip on mobile.

**Priority:** Medium | **Effort:** Medium

### 22. Add Drag-and-Drop Reordering for Dashboard Tabs

Different stakeholders care about different tabs — a provost may want Summary first, while a department chair wants Themes. Allowing users to drag-and-drop reorder the dashboard tabs (persisted in `localStorage`) would let each user customize their view.

**Priority:** Low | **Effort:** Medium

### 23. Add Breadcrumb Navigation for Deep Pages

Pages like `/analysis/3/share` lack context about where the user is in the hierarchy. Adding breadcrumbs (Home > Library > Fall 2025 Analysis > Share) below the GlobalNav would improve wayfinding, especially for shared link recipients who land on deep pages.

**Priority:** Low | **Effort:** Low

---

## Category 4 — Analytics & Visualization Enhancements

These improvements add new visualization types and analytical capabilities.

### 24. Add Word Cloud Visualization to Themes Tab

A word cloud showing the most frequent terms within each topic cluster would give users an instant visual summary of what students are talking about. Libraries like `react-wordcloud` or `d3-cloud` can render interactive word clouds that respond to the current filter state. Clicking a word could filter the quotes tab to show comments containing that term.

**Priority:** High | **Effort:** Medium

### 25. Add Heatmap Cross-Tabulation View

A heatmap showing topic frequency crossed with institution, school, or program level would reveal patterns invisible in bar charts — for example, "Technical Platform Issues are concentrated in the School of Education at Metro College." This could use Recharts' `ScatterChart` with custom cell rendering or a dedicated heatmap library.

**Priority:** High | **Effort:** Medium

### 26. Add Interactive Chart Drill-Down

Clicking a bar in the topic distribution chart should drill down to show that topic's sentiment breakdown, representative quotes, and trend line — all in a focused panel or modal. This reduces the cognitive load of switching between tabs to explore a single topic.

**Priority:** Medium | **Effort:** Medium

### 27. Add Trend Forecasting with Simple Linear Regression

The Trends tab shows historical weekly frequencies but offers no forward projection. Adding a simple linear regression line (easily computed in JavaScript) would show whether a topic is likely to grow or shrink in the next 2-4 weeks, helping IR teams prioritize proactive interventions.

**Priority:** Medium | **Effort:** Low

### 28. Add PDF Executive Summary Report Generator

Stakeholders often need a polished, printable report rather than an interactive dashboard. A "Generate Report" button should produce a PDF containing the executive summary, top themes with representative quotes, sentiment overview, trend highlights, and key validation metrics. This could use the built-in `@react-pdf/renderer` or server-side PDF generation via `puppeteer`.

**Priority:** Medium | **Effort:** High

### 29. Add Sentiment Timeline Chart

The current Trends tab shows topic frequency over time but not sentiment over time. A sentiment timeline — showing average compound score per week, with color-coded bands for positive/negative zones — would reveal whether student satisfaction is improving or deteriorating across the survey period.

**Priority:** Medium | **Effort:** Low

### 30. Add Comparison Sparklines in Library Cards

Each analysis card in the Library currently shows static numbers (responses, topics, noise). Adding tiny sparkline charts showing the topic distribution or sentiment split would let users visually compare analyses at a glance without opening each one.

**Priority:** Low | **Effort:** Low

---

## Category 5 — Collaboration & Sharing

These improvements enhance multi-user workflows and institutional collaboration.

### 31. Add Granular Share Permissions (FERPA-Critical)

The current share system is binary — a shared link gives full read access to all analysis data, including individual comments. For FERPA compliance, share links should support permission levels: "Summary Only" (aggregate charts, no individual comments), "Full Analysis" (current behavior), and "Themes Only" (topic distribution without sentiment or quotes). This is arguably the most important FERPA improvement.

**Priority:** Critical | **Effort:** Medium

### 32. Add Team Workspaces

IR offices typically have 3-10 staff members who need to collaborate on the same analyses. A workspace model — where users can create teams, invite members, and share analyses within the workspace — would replace the current single-user library with a collaborative environment. This requires a `workspaces` table, a `workspace_members` junction table, and workspace-scoped queries.

**Priority:** High | **Effort:** High

### 33. Add Annotations and Comments on Analysis Results

Users should be able to add notes to specific topics, quotes, or trends — for example, "Follow up with Dean of Engineering about this" or "This aligns with last year's accreditation findings." These annotations would be stored in the database and visible to workspace members, turning the dashboard from a read-only report into a collaborative analysis tool.

**Priority:** Medium | **Effort:** Medium

### 34. Add Email/In-App Notifications for Share Activity

When a shared analysis is viewed for the first time, the owner should receive a notification (using the built-in `notifyOwner` helper). This closes the feedback loop — the IR director knows their provost actually looked at the report. Additional triggers could include "analysis processing complete" and "share link expiring soon."

**Priority:** Medium | **Effort:** Low

### 35. Add Analysis Templates

Power users often run the same type of analysis repeatedly (e.g., "End-of-Semester Course Evaluation" with specific seed topics, filters, and export settings). Saving these configurations as reusable templates would streamline recurring workflows. A template would store the column mapping, seed topics, filter presets, and export format.

**Priority:** Low | **Effort:** Medium

---

## Category 6 — Security, Performance & Infrastructure

These improvements harden the application for production use in institutional environments.

### 36. Add Content Security Policy (CSP) Headers

The application currently serves no CSP headers, leaving it vulnerable to XSS attacks if any user-generated content (comment text) is rendered without proper sanitization. Adding strict CSP headers via Express middleware — allowing only the application's own origin, CDN assets, and the Hugging Face model CDN — would provide defense-in-depth against injection attacks.

**Priority:** High | **Effort:** Low

### 37. Implement React Query Cache Optimization

Several tRPC queries (e.g., `analysis.list`, `analysis.get`) use default cache settings, causing unnecessary re-fetches on every page navigation. Setting `staleTime: 5 * 60 * 1000` (5 minutes) for list queries and `staleTime: Infinity` for immutable analysis results would reduce API calls by 80%+ and make page transitions feel instant.

**Priority:** High | **Effort:** Low

### 38. Add Code Splitting and Lazy Loading for Dashboard Tabs

The Dashboard page imports all 6 tab components and the entire Recharts library upfront, resulting in a large initial bundle. Using `React.lazy()` with `Suspense` for each tab component — and dynamically importing Recharts only when the Dashboard route is visited — would reduce the initial page load by an estimated 40-60%.

**Priority:** Medium | **Effort:** Low

### 39. Add Per-Route Error Boundaries

The application has a single top-level `ErrorBoundary` in `App.tsx`. If the Dashboard crashes (e.g., due to malformed analysis data), the entire application goes blank. Adding per-route error boundaries — especially around the Dashboard, AnalysisView, and SharedView — would contain failures to the affected page and show a recovery UI with a "Return to Home" button.

**Priority:** Medium | **Effort:** Low

### 40. Add End-to-End Testing with Playwright

The current test suite covers backend routes and utility functions but has no integration or E2E tests. Adding Playwright tests for the critical user flows — upload CSV → view dashboard → save analysis → share link → access shared view — would catch regressions that unit tests miss, especially around the NLP pipeline integration and tRPC data flow.

**Priority:** Medium | **Effort:** High

---

## Priority / Effort Matrix

The following table summarizes all 40 improvements by priority and effort, helping you decide what to tackle first.

| # | Improvement | Priority | Effort | Category |
|---|---|---|---|---|
| 1 | HDBSCAN clustering | Critical | Medium | NLP Pipeline |
| 16 | Column mapping UI | Critical | Medium | Frontend UX |
| 31 | Granular share permissions | Critical | Medium | Collaboration |
| 2 | TF-IDF keyword extraction | High | Low | NLP Pipeline |
| 3 | Dynamic seed topic management | High | Medium | NLP Pipeline |
| 8 | Store original CSV in S3 | High | Low | Data Architecture |
| 9 | Database indexes | High | Low | Data Architecture |
| 10 | Pagination for lists | High | Medium | Data Architecture |
| 11 | Validate resultsJson schema | High | Low | Data Architecture |
| 17 | Dark/light theme toggle | High | Medium | Frontend UX |
| 18 | Keyboard accessibility | High | Medium | Frontend UX |
| 24 | Word cloud visualization | High | Medium | Visualization |
| 25 | Heatmap cross-tabulation | High | Medium | Visualization |
| 32 | Team workspaces | High | High | Collaboration |
| 36 | CSP headers | High | Low | Security |
| 37 | React Query cache optimization | High | Low | Performance |
| 4 | Bi-gram/tri-gram analysis | Medium | Low | NLP Pipeline |
| 5 | Aspect-based sentiment | Medium | High | NLP Pipeline |
| 6 | Comment deduplication | Medium | Low | NLP Pipeline |
| 12 | Soft delete with undo | Medium | Low | Data Architecture |
| 13 | Background job processing | Medium | High | Data Architecture |
| 14 | Rate limiting on share access | Medium | Low | Data Architecture |
| 19 | Onboarding tour | Medium | Medium | Frontend UX |
| 20 | Loading skeletons | Medium | Low | Frontend UX |
| 21 | Mobile chart responsiveness | Medium | Medium | Frontend UX |
| 26 | Interactive chart drill-down | Medium | Medium | Visualization |
| 27 | Trend forecasting | Medium | Low | Visualization |
| 28 | PDF report generator | Medium | High | Visualization |
| 29 | Sentiment timeline chart | Medium | Low | Visualization |
| 33 | Annotations on results | Medium | Medium | Collaboration |
| 34 | Share activity notifications | Medium | Low | Collaboration |
| 38 | Code splitting / lazy loading | Medium | Low | Performance |
| 39 | Per-route error boundaries | Medium | Low | Security |
| 40 | E2E testing with Playwright | Medium | High | Infrastructure |
| 7 | Multi-language detection | Low | Medium | NLP Pipeline |
| 15 | Analysis versioning | Low | Medium | Data Architecture |
| 22 | Drag-and-drop tab reorder | Low | Medium | Frontend UX |
| 23 | Breadcrumb navigation | Low | Low | Frontend UX |
| 30 | Library card sparklines | Low | Low | Visualization |
| 35 | Analysis templates | Low | Medium | Collaboration |

---

## Recommended Implementation Order

The following 8-sprint roadmap sequences improvements to maximize value delivery while respecting dependencies.

**Sprint 1 — Foundation Fixes (Items 9, 11, 36, 37, 39)**
Quick wins that harden the backend and frontend. Database indexes, JSON validation, CSP headers, cache optimization, and error boundaries. All are low-effort, high-impact changes that should ship before any feature work.

**Sprint 2 — NLP Pipeline Upgrade (Items 1, 2, 4, 6)**
Replace k-means with HDBSCAN, add TF-IDF keyword extraction, n-gram analysis, and deduplication. This sprint transforms the analysis engine from "good enough" to "production-grade." Item 2 is a prerequisite for the word cloud (item 24).

**Sprint 3 — CSV & Upload UX (Items 8, 16, 20)**
Add the column mapping UI (the biggest usability barrier), store original CSVs in S3, and replace spinners with skeletons. This sprint removes the primary friction point for new users.

**Sprint 4 — Visualization Expansion (Items 24, 25, 27, 29, 30)**
Add word cloud, heatmap, trend forecasting, sentiment timeline, and library sparklines. These are the features that make stakeholders say "wow" in presentations.

**Sprint 5 — FERPA & Sharing (Items 14, 31, 34)**
Add granular share permissions (the most important FERPA improvement), rate limiting, and share notifications. This sprint makes the sharing system production-ready for institutional use.

**Sprint 6 — Accessibility & Theming (Items 17, 18, 21, 23)**
Add dark/light toggle, keyboard accessibility, mobile responsiveness, and breadcrumbs. This sprint addresses compliance requirements (Section 508, WCAG 2.1 AA) and makes the app usable in all contexts.

**Sprint 7 — Collaboration (Items 3, 32, 33, 35)**
Add dynamic seed topics, team workspaces, annotations, and analysis templates. This sprint transforms the tool from a single-user utility into a collaborative platform for IR offices.

**Sprint 8 — Scale & Polish (Items 5, 7, 10, 12, 13, 15, 19, 22, 26, 28, 38, 40)**
The remaining items: aspect-based sentiment, multi-language support, pagination, soft delete, background processing, versioning, onboarding tour, tab reordering, drill-down, PDF reports, code splitting, and E2E tests. These are the polish items that take the product from "good" to "exceptional."

---

*This audit reflects the application state as of March 4, 2026, checkpoint version `b6fa02b3`.*
