/**
 * Ensures ffmpeg-static / ffprobe-static are not imported from Next.js app code paths.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src");
const FORBIDDEN = ["ffmpeg-static", "ffprobe-static"] as const;
const ALLOWED_SUFFIX = `${path.sep}worker${path.sep}video-tools${path.sep}resolve-worker-ffmpeg.ts`;

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
    if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts")
    ) {
      out.push(full);
    }
  }
}

function main(): void {
  const files: string[] = [];
  collectTsFiles(ROOT, files);

  const violations: string[] = [];
  for (const file of files) {
    if (file.endsWith(ALLOWED_SUFFIX)) {
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    for (const pkg of FORBIDDEN) {
      if (text.includes(`"${pkg}"`) || text.includes(`'${pkg}'`)) {
        violations.push(`${path.relative(process.cwd(), file)} → ${pkg}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("ffmpeg-static must not be imported from Next app code:\n");
    for (const v of violations) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  }

  console.info("[check:no-ffmpeg-static-in-app] ok");
}

main();
