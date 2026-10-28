import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isAuthorizedLocalMockSceneImageExecution } from "@/server/studio/authorized-local-mock-execution";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";
import { evaluateCreditPolicy } from "@/server/studio-account/studio-credit-policy";

const certUrl = "postgresql://sergioarrias@127.0.0.1:5432/homecheff_film_cert_2u";

function env(patch: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return patch as NodeJS.ProcessEnv;
}

const open = {
  DATABASE_URL: certUrl,
  STUDIO_FILM_CERT_LOCAL_AUTH: "true",
  STUDIO_SCENE_IMAGE_PROVIDER: "mock",
  VERCEL: undefined,
  VERCEL_ENV: undefined,
  VERCEL_URL: undefined,
};

test("authorized local mock scene images require server env, disposable database, and loopback", () => {
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({ env: env(open), hostHeader: "127.0.0.1:3456" }),
    true,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({ env: env(open), hostHeader: "localhost:3456" }),
    true,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({
      env: env({ ...open, STUDIO_SCENE_IMAGE_PROVIDER: "openai" }),
      hostHeader: "127.0.0.1:3456",
    }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({
      env: env({ ...open, STUDIO_SCENE_IMAGE_PROVIDER: undefined }),
      hostHeader: "127.0.0.1:3456",
    }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({
      env: env({ ...open, STUDIO_FILM_CERT_LOCAL_AUTH: undefined }),
      hostHeader: "127.0.0.1:3456",
    }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({
      env: env({ ...open, DATABASE_URL: "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test" }),
      hostHeader: "127.0.0.1:3456",
    }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({
      env: env({ ...open, DATABASE_URL: "postgresql://ep-wild-morning-alynrf2i.neon.tech/homecheff_film_cert_2u" }),
      hostHeader: "127.0.0.1:3456",
    }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({
      env: env({ ...open, VERCEL_ENV: "preview" }),
      hostHeader: "127.0.0.1:3456",
    }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({ env: env(open), hostHeader: "studio.homecheff.eu" }),
    false,
  );
  assert.equal(
    isAuthorizedLocalMockSceneImageExecution({ env: env(open), hostHeader: null }),
    false,
  );
});

test("scene image billing does not read client mock or skip flags", () => {
  const route = readFileSync(
    new URL("../../app/api/studio/storyboards/[id]/scenes/[sceneId]/images/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /isAuthorizedLocalMockSceneImageExecution\(\{/);
  assert.doesNotMatch(route, /skipBilling|freeGeneration|isTest|body\.provider|request\.provider/);
  assert.match(route, /actionType: "scene_generation"/);
  assert.equal(STUDIO_ACTION_COST_REGISTRY.scene_generation.provider, "openai");
  assert.equal(STUDIO_ACTION_COST_REGISTRY.scene_generation.defaultCreditCost, 30);
  assert.equal(STUDIO_ACTION_COST_REGISTRY.voice_generation.defaultCreditCost, 15);
  assert.equal(STUDIO_ACTION_COST_REGISTRY.voice_generation.provider, "elevenlabs");
});

test("a free account with zero credits cannot quote paid voice generation", () => {
  const result = evaluateCreditPolicy({
    userId: "zero-user",
    accountType: "free",
    planVersion: "v1",
    creditPolicyVersion: "v1",
    billingStatus: "none",
    actionType: "voice_generation",
    balance: 0,
    reservedBalance: 0,
    autoChargeSmallActions: true,
    confirmAboveCredits: 100,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "free_account_provider_action");
  assert.equal(result.requiredCredits, 15);
  assert.equal(result.provider, "elevenlabs");
});
