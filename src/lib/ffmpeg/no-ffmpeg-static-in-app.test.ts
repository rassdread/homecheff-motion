import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const FORBIDDEN = ["ffmpeg-static", "ffprobe-static"] as const;
const ALLOWED = "src/worker/video-tools/resolve-worker-ffmpeg.ts";

function collectTsFiles(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "worker") {
        continue;
      }
      collectTsFiles(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
}

describe("no-ffmpeg-static-in-app", () => {
  it("does not reference ffmpeg-static packages outside worker resolver", () => {
    const srcRoot = path.join(process.cwd(), "src");
    const files: string[] = [];
    collectTsFiles(srcRoot, files);
    const violations: string[] = [];

    for (const file of files) {
      const rel = path.relative(process.cwd(), file);
      if (rel === ALLOWED) {
        continue;
      }
      const text = fs.readFileSync(file, "utf8");
      for (const pkg of FORBIDDEN) {
        if (text.includes(`"${pkg}"`) || text.includes(`'${pkg}'`)) {
          violations.push(`${rel} → ${pkg}`);
        }
      }
    }

    assert.deepEqual(violations, []);
  });
});
