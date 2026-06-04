import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("useInstantVideoRepair sets starting feedback before fetch", () => {
  const src = readFileSync(join(__dirname, "use-instant-video-repair.ts"), "utf8");
  assert.match(src, /setRepairStarting\(true\)/);
  assert.match(src, /kind: "starting"/);
  assert.match(src, /instant\.videoRepair\.starting/);
  assert.match(src, /res\.status === 202/);
  assert.match(src, /instant\.videoRepair\.startedChecking/);
  assert.match(src, /instant\.videoRepair\.startFailed/);
  assert.match(src, /void pollNow\(\)/);
  assert.match(src, /kind: "poll_failed"/);
  assert.match(src, /instant\.videoRepair\.pollFailed/);
  assert.match(src, /fetchInstantPremiumStatus/);
  assert.match(src, /credentials: "include"/);
});

test("InstantVideoRepairCard shows spinner while starting", () => {
  const src = readFileSync(
    join(__dirname, "../components/instant/instant-video-repair-card.tsx"),
    "utf8"
  );
  assert.match(src, /animate-spin/);
  assert.match(src, /instant\.videoRepair\.starting/);
  assert.match(src, /instant\.videoRepair\.stepProgress/);
  assert.match(src, /instant\.videoRepair\.stillBusy/);
});
