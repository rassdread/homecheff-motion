import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ANIMATION_PROJECT_DETAIL_PATH,
  INSTANT_PREMIUM_STATUS_PATH,
} from "@/lib/instant-premium-polling-api";
import { sameOriginApiPath, SAME_ORIGIN_JSON_FETCH_INIT } from "@/lib/client-api-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("SAME_ORIGIN_JSON_FETCH_INIT uses same-origin credentials and no-store cache", () => {
  assert.equal(SAME_ORIGIN_JSON_FETCH_INIT.credentials, "same-origin");
  assert.equal(SAME_ORIGIN_JSON_FETCH_INIT.cache, "no-store");
  assert.deepEqual(SAME_ORIGIN_JSON_FETCH_INIT.headers, { Accept: "application/json" });
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
  assert.match(repair, /credentials: "same-origin"/);
  assert.doesNotMatch(progress, /https:\/\/motion\.homecheff/);
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
