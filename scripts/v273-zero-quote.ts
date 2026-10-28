import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.goto("http://127.0.0.1:3462/login", { waitUntil: "domcontentloaded" });
  const login = await page.evaluate(async (input) => {
    const next = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return next.status;
  }, { email: "v272-user-c@studio.local.test", password: "v272-local-only-password" });
  const quote = await page.evaluate(async () => {
    const response = await fetch("/api/studio/projects/cmvs2nqpl0062dh92uzqi61xk/scenes/cmvs2oxy20066dh92kkznw9rc/dialogue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "quote", voiceProfile: "warm_narrator" }),
    });
    return { status: response.status, body: await response.json() };
  });
  const report = { login, quote, started: false };
  await writeFile(path.resolve("docs/studio-v27-3/evidence/zero-hc-quote.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main();
