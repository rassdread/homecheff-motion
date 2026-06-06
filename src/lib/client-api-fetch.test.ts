import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ANIMATION_PROJECT_DETAIL_PATH,
  INSTANT_PREMIUM_STATUS_PATH,
} from "@/lib/instant-premium-polling-api";
import {
  isAbortLikeError,
  isAccessControlLikeError,
  sameOriginApiPath,
  SAME_ORIGIN_JSON_FETCH_INIT,
} from "@/lib/client-api-fetch";
import { isAllowedApiOrigin } from "@/lib/allowed-api-origins";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("SAME_ORIGIN_JSON_FETCH_INIT uses include credentials and no-store cache", () => {
  assert.equal(SAME_ORIGIN_JSON_FETCH_INIT.credentials, "include");
  assert.equal(SAME_ORIGIN_JSON_FETCH_INIT.mode, "same-origin");
  assert.equal(SAME_ORIGIN_JSON_FETCH_INIT.cache, "no-store");
  assert.deepEqual(SAME_ORIGIN_JSON_FETCH_INIT.headers, { Accept: "application/json" });
});

test("isAccessControlLikeError detects Safari CORS wording", () => {
  assert.ok(
    isAccessControlLikeError(new TypeError("Load failed due to access control checks."))
  );
  assert.equal(isAccessControlLikeError(new Error("timeout")), false);
});

test("production motion origin is allowed for API CORS", () => {
  assert.ok(isAllowedApiOrigin("https://motion.homecheff.eu"));
  assert.equal(isAllowedApiOrigin("https://evil.example"), false);
});

test("isAbortLikeError detects AbortError and aborted messages", () => {
  assert.ok(isAbortLikeError(new DOMException("aborted", "AbortError")));
  assert.ok(isAbortLikeError(new Error("The operation was aborted.")));
  assert.equal(isAbortLikeError(new Error("timeout")), false);
});

test("sameOriginApiPath rejects absolute URLs", () => {
  assert.throws(() => sameOriginApiPath("https://motion.homecheff.eu/api/x"));
  assert.equal(sameOriginApiPath("/api/foo"), "/api/foo");
});

test("instant polling paths are relative same-origin", () => {
  const id = "proj_123";
  assert.equal(INSTANT_PREMIUM_STATUS_PATH(id), `/api/instant-premium/projects/${id}/status`);
  assert.equal(ANIMATION_PROJECT_DETAIL_PATH(id), `/api/animations/projects/${id}`);
  assert.match(INSTANT_PREMIUM_STATUS_PATH(id), /^\//);
  assert.match(ANIMATION_PROJECT_DETAIL_PATH(id), /^\//);
});

test("polling hooks use shared same-origin fetch module", () => {
  const progress = readFileSync(
    join(__dirname, "../hooks/use-instant-premium-progress-polling.ts"),
    "utf8"
  );
  const status = readFileSync(
    join(__dirname, "../hooks/use-instant-premium-status-polling.ts"),
    "utf8"
  );
  const repair = readFileSync(join(__dirname, "../hooks/use-instant-video-repair.ts"), "utf8");
  assert.match(progress, /instant-premium-polling-api/);
  assert.match(status, /instant-premium-polling-api/);
  assert.match(repair, /fetchInstantPremiumStatus/);
  assert.match(repair, /credentials: "include"/);
  assert.doesNotMatch(progress, /https:\/\/motion\.homecheff/);
});

test("API middleware never redirects and logs auth-check", () => {
  const mw = readFileSync(join(__dirname, "../middleware.ts"), "utf8");
  assert.match(mw, /logAuthCheck/);
  assert.match(mw, /NextResponse\.next/);
  assert.match(mw, /originMatchesRequestHost/);
  assert.doesNotMatch(mw, /redirect\(/);
});

test("studio API clients use shared same-origin fetch helper", () => {
  for (const file of [
    "studio-storyboards-client.ts",
    "studio-locations-client.ts",
    "studio-characters-client.ts",
    "studio-props-client.ts",
  ]) {
    const source = readFileSync(join(__dirname, file), "utf8");
    assert.match(source, /fetchSameOriginJson/);
    assert.match(source, /sameOriginApiPath/);
    assert.doesNotMatch(source, /https:\/\/motion\.homecheff/);
  }
});

test("studio API routes return JSON auth errors without redirects", () => {
  for (const route of [
    "../app/api/studio/storyboards/[id]/route.ts",
    "../app/api/studio/locations/route.ts",
    "../app/api/studio/characters/route.ts",
    "../app/api/studio/props/route.ts",
  ]) {
    const source = readFileSync(join(__dirname, route), "utf8");
    assert.match(source, /requireActiveUser/);
    assert.doesNotMatch(source, /redirect\(/);
  }
});

test("instant status route uses viewer access and JSON auth errors", () => {
  const route = readFileSync(
    join(
      __dirname,
      "../app/api/instant-premium/projects/[id]/status/route.ts"
    ),
    "utf8"
  );
  const permissions = readFileSync(
    join(__dirname, "../server/auth/permissions.ts"),
    "utf8"
  );
  const animations = readFileSync(
    join(__dirname, "../app/api/animations/projects/[id]/route.ts"),
    "utf8"
  );
  assert.match(route, /getAnimationProjectByIdForViewer/);
  assert.match(route, /requireActiveUser/);
  assert.match(permissions, /NextResponse\.json/);
  assert.match(permissions, /status: 401/);
  assert.doesNotMatch(animations, /redirect\(/);
});
