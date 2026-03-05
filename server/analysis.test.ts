import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("analysis router", () => {
  it("analysis.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.list()).rejects.toThrow();
  });

  it("analysis.save requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.analysis.save({
        title: "Test",
        fileName: "test.csv",
        totalResponses: 100,
        cleanedComments: 80,
        topicCount: 5,
        resultsJson: {},
        comments: [],
      })
    ).rejects.toThrow();
  });

  it("analysis.get requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.get({ id: 1 })).rejects.toThrow();
  });

  it("analysis.delete requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.delete({ id: 1 })).rejects.toThrow();
  });

  it("analysis.compare requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.compare({ ids: [1, 2] })).rejects.toThrow();
  });

  it("analysis.compare validates minimum 2 ids", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.compare({ ids: [1] })).rejects.toThrow();
  });

  it("analysis.compare validates maximum 4 ids", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.compare({ ids: [1, 2, 3, 4, 5] })).rejects.toThrow();
  });

  it("analysis.save validates title is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.analysis.save({
        title: "",
        fileName: "test.csv",
        totalResponses: 100,
        cleanedComments: 80,
        topicCount: 5,
        resultsJson: {},
        comments: [],
      })
    ).rejects.toThrow();
  });
});

describe("share router", () => {
  it("share.create requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.share.create({ analysisId: 1 })
    ).rejects.toThrow();
  });

  it("share.listByAnalysis requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.share.listByAnalysis({ analysisId: 1 })
    ).rejects.toThrow();
  });

  it("share.deactivate requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.share.deactivate({ id: 1 })
    ).rejects.toThrow();
  });

  it("share.access is public (does not require auth)", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw auth error — will return null for invalid token
    const result = await caller.share.access({ token: "nonexistent-token" });
    // Result should be null or undefined since the token doesn't exist
    expect(result).toBeFalsy();
  });
});
