import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createAnalysis,
  getAnalysesByUser,
  getAnalysisById,
  deleteAnalysis,
  updateAnalysis,
  insertCommentsBatch,
  getCommentsByAnalysis,
  createShareLink,
  getShareLinkByToken,
  getShareLinksByAnalysis,
  deactivateShareLink,
  getAnalysesForComparison,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Analysis CRUD ──────────────────────────────────────────

  analysis: router({
    /** Save a new analysis with all results and comments */
    save: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          fileName: z.string().max(255),
          semester: z.string().max(64).optional(),
          academicYear: z.string().max(20).optional(),
          totalResponses: z.number().int(),
          cleanedComments: z.number().int(),
          topicCount: z.number().int(),
          noiseRatio: z.string().optional(),
          processingTime: z.string().optional(),
          resultsJson: z.any(),
          institutions: z.array(z.string()).optional(),
          programLevels: z.array(z.string()).optional(),
          schools: z.array(z.string()).optional(),
          comments: z.array(
            z.object({
              responseId: z.string().optional(),
              commentText: z.string(),
              topic: z.string().optional(),
              sentimentLabel: z.string().optional(),
              sentimentScore: z.string().optional(),
              institution: z.string().optional(),
              programLevel: z.string().optional(),
              school: z.string().optional(),
              surveyDate: z.string().optional(),
              isRepresentative: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { comments, ...analysisData } = input;

        const analysisId = await createAnalysis({
          ...analysisData,
          userId: ctx.user.id,
        });

        if (comments.length > 0) {
          await insertCommentsBatch(
            comments.map((c) => ({
              ...c,
              analysisId,
            }))
          );
        }

        return { id: analysisId };
      }),

    /** List all analyses for the current user (without full resultsJson) */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAnalysesByUser(ctx.user.id);
    }),

    /** Get a single analysis by ID (with full results) */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.id);
        if (!analysis) return null;
        if (analysis.userId !== ctx.user.id) return null;

        const comments = await getCommentsByAnalysis(input.id);
        return { ...analysis, comments };
      }),

    /** Update analysis metadata */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          semester: z.string().max(64).optional(),
          academicYear: z.string().max(20).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateAnalysis(id, ctx.user.id, data);
        return { success: true };
      }),

    /** Delete an analysis and all related data */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAnalysis(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Compare multiple analyses side-by-side */
    compare: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(2).max(4) }))
      .query(async ({ ctx, input }) => {
        const results = await getAnalysesForComparison(input.ids, ctx.user.id);
        return results;
      }),
  }),

  // ─── Share Links ────────────────────────────────────────────

  share: router({
    /** Create a share link for an analysis */
    create: protectedProcedure
      .input(
        z.object({
          analysisId: z.number(),
          label: z.string().max(255).optional(),
          expiresInDays: z.number().min(1).max(365).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.userId !== ctx.user.id) {
          throw new Error("Analysis not found or not authorized");
        }

        const shareToken = nanoid(16);
        const expiresAt = input.expiresInDays
          ? Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000
          : undefined;

        await createShareLink({
          analysisId: input.analysisId,
          createdByUserId: ctx.user.id,
          shareToken,
          label: input.label,
          expiresAt,
        });

        return { shareToken };
      }),

    /** List all share links for an analysis */
    listByAnalysis: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis || analysis.userId !== ctx.user.id) return [];

        return getShareLinksByAnalysis(input.analysisId);
      }),

    /** Deactivate a share link */
    deactivate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deactivateShareLink(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Access a shared analysis via token (public — no auth required) */
    access: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const link = await getShareLinkByToken(input.token);
        if (!link) return null;

        const analysis = await getAnalysisById(link.analysisId);
        if (!analysis) return null;

        const comments = await getCommentsByAnalysis(link.analysisId);
        return {
          analysis: { ...analysis, userId: undefined },
          comments,
          sharedBy: link.label || "Shared Analysis",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
