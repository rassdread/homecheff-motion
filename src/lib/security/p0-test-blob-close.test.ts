/**
 * Regression: Production must never re-expose an unauthenticated test blob upload route.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const API_ROOT = join(process.cwd(), "src/app/api");

function walkRouteFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkRouteFiles(full, out);
      continue;
    }
    if (name === "route.ts" || name === "route.js") out.push(full);
  }
  return out;
}

describe("P0 test-blob security close", () => {
  it("removes src/app/api/test-blob/route.ts", () => {
    assert.equal(existsSync(join(API_ROOT, "test-blob", "route.ts")), false);
    assert.equal(existsSync(join(API_ROOT, "test-blob")), false);
  });

  it("does not reference /api/test-blob in application source", () => {
    const routes = walkRouteFiles(API_ROOT);
    const offenders: string[] = [];
    for (const file of routes) {
      const src = readFileSync(file, "utf8");
      if (src.includes("test-blob") || src.includes("/api/test-blob")) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
      // Unauthenticated public blob smoke helpers must not reappear under api/
      if (
        /uploadPublicBlob/.test(src) &&
        /HomeCheff Motion Blob test/.test(src) &&
        !/requireActiveUser|canAccessAdmin|getSessionUser/.test(src)
      ) {
        offenders.push(`${file} (unauthenticated uploadPublicBlob smoke)`);
      }
    }
    assert.deepEqual(offenders, []);
  });
});
