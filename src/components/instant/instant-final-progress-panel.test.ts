import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isInstantExportProgressStuck } from "@/lib/instant-premium-progress-stage";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("isInstantExportProgressStuck returns false while repair is in progress", () => {
  const now = Date.now();
  assert.equal(
    isInstantExportProgressStuck({
      isActive: true,
      lastProgressChangeAtMs: now - 120_000,
      nowMs: now,
      repairInProgress: true,
    }),
    false
  );
});

test("InstantFinalProgressPanel hides stuck and failed banners during repair", () => {
  const src = readFileSync(
    join(__dirname, "instant-final-progress-panel.tsx"),
    "utf8"
  );
  assert.match(src, /repairActive/);
  assert.match(src, /showFailedBanner = isFailed && !repairActive/);
  assert.match(src, /showStuckBanner = stuck/);
  assert.match(src, /repairInProgress: repairActive/);
  assert.match(src, /instant\.videoRepair\.pollFailed/);
  assert.match(src, /pollingError\.adminDetail/);
});

test("InstantFinalProgressPanel shows text rerender step progress", () => {
  const src = readFileSync(
    join(__dirname, "instant-final-progress-panel.tsx"),
    "utf8"
  );
  assert.match(src, /TextLanguageRenderProgressPanel/);
  assert.match(src, /resolveTextRerenderProgress/);
  assert.match(src, /showTextRerenderProgress/);
});

test("InstantFinalProgressPanel shows motion render pipeline checklist", () => {
  const src = readFileSync(
    join(__dirname, "instant-final-progress-panel.tsx"),
    "utf8"
  );
  assert.match(src, /MotionRenderPipelinePanel/);
});
