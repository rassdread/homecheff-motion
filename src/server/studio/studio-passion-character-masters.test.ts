import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { issuePassionMasterQuote } from "@/lib/studio-passion-stage-a";
import { prepareOpenAiImageGenerationsBody } from "@/lib/openai-image-generation";
import { executePassionMasterGeneration, claimPassionMasterReservation } from "@/server/studio/studio-passion-character-masters";
import type { PassionClaimDatabase, PassionMasterDeps } from "@/server/studio/studio-passion-character-masters";

const SECRET = "stage-a-test-secret";
const NOW = Date.parse("2026-10-17T12:00:00.000Z");

function quote() {
  return issuePassionMasterQuote({
    userId: "sergio",
    projectId: "project-passion",
    nowMs: NOW,
    secret: SECRET,
  });
}

function deps(overrides: Partial<PassionMasterDeps> = {}): PassionMasterDeps & {
  calls: string[];
} {
  const calls: string[] = [];
  const base: PassionMasterDeps = {
    claim: async () => {
      calls.push("claim");
      return { state: "owned", reservationId: "res-1" };
    },
    settle: async (input) => {
      calls.push(`settle:${input.outcome}`);
    },
    generate: async (input) => {
      calls.push(`generate:${input.ownerId}`);
      return {
        imageBuffer: Buffer.from("image"),
        thumbnailBuffer: Buffer.from("thumb"),
        contentType: "image/png",
        usage: { inputTokens: 100, outputTokens: 6250 },
      };
    },
    persist: async (input) => {
      calls.push(`persist:${input.userId}:${input.projectId}:${input.characterKey}`);
      assert.equal(input.userId, "sergio");
      return {
        characterId: "char-baker",
        referenceImageUrl: "https://example.test/baker.png",
        storageKey: "studio/sergio/baker.png",
      };
    },
    capture: async (input) => {
      calls.push(`capture:${input.credits}:${input.providerUsd}`);
    },
    refund: async () => {
      calls.push("refund");
    },
    findReuse: async () => null,
  };
  return { calls, ...base, ...overrides, calls };
}

describe("passion character master execution", () => {
  it("reserves, generates with the owner, persists, and captures", async () => {
    const used = deps();
    const result = await executePassionMasterGeneration({
      userId: "sergio",
      project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
      presentedQuote: quote(),
      characterKey: "baker",
      attempt: 1,
      confirmed: true,
      retryConfirmed: false,
      nowMs: NOW,
      secret: SECRET,
      attempts: [],
      deps: used,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.result.characterId, "char-baker");
      assert.equal(result.result.hcCharged, 125);
      assert.equal(result.result.reused, false);
    }
    assert.deepEqual(used.calls.slice(0, 3), [
      "claim",
      "generate:sergio",
      "persist:sergio:project-passion:baker",
    ]);
    assert.equal(used.calls[3]?.startsWith("capture:125:"), true);
    assert.equal(used.calls[4], "settle:captured");
  });

  it("refunds the reservation when generation fails and does not persist", async () => {
    const used = deps({
      generate: async () => {
        throw new Error("provider down");
      },
    });
    const result = await executePassionMasterGeneration({
      userId: "sergio",
      project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
      presentedQuote: quote(),
      characterKey: "potter",
      attempt: 1,
      confirmed: true,
      retryConfirmed: false,
      nowMs: NOW,
      secret: SECRET,
      attempts: [],
      deps: used,
    });
    assert.equal(result.ok, false);
    assert.deepEqual(used.calls, ["claim", "refund", "settle:released"]);
  });

  it("does not generate for a different owner", async () => {
    const used = deps();
    const result = await executePassionMasterGeneration({
      userId: "someone-else",
      project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
      presentedQuote: quote(),
      characterKey: "gardener",
      attempt: 1,
      confirmed: true,
      retryConfirmed: false,
      nowMs: NOW,
      secret: SECRET,
      attempts: [],
      deps: used,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "PROJECT_FORBIDDEN");
    assert.deepEqual(used.calls, []);
  });

  it("locks gpt-image-1 portrait high on the request body and leaves the default body unchanged", () => {
    const locked = prepareOpenAiImageGenerationsBody({
      model: "gpt-image-1",
      prompt: "Baker",
      size: "1024x1536",
      quality: "high",
    });
    assert.equal(locked.model, "gpt-image-1");
    assert.equal(locked.size, "1024x1536");
    assert.equal(locked.quality, "high");
    assert.equal("response_format" in locked, false);
    const ordinary = prepareOpenAiImageGenerationsBody({
      model: "gpt-image-1",
      prompt: "Baker",
      size: "1024x1024",
    });
    assert.equal("quality" in ordinary, false);
  });

  it("keeps the live route on the wallet reservation and the signed-in user", () => {
    const route = readFileSync(
      "src/app/api/studio/projects/[projectId]/character-masters/route.ts",
      "utf8"
    );
    const runtime = readFileSync(
      "src/server/studio/studio-passion-character-masters-runtime.ts",
      "utf8"
    );
    assert.match(route, /requireActiveUser/);
    assert.match(runtime, /studioGenerationJob.create/);
    assert.match(runtime, /getWalletForUpdate/);
    assert.match(runtime, /\$transaction/);
    assert.match(runtime, /P2002/);
    assert.match(runtime, /claimPassionMasterReservation/);
    assert.doesNotMatch(runtime, /authorizeStudioAction|admin-bypass|adminBypass/);
    assert.match(runtime, /lockedModel: GPT_IMAGE_1_MODEL/);
    assert.match(runtime, /lockedSize: GPT_IMAGE_1_PORTRAIT_SIZE/);
    assert.match(runtime, /lockedQuality: GPT_IMAGE_1_HIGH_QUALITY/);
    assert.doesNotMatch(runtime, /OPENAI_DALLE3_IMAGE_USD/);
  });

  it("gives one concurrent request the provider call and reuses a settled claim", async () => {
    const sim = createUniqueClaimDatabase();
    const presented = quote();
    let generates = 0;
    let captures = 0;
    let refunds = 0;
    const run = () =>
      executePassionMasterGeneration({
        userId: "sergio",
        project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
        presentedQuote: presented,
        characterKey: "baker",
        attempt: 1,
        confirmed: true,
        retryConfirmed: false,
        nowMs: NOW,
        secret: SECRET,
        attempts: [],
        deps: deps({
          claim: (input) => claimPassionMasterReservation(sim.database, input.idempotencyKey),
          generate: async () => {
            generates += 1;
            await new Promise((resolve) => setTimeout(resolve, 40));
            return {
              imageBuffer: Buffer.from("image"),
              thumbnailBuffer: Buffer.from("thumb"),
              contentType: "image/png",
              usage: { inputTokens: 20, outputTokens: 20 },
            };
          },
          capture: async () => {
            captures += 1;
          },
          refund: async () => {
            refunds += 1;
          },
          settle: async (input) => {
            sim.committed.set(input.idempotencyKey, input.outcome === "captured" ? "succeeded" : "failed");
          },
        }),
      });

    const raced = await Promise.all([run(), run()]);
    assert.equal(generates, 1);
    assert.equal(captures, 1);
    assert.equal(refunds, 0);
    const outcomes = raced.map((result) => (result.ok ? "ok" : result.code)).sort();
    assert.deepEqual(outcomes, ["IN_FLIGHT", "ok"]);

    const settled = await executePassionMasterGeneration({
      userId: "sergio",
      project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
      presentedQuote: presented,
      characterKey: "baker",
      attempt: 1,
      confirmed: true,
      retryConfirmed: false,
      nowMs: NOW,
      secret: SECRET,
      attempts: [],
      deps: deps({
        claim: (input) => claimPassionMasterReservation(sim.database, input.idempotencyKey),
        findReuse: async () => ({
          characterKey: "baker",
          characterId: "char-baker",
          referenceImageUrl: "https://example.test/baker.png",
          storageKey: "studio/sergio/baker.png",
          hcCharged: 125,
          providerUsd: 0.27,
          reused: true,
        }),
        generate: async () => {
          generates += 1;
          return {
            imageBuffer: Buffer.from("image"),
            thumbnailBuffer: Buffer.from("thumb"),
            contentType: "image/png",
            usage: null,
          };
        },
      }),
    });
    assert.equal(settled.ok, true);
    if (settled.ok) assert.equal(settled.result.reused, true);
    assert.equal(generates, 1);
  });

  it("refunds one failed attempt and allows a confirmed retry on a new key", async () => {
    const sim = createUniqueClaimDatabase();
    const presented = quote();
    let generates = 0;
    let refunds = 0;
    const failed = await Promise.all([
      executePassionMasterGeneration({
        userId: "sergio",
        project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
        presentedQuote: presented,
        characterKey: "potter",
        attempt: 1,
        confirmed: true,
        retryConfirmed: false,
        nowMs: NOW,
        secret: SECRET,
        attempts: [],
        deps: deps({
          claim: (input) => claimPassionMasterReservation(sim.database, input.idempotencyKey),
          generate: async () => {
            generates += 1;
            throw new Error("provider down");
          },
          refund: async () => {
            refunds += 1;
          },
          settle: async (input) => {
            sim.committed.set(input.idempotencyKey, "failed");
          },
        }),
      }),
      executePassionMasterGeneration({
        userId: "sergio",
        project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
        presentedQuote: presented,
        characterKey: "potter",
        attempt: 1,
        confirmed: true,
        retryConfirmed: false,
        nowMs: NOW,
        secret: SECRET,
        attempts: [],
        deps: deps({
          claim: (input) => claimPassionMasterReservation(sim.database, input.idempotencyKey),
          generate: async () => {
            generates += 1;
            throw new Error("provider down");
          },
          refund: async () => {
            refunds += 1;
          },
          settle: async (input) => {
            sim.committed.set(input.idempotencyKey, "failed");
          },
        }),
      }),
    ]);
    assert.equal(generates, 1);
    assert.equal(refunds, 1);
    assert.equal(failed.filter((result) => result.ok).length, 0);

    const blocked = await executePassionMasterGeneration({
      userId: "sergio",
      project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
      presentedQuote: presented,
      characterKey: "potter",
      attempt: 1,
      confirmed: true,
      retryConfirmed: false,
      nowMs: NOW,
      secret: SECRET,
      attempts: [{ characterKey: "potter", attempt: 1, status: "released", providerUsd: 0 }],
      deps: deps({
        generate: async () => {
          generates += 1;
          throw new Error("should not run");
        },
      }),
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.code, "ATTEMPT_USED");
    assert.equal(generates, 1);

    const retry = await executePassionMasterGeneration({
      userId: "sergio",
      project: { id: "project-passion", ownerId: "sergio", title: "MADE WITH PASSION" },
      presentedQuote: presented,
      characterKey: "potter",
      attempt: 2,
      confirmed: true,
      retryConfirmed: true,
      nowMs: NOW,
      secret: SECRET,
      attempts: [{ characterKey: "potter", attempt: 1, status: "released", providerUsd: 0 }],
      deps: deps({
        claim: (input) => claimPassionMasterReservation(sim.database, input.idempotencyKey),
        generate: async () => {
          generates += 1;
          return {
            imageBuffer: Buffer.from("image"),
            thumbnailBuffer: Buffer.from("thumb"),
            contentType: "image/png",
            usage: null,
          };
        },
        persist: async () => ({
          characterId: "char-potter",
          referenceImageUrl: "https://example.test/potter.png",
          storageKey: "studio/sergio/potter.png",
        }),
      }),
    });
    assert.equal(retry.ok, true);
    assert.equal(generates, 2);
    assert.equal(refunds, 1);
  });

  it("rolls back a claim when the wallet cannot reserve, then allows one later owner", async () => {
    let creditsLeft = 0;
    const sim = createUniqueClaimDatabase({
      reserve: async () => {
        if (creditsLeft < 125) throw new Error("INSUFFICIENT_CREDITS");
        creditsLeft -= 125;
        return { reservationId: "res-later" };
      },
    });
    const blocked = await Promise.all([
      claimPassionMasterReservation(sim.database, "quote:baker:1"),
      claimPassionMasterReservation(sim.database, "quote:baker:1"),
    ]);
    assert.deepEqual(
      blocked.map((result) => result.state).sort(),
      ["insufficient_credits", "insufficient_credits"]
    );
    assert.equal(sim.committed.size, 0);
    creditsLeft = 125;
    const owned = await Promise.all([
      claimPassionMasterReservation(sim.database, "quote:baker:1"),
      claimPassionMasterReservation(sim.database, "quote:baker:1"),
    ]);
    assert.deepEqual(owned.map((result) => result.state).sort(), ["in_flight", "owned"]);
    assert.equal(sim.committed.size, 1);
  });
});

function createUniqueClaimDatabase(options?: {
  reserve?: () => Promise<{ reservationId: string }>;
}): { database: PassionClaimDatabase; committed: Map<string, "generating" | "succeeded" | "failed"> } {
  const committed = new Map<string, "generating" | "succeeded" | "failed">();
  let queue = Promise.resolve();
  const database: PassionClaimDatabase = {
    async transaction(fn) {
      const previous = queue;
      let release: () => void = () => undefined;
      queue = new Promise((resolve) => {
        release = resolve;
      });
      await previous;
      const staged: string[] = [];
      try {
        const result = await fn({
          insertGeneratingClaim: async (idempotencyKey) => {
            if (committed.has(idempotencyKey) || staged.includes(idempotencyKey)) {
              const error = new Error("unique constraint");
              (error as Error & { code: string }).code = "P2002";
              throw error;
            }
            staged.push(idempotencyKey);
          },
          reserveStudioWallet: async () =>
            options?.reserve ? options.reserve() : { reservationId: `res-${staged[0] ?? "none"}` },
        });
        for (const key of staged) committed.set(key, "generating");
        return result;
      } finally {
        release();
      }
    },
    async readClaim(idempotencyKey) {
      return committed.get(idempotencyKey) ?? null;
    },
  };
  return { database, committed };
}
