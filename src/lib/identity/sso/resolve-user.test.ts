import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StudioSsoError } from "@/lib/identity/sso/errors";
import {
  normalizeIdentityEmail,
  resolveStudioUserFromCentralClaims,
  type ResolveUserDeps,
} from "@/lib/identity/sso/resolve-user";

type FakeUser = {
  id: string;
  email: string;
  isActive: boolean;
  centralUserId: string | null;
  centralLinkedAt: Date | null;
  passwordHash: string | null;
  role: string;
};

function makeFakeDb(seed: FakeUser[] = []) {
  const users = seed.map((u) => ({ ...u }));

  const api = {
    user: {
      async findMany(args: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
        take?: number;
      }) {
        let rows = users;
        if ("centralUserId" in args.where) {
          rows = users.filter((u) => u.centralUserId === args.where.centralUserId);
        } else if (
          args.where.email &&
          typeof args.where.email === "object" &&
          args.where.email !== null &&
          "equals" in (args.where.email as object)
        ) {
          const eq = String((args.where.email as { equals: string }).equals).toLowerCase();
          rows = users.filter((u) => u.email.toLowerCase() === eq);
        }
        return rows.slice(0, args.take ?? rows.length).map((u) => ({ ...u }));
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
      async findUnique(args: { where: { id: string } }) {
        return users.find((u) => u.id === args.where.id) ?? null;
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error("not found");
        return { ...u };
      },
      async update(args: { where: { id: string }; data: Partial<FakeUser> }) {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error("not found");
        Object.assign(u, args.data);
        return { ...u };
      },
      async updateMany(args: {
        where: { id: string; centralUserId: null };
        data: Partial<FakeUser>;
      }) {
        const u = users.find(
          (x) => x.id === args.where.id && x.centralUserId === args.where.centralUserId,
        );
        if (!u) return { count: 0 };
        Object.assign(u, args.data);
        return { count: 1 };
      },
      async create(args: { data: Partial<FakeUser> & { email: string; centralUserId: string } }) {
        const u: FakeUser = {
          id: `created-${users.length + 1}`,
          email: args.data.email,
          isActive: true,
          centralUserId: args.data.centralUserId,
          centralLinkedAt: new Date(),
          passwordHash: null,
          role: "user",
        };
        users.push(u);
        return { ...u };
      },
    },
    async $transaction<T>(fn: (tx: typeof api) => Promise<T>): Promise<T> {
      return fn(api);
    },
  };

  return { api, users };
}

function depsFor(
  seed: FakeUser[],
  jit: boolean,
): { deps: ResolveUserDeps; users: FakeUser[] } {
  const { api, users } = makeFakeDb(seed);
  return {
    users,
    deps: {
      db: api as unknown as ResolveUserDeps["db"],
      jitEnabled: () => jit,
      ensureAccount: async () => undefined,
    },
  };
}

const HC_A = "11111111-1111-4111-8111-111111111111";
const HC_B = "22222222-2222-4222-8222-222222222222";

describe("SP.2B resolve-user existing link vs JIT", () => {
  it("normalizes identity email", () => {
    assert.equal(normalizeIdentityEmail("  Foo@Example.COM "), "foo@example.com");
  });

  it("links existing unlinked Studio user when JIT is false", async () => {
    const { deps, users } = depsFor(
      [
        {
          id: "studio-1",
          email: "owner@example.com",
          isActive: true,
          centralUserId: null,
          centralLinkedAt: null,
          passwordHash: "scrypt-legacy",
          role: "user",
        },
      ],
      false,
    );

    const resolved = await resolveStudioUserFromCentralClaims(
      { centralUserId: HC_A, email: "Owner@Example.com" },
      deps,
    );

    assert.equal(resolved.id, "studio-1");
    assert.equal(resolved.firstProductVisit, true);
    assert.equal(users[0]!.centralUserId, HC_A);
    assert.ok(users[0]!.centralLinkedAt);
    assert.equal(users[0]!.passwordHash, null);
    assert.equal(users.length, 1);
  });

  it("DENY IDENTITY_NOT_LINKED when no Studio candidate and JIT false", async () => {
    const { deps, users } = depsFor([], false);
    await assert.rejects(
      () =>
        resolveStudioUserFromCentralClaims(
          { centralUserId: HC_A, email: "nobody@example.com" },
          deps,
        ),
      (err: unknown) => err instanceof StudioSsoError && err.code === "IDENTITY_NOT_LINKED",
    );
    assert.equal(users.length, 0);
  });

  it("creates when JIT true and no candidate", async () => {
    const { deps, users } = depsFor([], true);
    const resolved = await resolveStudioUserFromCentralClaims(
      { centralUserId: HC_A, email: "new@example.com" },
      deps,
    );
    assert.equal(resolved.firstProductVisit, true);
    assert.equal(users.length, 1);
    assert.equal(users[0]!.centralUserId, HC_A);
  });

  it("DENY when email already linked to different centralUserId", async () => {
    const { deps } = depsFor(
      [
        {
          id: "studio-1",
          email: "owner@example.com",
          isActive: true,
          centralUserId: HC_B,
          centralLinkedAt: new Date(),
          passwordHash: null,
          role: "user",
        },
      ],
      false,
    );
    await assert.rejects(
      () =>
        resolveStudioUserFromCentralClaims(
          { centralUserId: HC_A, email: "owner@example.com" },
          deps,
        ),
      (err: unknown) => err instanceof StudioSsoError && err.code === "IDENTITY_EMAIL_COLLISION",
    );
  });

  it("returns same user when already linked by centralUserId", async () => {
    const { deps, users } = depsFor(
      [
        {
          id: "studio-1",
          email: "owner@example.com",
          isActive: true,
          centralUserId: HC_A,
          centralLinkedAt: new Date(),
          passwordHash: null,
          role: "user",
        },
      ],
      false,
    );
    const resolved = await resolveStudioUserFromCentralClaims(
      { centralUserId: HC_A, email: "owner@example.com" },
      deps,
    );
    assert.equal(resolved.id, "studio-1");
    assert.equal(resolved.firstProductVisit, false);
    assert.equal(users.length, 1);
  });
});
