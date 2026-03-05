import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Saved analyses — each row represents one complete analysis run.
 * Stores aggregated results as JSON to avoid complex relational modeling
 * for what is essentially a document store of analysis snapshots.
 */
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** User-provided name for this analysis */
  title: varchar("title", { length: 255 }).notNull(),
  /** Optional description or notes */
  description: text("description"),
  /** Original CSV filename */
  fileName: varchar("fileName", { length: 255 }).notNull(),
  /** Semester label for comparison (e.g., "Fall 2025", "Spring 2026") */
  semester: varchar("semester", { length: 64 }),
  /** Academic year (e.g., "2025-2026") */
  academicYear: varchar("academicYear", { length: 20 }),
  /** Total number of raw responses in the CSV */
  totalResponses: int("totalResponses").notNull().default(0),
  /** Number of comments after cleaning */
  cleanedComments: int("cleanedComments").notNull().default(0),
  /** Number of topics discovered */
  topicCount: int("topicCount").notNull().default(0),
  /** Noise ratio percentage */
  noiseRatio: varchar("noiseRatio", { length: 10 }),
  /** Processing time in seconds */
  processingTime: varchar("processingTime", { length: 20 }),
  /** Full analysis results JSON — topics, sentiment, trends, validation, etc. */
  resultsJson: json("resultsJson"),
  /** Distinct institutions found in data */
  institutions: json("institutions").$type<string[]>(),
  /** Distinct program levels found */
  programLevels: json("programLevels").$type<string[]>(),
  /** Distinct schools found */
  schools: json("schools").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

/**
 * Individual comments stored per analysis for filtering and drill-down.
 * Stored separately from the aggregated results to enable cross-analysis queries.
 */
export const analysisComments = mysqlTable("analysis_comments", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  /** Original response ID from CSV */
  responseId: varchar("responseId", { length: 128 }),
  /** Raw comment text */
  commentText: text("commentText").notNull(),
  /** Assigned topic/theme label */
  topic: varchar("topic", { length: 255 }),
  /** Sentiment label: Positive, Negative, Neutral */
  sentimentLabel: varchar("sentimentLabel", { length: 20 }),
  /** Numeric sentiment score */
  sentimentScore: varchar("sentimentScore", { length: 20 }),
  /** Institution name */
  institution: varchar("institution", { length: 255 }),
  /** Program level */
  programLevel: varchar("programLevel", { length: 128 }),
  /** School name */
  school: varchar("school", { length: 255 }),
  /** Survey date */
  surveyDate: varchar("surveyDate", { length: 64 }),
  /** Whether this is a representative quote for its topic */
  isRepresentative: int("isRepresentative").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisComment = typeof analysisComments.$inferSelect;
export type InsertAnalysisComment = typeof analysisComments.$inferInsert;

/**
 * Shareable links — allow users to share read-only access to an analysis.
 */
export const shareLinks = mysqlTable("share_links", {
  id: int("id").autoincrement().primaryKey(),
  /** The analysis being shared */
  analysisId: int("analysisId").notNull(),
  /** The user who created the share link */
  createdByUserId: int("createdByUserId").notNull(),
  /** Unique share token (used in URL) */
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  /** Optional label for the link */
  label: varchar("label", { length: 255 }),
  /** Whether the link is currently active */
  isActive: int("isActive").default(1).notNull(),
  /** Optional expiration timestamp (ms since epoch) */
  expiresAt: bigint("expiresAt", { mode: "number" }),
  /** Number of times the link has been accessed */
  accessCount: int("accessCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;
