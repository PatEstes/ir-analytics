import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  analyses, InsertAnalysis, Analysis,
  analysisComments, InsertAnalysisComment,
  shareLinks, InsertShareLink, ShareLink,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ───────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Analysis Helpers ───────────────────────────────────────────

export async function createAnalysis(data: InsertAnalysis): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(analyses).values(data);
  return Number(result[0].insertId);
}

export async function getAnalysesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: analyses.id,
      title: analyses.title,
      description: analyses.description,
      fileName: analyses.fileName,
      semester: analyses.semester,
      academicYear: analyses.academicYear,
      totalResponses: analyses.totalResponses,
      cleanedComments: analyses.cleanedComments,
      topicCount: analyses.topicCount,
      noiseRatio: analyses.noiseRatio,
      processingTime: analyses.processingTime,
      institutions: analyses.institutions,
      programLevels: analyses.programLevels,
      schools: analyses.schools,
      createdAt: analyses.createdAt,
    })
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt));
}

export async function getAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteAnalysis(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete comments first
  await db.delete(analysisComments).where(eq(analysisComments.analysisId, id));
  // Delete share links
  await db.delete(shareLinks).where(eq(shareLinks.analysisId, id));
  // Delete analysis
  await db.delete(analyses).where(and(eq(analyses.id, id), eq(analyses.userId, userId)));
}

export async function updateAnalysis(id: number, userId: number, data: Partial<Pick<Analysis, "title" | "description" | "semester" | "academicYear">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(analyses).set(data).where(and(eq(analyses.id, id), eq(analyses.userId, userId)));
}

// ─── Analysis Comments Helpers ──────────────────────────────────

export async function insertCommentsBatch(comments: InsertAnalysisComment[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert in batches of 500 to avoid query size limits
  const BATCH_SIZE = 500;
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    await db.insert(analysisComments).values(batch);
  }
}

export async function getCommentsByAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(analysisComments)
    .where(eq(analysisComments.analysisId, analysisId));
}

// ─── Share Link Helpers ─────────────────────────────────────────

export async function createShareLink(data: InsertShareLink): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(shareLinks).values(data);
  return data.shareToken;
}

export async function getShareLinkByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.shareToken, token), eq(shareLinks.isActive, 1)))
    .limit(1);

  if (result.length === 0) return undefined;

  const link = result[0];
  // Check expiration
  if (link.expiresAt && link.expiresAt < Date.now()) return undefined;

  // Increment access count
  await db
    .update(shareLinks)
    .set({ accessCount: sql`${shareLinks.accessCount} + 1` })
    .where(eq(shareLinks.id, link.id));

  return link;
}

export async function getShareLinksByAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.analysisId, analysisId))
    .orderBy(desc(shareLinks.createdAt));
}

export async function deactivateShareLink(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership through the analysis
  const link = await db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);
  if (link.length === 0) return;

  if (link[0].createdByUserId !== userId) throw new Error("Not authorized");

  await db.update(shareLinks).set({ isActive: 0 }).where(eq(shareLinks.id, id));
}

// ─── Comparison Helpers ─────────────────────────────────────────

export async function getAnalysesForComparison(ids: number[], userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(analyses)
    .where(and(inArray(analyses.id, ids), eq(analyses.userId, userId)));
}
