/**
 * Disposable local billing certification for synthetic scene images.
 * Refuses every URL that is not homecheff_film_cert_2u on localhost.
 * This file is not part of the default npm test script.
 */
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { hashPassword } from "@/server/auth/session";

const CERT_DB = "homecheff_film_cert_2u";

function isolatedDatabaseUrl(): string | null {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Certification database host is not local.");
  }
  if (name !== CERT_DB) throw new Error("Certification database name is not the disposable local database.");
  if (/neon|vercel|preview|prod|ep-wild-morning|ep-purple-moon|ep-withered-moon/i.test(url)) {
    throw new Error("Certification database URL looks protected.");
  }
  return url;
}

test("mock certification does not capture credits and paid billing still does", async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("FILM_CERT_DATABASE_URL is not configured");
    return;
  }
  process.env.DATABASE_URL = url;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_URL;
  delete process.env.STUDIO_CENTRAL_HC_SPEND_ENABLED;
  process.env.STUDIO_FILM_CERT_LOCAL_AUTH = "true";
  process.env.STUDIO_SCENE_IMAGE_PROVIDER = "mock";
  process.env.STUDIO_VISION_PROVIDER = "mock";
  process.env.STUDIO_SCENE_IMAGE_LOCAL_DIR = await mkdtemp(join(tmpdir(), "mock-billing-images-"));

  const { prisma } = await import("@/lib/prisma");
  const { billProviderAction } = await import("@/server/studio-account/bill-provider-action");
  const { previewStudioCreditAuthorization } = await import("@/server/studio-account/studio-credit-authorization");
  const { captureStudioCredits } = await import("@/server/studio-account/studio-wallet-service");
  const { isAuthorizedLocalMockSceneImageExecution } = await import("@/server/studio/authorized-local-mock-execution");
  const { createOwnedFilmProject, createFilmScene } = await import("@/server/studio/studio-film-preparation");
  const { generateStudioSceneImage } = await import("@/server/studio/studio-scene-image-service");
  const { createGenerationJob, runSynchronousGenerationJob } = await import(
    "@/server/studio-generation/generation-orchestrator"
  );

  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({ env: process.env, hostHeader: "127.0.0.1:3456" }),
    true,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({ env: process.env, hostHeader: "studio.homecheff.eu" }),
    false,
  );

  const stamp = Date.now();
  async function makeUser(label: string, balance: number, accountType: string) {
    const user = await prisma.user.create({
      data: {
        email: `mock-billing-${label}-${stamp}@example.test`,
        passwordHash: hashPassword("film-cert-local-only"),
        role: "user",
      },
    });
    await prisma.studioAccount.create({
      data: { userId: user.id, accountType, accountStatus: "active" },
    });
    await prisma.studioWallet.create({
      data: {
        userId: user.id,
        balance,
        promotionalBalance: balance,
        lifetimeGranted: balance,
      },
    });
    return user;
  }

  const owner = await makeUser("owner", 500, "creator");
  const other = await makeUser("other", 100, "creator");
  const paid = await makeUser("paid", 80, "creator");
  const failed = await makeUser("failed", 80, "creator");
  const zero = await makeUser("zero", 0, "free");

  const film = await createOwnedFilmProject({
    ownerId: zero.id,
    title: "Zero credit film",
    idempotencyKey: `mock-billing-zero-${stamp}`,
  });
  assert.equal("error" in film, false);
  const zeroWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: zero.id } });
  assert.equal(zeroWallet.balance, 0);

  const quote = await previewStudioCreditAuthorization({
    user: { id: zero.id, email: zero.email, role: "user" },
    actionType: "voice_generation",
  });
  assert.equal(quote.allowed, false);
  assert.equal(quote.reason, "free_account_provider_action");
  assert.equal(quote.requiredCredits, 15);

  let voiceExecuted = 0;
  const voice = await billProviderAction({
    user: { id: zero.id, email: zero.email, role: "user" },
    actionType: "voice_generation",
    confirmed: true,
    execute: async () => {
      voiceExecuted += 1;
      return { ok: true };
    },
  });
  assert.equal("blocked" in voice, true);
  assert.equal(voiceExecuted, 0);
  const zeroAfter = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: zero.id } });
  assert.equal(zeroAfter.balance, 0);
  assert.equal(zeroAfter.reservedBalance, 0);
  assert.equal(await prisma.studioLedgerEntry.count({ where: { userId: zero.id } }), 0);

  let bypassExecuted = 0;
  const bypass = await billProviderAction({
    user: { id: zero.id, email: zero.email, role: "user" },
    actionType: "scene_generation",
    confirmed: true,
    execute: async () => {
      bypassExecuted += 1;
      return { ok: true };
    },
  });
  assert.equal("blocked" in bypass, true);
  assert.equal(bypassExecuted, 0);
  assert.equal((await prisma.studioWallet.findUniqueOrThrow({ where: { userId: zero.id } })).balance, 0);

  const owned = await createOwnedFilmProject({
    ownerId: owner.id,
    title: "Owned film",
    idempotencyKey: `mock-billing-owner-${stamp}`,
  });
  assert.equal("error" in owned, false);
  if ("error" in owned) return;
  const scene = await createFilmScene(owner.id, owned.projectId, { id: owner.id, role: "user" }, "Scene");
  assert.equal("error" in scene, false);
  if ("error" in scene) return;

  const forbidden = await generateStudioSceneImage(owned.storyboardId!, scene.scene.id, { id: other.id, role: "user" });
  assert.equal("error" in forbidden, true);
  if ("error" in forbidden) assert.equal(forbidden.error.code, "FORBIDDEN");
  assert.equal((await prisma.studioWallet.findUniqueOrThrow({ where: { userId: other.id } })).balance, 100);
  assert.equal((await prisma.studioWallet.findUniqueOrThrow({ where: { userId: owner.id } })).balance, 500);
  assert.equal(await prisma.studioLedgerEntry.count({ where: { userId: other.id } }), 0);

  const image = await generateStudioSceneImage(owned.storyboardId!, scene.scene.id, { id: owner.id, role: "user" });
  assert.equal("error" in image, false);
  if ("error" in image) return;
  assert.equal(image.image.provider, "mock");
  assert.equal(image.image.status, "completed");
  assert.match(image.image.imageUrl, /^file:\/\//);
  const ownerWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: owner.id } });
  assert.equal(ownerWallet.balance, 500);
  assert.equal(ownerWallet.reservedBalance, 0);
  assert.equal(ownerWallet.lifetimeSpent, 0);
  assert.equal(await prisma.studioLedgerEntry.count({ where: { userId: owner.id } }), 0);

  let paidCalls = 0;
  const captured = await billProviderAction({
    user: { id: paid.id, email: paid.email, role: "user" },
    actionType: "scene_generation",
    projectId: owned.storyboardId!,
    confirmed: true,
    execute: async () => {
      paidCalls += 1;
      return { provider: "simulated-paid" };
    },
  });
  assert.equal("blocked" in captured, false);
  if ("blocked" in captured) return;
  assert.equal(paidCalls, 1);
  assert.equal(captured.billing.captured, true);
  assert.equal(captured.billing.estimatedCredits, 30);
  const paidWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: paid.id } });
  assert.equal(paidWallet.balance, 50);
  assert.equal(paidWallet.reservedBalance, 0);
  assert.equal(paidWallet.lifetimeSpent, 30);
  const paidCapture = await prisma.studioLedgerEntry.findFirstOrThrow({
    where: { userId: paid.id, actionType: "usage_capture" },
  });
  assert.equal(paidCapture.provider, "openai");
  assert.equal(paidCapture.creditsDelta, -30);
  const reservationId = (paidCapture.metadataJson as { reservationId?: string }).reservationId ?? "";
  assert.match(reservationId, /^c/);
  await captureStudioCredits({
    userId: paid.id,
    credits: 30,
    reservationId,
    service: "studio",
    provider: "openai",
  });
  const paidAgain = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: paid.id } });
  assert.equal(paidAgain.balance, 50);
  assert.equal(await prisma.studioLedgerEntry.count({ where: { userId: paid.id, actionType: "usage_capture" } }), 1);

  const idempotencyKey = `mock-billing-retry-${stamp}`;
  const firstJob = await createGenerationJob({
    ownerId: paid.id,
    idempotencyKey,
    capability: "IMAGE_GENERATE",
    storyboardId: owned.storyboardId!,
    sceneId: scene.scene.id,
    inputSnapshot: { action: "scene_image_generate" },
  });
  assert.equal(firstJob.kind, "created");
  let retries = 0;
  const firstRun = await runSynchronousGenerationJob({
    job: firstJob.job,
    executeBilled: async () => {
      retries += 1;
      return { ok: true as const, result: { ok: true }, creditsCharged: 0, outputAssetId: image.image.id };
    },
  });
  assert.equal(firstRun.ok, true);
  const replayJob = await createGenerationJob({
    ownerId: paid.id,
    idempotencyKey,
    capability: "IMAGE_GENERATE",
    storyboardId: owned.storyboardId!,
    sceneId: scene.scene.id,
    inputSnapshot: { action: "scene_image_generate" },
  });
  assert.equal(replayJob.kind, "replay");
  const replayRun = await runSynchronousGenerationJob({
    job: replayJob.job,
    executeBilled: async () => {
      retries += 1;
      return { ok: true as const, result: { ok: true }, creditsCharged: 30, outputAssetId: image.image.id };
    },
  });
  assert.equal(replayRun.ok, true);
  if (replayRun.ok) assert.equal(replayRun.replay, true);
  assert.equal(retries, 1);
  assert.equal((await prisma.studioWallet.findUniqueOrThrow({ where: { userId: paid.id } })).balance, 50);

  let failedCalls = 0;
  const released = await billProviderAction({
    user: { id: failed.id, email: failed.email, role: "user" },
    actionType: "scene_generation",
    confirmed: true,
    execute: async () => {
      failedCalls += 1;
      return { failed: true };
    },
    isFailure: () => true,
  });
  assert.equal("blocked" in released, false);
  assert.equal(failedCalls, 1);
  if (!("blocked" in released)) assert.equal(released.billing.captured, false);
  const failedWallet = await prisma.studioWallet.findUniqueOrThrow({ where: { userId: failed.id } });
  assert.equal(failedWallet.balance, 80);
  assert.equal(failedWallet.reservedBalance, 0);
  assert.equal(failedWallet.lifetimeSpent, 0);
  assert.equal(await prisma.studioLedgerEntry.count({ where: { userId: failed.id, actionType: "usage_capture" } }), 0);
  assert.equal(
    await prisma.studioLedgerEntry.count({ where: { userId: failed.id, actionType: "failed_generation_refund" } }),
    1,
  );

  await prisma.$disconnect();
});
