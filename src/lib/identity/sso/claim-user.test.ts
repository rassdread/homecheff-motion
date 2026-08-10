import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claimExistingStudioUser } from "@/lib/identity/sso/claim-user";
import { StudioSsoError } from "@/lib/identity/sso/errors";
import type { ClaimDeps } from "@/lib/identity/sso/claim-user";

type FakeUser = {
  id: string;
  email: string;
  isActive: boolean;
  centralUserId: string | null;
  centralLinkedAt: Date | null;
  passwordHash: string | null;
};

function makeFakeDb(seed: FakeUser[]) {
  const users = seed.map((u) => ({ ...u }));
  const api = {
    user: {
      async findUnique(args: { where: { id: string }; select?: Record<string, boolean> }) {
        const u = users.find((x) => x.id === args.where.id);
        return u ? { ...u } : null;
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error("missing");
        return { ...u };
      },
      async findFirst(args: { where: { centralUserId: string; NOT?: { id: string } } }) {
        return (
          users.find(
            (u) =>
              u.centralUserId === args.where.centralUserId &&
              (!args.where.NOT || u.id !== args.where.NOT.id),
          ) ?? null
        );
      },
      async updateMany(args: {
        where: { id: string; centralUserId: null };
        data: { centralUserId: string; centralLinkedAt: Date };
      }) {
        const u = users.find(
          (x) => x.id === args.where.id && x.centralUserId === args.where.centralUserId,
        );
        if (!u) return { count: 0 };
        u.centralUserId = args.data.centralUserId;
        u.centralLinkedAt = args.data.centralLinkedAt;
        // passwordHash + email must remain untouched by claim
        return { count: 1 };
      },
    },
    async $transaction<T>(fn: (tx: typeof api) => Promise<T>): Promise<T> {
      return fn(api);
    },
  };
  return { api, users };
}

const HC_A = "11111111-1111-4111-8111-111111111111";
const HC_B = "22222222-2222-4222-8222-222222222222";

describe("SP.2B controlled legacy claim", () => {
  it("links unlinked Studio user and preserves email + passwordHash", async () => {
    const { api, users } = makeFakeDb([
      {
        id: "studio-owner",
        email: "owner@homecheff.eu",
        isActive: true,
        centralUserId: null,
        centralLinkedAt: null,
        passwordHash: "scrypt-keep",
      },
    ]);
    const deps: ClaimDeps = { db: api as unknown as ClaimDeps["db"] };
    const result = await claimExistingStudioUser(
      { studioUserId: "studio-owner", centralUserId: HC_A },
      deps,
    );
    assert.equal(result.id, "studio-owner");
    assert.equal(result.alreadyLinked, false);
    assert.equal(users[0]!.centralUserId, HC_A);
    assert.ok(users[0]!.centralLinkedAt);
    assert.equal(users[0]!.email, "owner@homecheff.eu");
    assert.equal(users[0]!.passwordHash, "scrypt-keep");
    assert.equal(users.length, 1);
  });

  it("is idempotent when already linked to same centralUserId", async () => {
    const { api, users } = makeFakeDb([
      {
        id: "studio-owner",
        email: "owner@homecheff.eu",
        isActive: true,
        centralUserId: HC_A,
        centralLinkedAt: new Date(),
        passwordHash: "scrypt-keep",
      },
    ]);
    const deps: ClaimDeps = { db: api as unknown as ClaimDeps["db"] };
    const result = await claimExistingStudioUser(
      { studioUserId: "studio-owner", centralUserId: HC_A },
      deps,
    );
    assert.equal(result.alreadyLinked, true);
    assert.equal(users.length, 1);
  });

  it("DENY when target already linked to different centralUserId", async () => {
    const { api } = makeFakeDb([
      {
        id: "studio-owner",
        email: "owner@homecheff.eu",
        isActive: true,
        centralUserId: HC_B,
        centralLinkedAt: new Date(),
        passwordHash: null,
      },
    ]);
    const deps: ClaimDeps = { db: api as unknown as ClaimDeps["db"] };
    await assert.rejects(
      () =>
        claimExistingStudioUser(
          { studioUserId: "studio-owner", centralUserId: HC_A },
          deps,
        ),
      (err: unknown) => err instanceof StudioSsoError && err.code === "CLAIM_ALREADY_LINKED",
    );
  });

  it("DENY when centralUserId already belongs to another Studio user", async () => {
    const { api } = makeFakeDb([
      {
        id: "studio-owner",
        email: "owner@homecheff.eu",
        isActive: true,
        centralUserId: null,
        centralLinkedAt: null,
        passwordHash: "x",
      },
      {
        id: "other",
        email: "other@example.com",
        isActive: true,
        centralUserId: HC_A,
        centralLinkedAt: new Date(),
        passwordHash: null,
      },
    ]);
    const deps: ClaimDeps = { db: api as unknown as ClaimDeps["db"] };
    await assert.rejects(
      () =>
        claimExistingStudioUser(
          { studioUserId: "studio-owner", centralUserId: HC_A },
          deps,
        ),
      (err: unknown) =>
        err instanceof StudioSsoError && err.code === "IDENTITY_MAPPING_CONFLICT",
    );
  });

  it("DENY empty / missing target", async () => {
    const { api } = makeFakeDb([]);
    const deps: ClaimDeps = { db: api as unknown as ClaimDeps["db"] };
    await assert.rejects(
      () => claimExistingStudioUser({ studioUserId: "missing", centralUserId: HC_A }, deps),
      (err: unknown) => err instanceof StudioSsoError && err.code === "CLAIM_UNAUTHORIZED",
    );
  });
});
