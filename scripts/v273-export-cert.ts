/**
 * Local timeline export and browser download. No paid providers.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const base = "http://127.0.0.1:3462";
const projectId = "cmvrdlbwg0005dh92s468jz8g";
const evidence = path.resolve("docs/studio-v27-3/evidence");

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const login = await page.evaluate(async (input) => {
    const next = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return next.status;
  }, { email: "v272-user-a@studio.local.test", password: "v272-local-only-password" });
  if (login !== 200) throw new Error("Login failed");
  await page.goto(`${base}/studio/projects/${projectId}?section=timeline&workflow=film`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="film-export-mp4"]').waitFor({ timeout: 30000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 180000 });
  await page.locator('[data-testid="film-export-mp4"]').evaluate((node) => (node as HTMLButtonElement).click());
  const download = await downloadPromise;
  const target = path.join(evidence, "v273-film.mp4");
  await download.saveAs(target);
  const { stdout } = await execFileAsync("/opt/homebrew/opt/ffmpeg-full/bin/ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size,format_name:stream=codec_name,codec_type,width,height",
    "-of", "json",
    target,
  ]);
  const report = {
    login,
    suggestedFilename: download.suggestedFilename(),
    probe: JSON.parse(stdout),
  };
  await writeFile(path.join(evidence, "export-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
