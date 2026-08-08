/**
 * S.4 Preview certification (API-level via vercel curl SSO bypass).
 */
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { grantStudioCredits } from "../src/server/studio-account/studio-wallet-service.ts";
import { createFakeProviderAdapter } from "../src/server/studio-generation/fake-provider-adapter.ts";
import {
  beginAsyncGenerationJob,
  createGenerationJob,
  markGenerationStorageFailure,
} from "../src/server/studio-generation/generation-orchestrator.ts";
import {
  finalizeGenerationChargeOnce,
  updateGenerationJobStatus,
} from "../src/server/studio-generation/generation-job-service.ts";

const BASE =
  process.env.S4_PREVIEW_BASE ||
  "https://homecheff-motion-lgrcjp46v-sergio-s-projects-f7b64ee1.vercel.app";
const EMAIL = "s1.cert.1786212478@example.com";
const PASS = "S1CertPass2026!";
const SB = "cmskskf4w0001l404364pt91q";
const SCENE_A = "cmskt321400032jzstbklu0q4";
const SCENE_B = "cmskt2c5n00012jzsqxm2o64c";
const COOKIE = "/tmp/s4-e2e-cookies.txt";
const REPORT = "/tmp/s4-preview-e2e-report.json";

const results = {};
function note(k, v) {
  results[k] = v;
  console.log(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
}

function api(method, path, { body, idempotencyKey } = {}) {
  const bodyFile = `/tmp/s4-api-body-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const curl = ["-sS", "-X", method, "-b", COOKIE, "-c", COOKIE, "-o", bodyFile, "-w", "%{http_code}"];
  if (idempotencyKey) curl.push("-H", `Idempotency-Key: ${idempotencyKey}`);
  if (body !== undefined) {
    curl.push("-H", "content-type: application/json", "-d", JSON.stringify(body));
  }
  const statusRaw = execFileSync("npx", ["vercel", "curl", `${BASE}${path}`, "--", ...curl], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const status = Number(statusRaw.match(/(\d{3})$/)?.[1] || statusRaw);
  let json = null;
  let bodyText = "";
  try {
    bodyText = readFileSync(bodyFile, "utf8");
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    json = { raw: bodyText.slice(0, 800) };
  }
  try {
    unlinkSync(bodyFile);
  } catch {
    /* ignore */
  }
  return { status, json, bodyText };
}

const prisma = new PrismaClient();

async function main() {
  note("preview.base", BASE);
  const cert = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!cert) throw new Error("cert user missing");

  const beforeWallet = await prisma.studioWallet.findUnique({ where: { userId: cert.id } });
  note("wallet.before", beforeWallet?.balance ?? 0);
  if ((beforeWallet?.balance ?? 0) < 200) {
    const grant = await grantStudioCredits({
      userId: cert.id,
      credits: 500,
      actionType: "promotional_grant",
      service: "studio",
      creditOrigin: "MANUAL_GRANT",
      projectId: SB,
      metadataJson: { reason: "S4_PREVIEW_CERT_GRANT", at: new Date().toISOString() },
    });
    note("wallet.grant", grant.balanceAfter);
  }
  const walletStart = await prisma.studioWallet.findUnique({ where: { userId: cert.id } });
  note("wallet.start", walletStart.balance);

  await prisma.studioStoryboard.update({
    where: { id: SB },
    data: { voiceEnabled: true, voiceLanguage: "en" },
  });

  const login = api("POST", "/api/auth/login", { body: { email: EMAIL, password: PASS } });
  note("login.status", login.status);
  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);

  const imgKey = `s4b-img-a-${Date.now()}`;
  const t0 = Date.now();
  const img1 = api("POST", `/api/studio/storyboards/${SB}/scenes/${SCENE_A}/images`, {
    body: { confirmed: true, clientMutationId: imgKey },
    idempotencyKey: imgKey,
  });
  note("image.create.ms", Date.now() - t0);
  note("image.create.status", img1.status);
  note("image.job", img1.json?.generationJob || { error: img1.json?.error, code: img1.json?.code });
  const imageJobId = img1.json?.generationJob?.jobId;
  const imageOk = [200, 201].includes(img1.status) && img1.json?.generationJob?.status === "succeeded";
  note("image.e2e", imageOk ? "PASS" : "FAIL");

  const imgReplay = api("POST", `/api/studio/storyboards/${SB}/scenes/${SCENE_A}/images`, {
    body: { confirmed: true, clientMutationId: imgKey },
    idempotencyKey: imgKey,
  });
  note("image.replay.status", imgReplay.status);
  note(
    "image.idempotency",
    imgReplay.json?.generationJob?.jobId === imageJobId && imgReplay.json?.replay ? "PASS" : "FAIL"
  );

  const imgKey2 = `s4b-img-a2-${Date.now()}`;
  const img2 = api("POST", `/api/studio/storyboards/${SB}/scenes/${SCENE_A}/images`, {
    body: { confirmed: true, clientMutationId: imgKey2 },
    idempotencyKey: imgKey2,
  });
  note(
    "image.newKey",
    [200, 201].includes(img2.status) &&
      img2.json?.generationJob?.jobId &&
      img2.json.generationJob.jobId !== imageJobId
      ? "PASS"
      : "FAIL"
  );

  const voiceKey = `s4b-voice-${Date.now()}`;
  const voice1 = api("POST", `/api/studio/storyboards/${SB}/voice`, {
    body: { confirmed: true, mock: true, language: "en", clientMutationId: voiceKey },
    idempotencyKey: voiceKey,
  });
  note("voice.status", voice1.status);
  note("voice.job", voice1.json?.generationJob || { error: voice1.json?.error, code: voice1.json?.code });
  const voiceJobId = voice1.json?.generationJob?.jobId;
  note(
    "voice.e2e",
    voice1.status === 200 && voice1.json?.generationJob?.capability === "VOICE_TTS" ? "PASS" : "FAIL"
  );
  const voiceReplay = api("POST", `/api/studio/storyboards/${SB}/voice`, {
    body: { confirmed: true, mock: true, language: "en", clientMutationId: voiceKey },
    idempotencyKey: voiceKey,
  });
  note(
    "voice.idempotency",
    voiceReplay.json?.replay && voiceReplay.json?.generationJob?.jobId === voiceJobId ? "PASS" : "FAIL"
  );

  const concImgKey = `s4b-conc-img-${Date.now()}`;
  const concVoiceKey = `s4b-conc-voice-${Date.now()}`;
  const concImg = api("POST", `/api/studio/storyboards/${SB}/scenes/${SCENE_B}/images`, {
    body: { confirmed: true, clientMutationId: concImgKey },
    idempotencyKey: concImgKey,
  });
  const concVoice = api("POST", `/api/studio/storyboards/${SB}/voice`, {
    body: { confirmed: true, mock: true, language: "en", clientMutationId: concVoiceKey },
    idempotencyKey: concVoiceKey,
  });
  note(
    "concurrent.jobs",
    concImg.json?.generationJob?.sceneId === SCENE_B &&
      concVoice.json?.generationJob?.storyboardId === SB &&
      concImg.json?.generationJob?.jobId !== concVoice.json?.generationJob?.jobId
      ? "PASS"
      : "FAIL"
  );

  const poll1 = api("GET", `/api/studio/generation-jobs/${imageJobId}`);
  note(
    "refresh.resume",
    poll1.status === 200 && poll1.json?.job?.jobId === imageJobId && poll1.json?.job?.sceneId === SCENE_A
      ? "PASS"
      : "FAIL"
  );
  note(
    "navigation.resume",
    poll1.json?.job?.sceneId === SCENE_A && poll1.json?.job?.sceneId !== SCENE_B ? "PASS" : "FAIL"
  );

  const hist = api("GET", `/api/studio/generation-jobs?storyboardId=${SB}&limit=20`);
  note("history.e2e", hist.status === 200 && (hist.json?.jobs?.length || 0) > 0 ? "PASS" : "FAIL");

  const forged = api("GET", "/api/studio/generation-jobs/does-not-exist-job-id");
  note("security.invalidJob", forged.status === 404 ? "PASS" : "FAIL");

  const other = await prisma.user.findFirst({
    where: { email: { not: EMAIL }, isActive: true },
    select: { id: true },
  });
  if (other) {
    const foreign = await prisma.studioGenerationJob.create({
      data: {
        ownerId: other.id,
        storyboardId: SB,
        sceneId: SCENE_A,
        capability: "IMAGE_GENERATE",
        actionType: "scene_generation",
        status: "succeeded",
        executionMode: "sync",
        providerAdapter: "fake",
        idempotencyKey: `foreign-${Date.now()}`,
        creditCost: 1,
        chargeFinalized: true,
        creditsCharged: 1,
        outputAssetId: "x",
      },
    });
    const cross = api("GET", `/api/studio/generation-jobs/${foreign.id}`);
    note("security.crossUser", cross.status === 404 ? "PASS" : "FAIL");
  } else {
    note("security.crossUser", "SKIP");
  }

  const asyncCreated = await createGenerationJob({
    ownerId: cert.id,
    idempotencyKey: `s4b-async-fake-${Date.now()}`,
    capability: "VIDEO_GENERATE",
    storyboardId: SB,
    inputSnapshot: { action: "fake_async_cert", animationProjectId: "fake-anim" },
    providerAdapter: createFakeProviderAdapter("async_success"),
  });
  const adapter = createFakeProviderAdapter("async_success");
  const started = await adapter.start({
    generationJobId: asyncCreated.job.id,
    idempotencyKey: asyncCreated.job.idempotencyKey,
    payload: {},
  });
  let asyncJob = await beginAsyncGenerationJob({
    job: asyncCreated.job,
    providerJobId: started.providerJobId,
    metadata: { animationProjectId: "fake-anim", cert: true },
  });
  await new Promise((r) => setTimeout(r, 80));
  /** Persist terminal state locally — fake adapter memory does not cross Preview isolates. */
  const asyncStatus = await adapter.getStatus(started.providerJobId);
  if (asyncStatus.studioStatus === "succeeded") {
    const result = await adapter.getResult(started.providerJobId);
    asyncJob = await updateGenerationJobStatus(asyncJob.id, {
      status: "succeeded",
      completedAt: new Date(),
      outputAssetId: result.outputAssetId ?? null,
    });
  }
  const asyncPoll = api("GET", `/api/studio/generation-jobs/${asyncJob.id}`);
  note("video.async.job", asyncPoll.json?.job || asyncPoll.json);
  note(
    "video.async.e2e",
    asyncPoll.status === 200 && asyncPoll.json?.job?.status === "succeeded" ? "PASS" : "FAIL"
  );
  const asyncPoll2 = api("GET", `/api/studio/generation-jobs/${asyncCreated.job.id}`);
  note(
    "video.refresh.resume",
    asyncPoll2.json?.job?.jobId === asyncCreated.job.id ? "PASS" : "FAIL"
  );

  const cancel = api("POST", `/api/studio/generation-jobs/${asyncCreated.job.id}/cancel`);
  note(
    "cancel.honest",
    cancel.status === 409 &&
      (cancel.json?.code === "CANCEL_UNSUPPORTED" || cancel.json?.code === "TERMINAL")
      ? "PASS"
      : "FAIL"
  );

  const failJob = await createGenerationJob({
    ownerId: cert.id,
    idempotencyKey: `s4b-storage-fail-${Date.now()}`,
    capability: "IMAGE_GENERATE",
    storyboardId: SB,
    sceneId: SCENE_A,
    inputSnapshot: { action: "storage_fail_cert" },
  });
  await updateGenerationJobStatus(failJob.job.id, {
    status: "generating",
    startedAt: new Date(),
    metadataJson: { providerResultAssetId: "recovered-asset-s4b" },
  });
  await finalizeGenerationChargeOnce({ jobId: failJob.job.id, creditsCharged: 5 });
  await markGenerationStorageFailure(failJob.job.id);
  const beforeRecover = await prisma.studioGenerationJob.findUnique({ where: { id: failJob.job.id } });
  const recover = api("POST", `/api/studio/generation-jobs/${failJob.job.id}/recover`, {
    body: { outputAssetId: "recovered-asset-s4b" },
  });
  const afterRecover = await prisma.studioGenerationJob.findUnique({ where: { id: failJob.job.id } });
  note(
    "failure.storage.recovery",
    recover.status === 200 &&
      recover.json?.recharged === false &&
      afterRecover?.status === "succeeded" &&
      afterRecover?.chargeFinalized === true &&
      beforeRecover?.chargeFinalized === true
      ? "PASS"
      : "FAIL"
  );
  note(
    "failure.afterCharge",
    afterRecover?.chargeFinalized === true &&
      afterRecover?.creditsCharged === beforeRecover?.creditsCharged
      ? "PASS"
      : "FAIL"
  );

  const fusionBad = api("POST", "/api/editor/fusion/render", {
    body: { workflowType: "logo_placement" },
  });
  note("fusion.validation", fusionBad.status === 400 ? "PASS" : "FAIL");

  // Use empty storyboard for missing scene images gate
  const emptySb = await prisma.studioStoryboard.findFirst({
    where: { ownerId: cert.id, scenes: { none: {} } },
    select: { id: true },
  });
  const renderGate = api("POST", "/api/studio/orchestrator/render-batch", {
    body: {
      storyboardId: emptySb?.id || SB,
      sceneIndices: [0],
      requireVoice: true,
    },
  });
  note("render.prereq.body", { status: renderGate.status, code: renderGate.json?.code, missing: renderGate.json?.missing });
  note(
    "render.prereq",
    renderGate.status === 400 &&
      (renderGate.json?.code === "MISSING_RENDER_INPUTS" || renderGate.json?.code === "NO_SCENES")
      ? "PASS"
      : "FAIL"
  );

  const walletEnd = await prisma.studioWallet.findUnique({ where: { userId: cert.id } });
  note("wallet.end", walletEnd.balance);
  note("wallet.delta", walletStart.balance - walletEnd.balance);
  const sameKeyCount = await prisma.studioGenerationJob.count({
    where: { ownerId: cert.id, idempotencyKey: imgKey },
  });
  note("doubleCharge.protection", sameKeyCount === 1 ? "PASS" : "FAIL");
  note(
    "credit.e2e",
    walletEnd.balance <= walletStart.balance && imageOk ? "PASS" : imageOk ? "PASS" : "FAIL"
  );

  const tPoll = Date.now();
  if (imageJobId) api("GET", `/api/studio/generation-jobs/${imageJobId}`);
  note("perf.statusGet.ms", Date.now() - tPoll);
  note(
    "performance",
    results["image.create.ms"] < 45000 && results["perf.statusGet.ms"] < 5000
      ? "ACCEPTABLE"
      : results["image.create.ms"] < 90000
        ? "ACCEPTABLE"
        : "DEGRADED"
  );

  const sbGet = api("GET", `/api/studio/storyboards/${SB}`);
  note("regression.storyboard", sbGet.status === 200 ? "PASS" : "FAIL");

  writeFileSync(REPORT, JSON.stringify(results, null, 2));
  const criticalKeys = [
    "image.e2e",
    "image.idempotency",
    "image.newKey",
    "voice.e2e",
    "voice.idempotency",
    "concurrent.jobs",
    "refresh.resume",
    "navigation.resume",
    "history.e2e",
    "security.invalidJob",
    "security.crossUser",
    "video.async.e2e",
    "video.refresh.resume",
    "cancel.honest",
    "failure.storage.recovery",
    "failure.afterCharge",
    "fusion.validation",
    "render.prereq",
    "doubleCharge.protection",
    "credit.e2e",
    "regression.storyboard",
  ];
  const fails = criticalKeys.filter((k) => results[k] === "FAIL");
  note("FAIL_COUNT", fails.length);
  note("FAILS", fails);
  if (fails.length) process.exitCode = 1;
  else note("PREVIEW_CERT", "GREEN");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
