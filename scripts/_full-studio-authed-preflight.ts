/**
 * Auth + Production release preflight for FULL_STUDIO_CERT_AUTHED_PRODUCTION_CLOSEOUT.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const STUDIO = "https://studio.homecheff.eu";
const HC = "https://homecheff.eu";

const PROFILE_CANDIDATES = [
  join(ROOT, ".px4a7-prod-profile"),
  join(ROOT, ".px4a4-chrome-profile"),
];

async function probeProfile(profilePath: string) {
  if (!existsSync(profilePath)) {
    return { profilePath, exists: false };
  }
  const ctx = await chromium.launchPersistentContext(profilePath, {
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
    viewport: { width: 1280, height: 800 },
  });
  try {
    const studioAccount = await ctx.request.get(`${STUDIO}/api/me/studio-account`, {
      failOnStatusCode: false,
    });
    const hcMe = await ctx.request.get(`${HC}/api/user/me`, { failOnStatusCode: false });
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const html = await page.content();
    const dpl = html.match(/data-dpl-id="([^"]+)"/)?.[1] ?? null;
    const projectsAuthed =
      html.includes("Mijn projecten") ||
      html.includes("My projects") ||
      html.includes("studio-my-projects");
    const stageSignals = [
      "Afronden",
      "Verhaal",
      "Personen",
      "studio.finish.title",
      "productionStage",
    ].filter((s) => html.includes(s));
    return {
      profilePath,
      exists: true,
      studioAccountStatus: studioAccount.status(),
      hcMeStatus: hcMe.status(),
      projectsUrl: page.url(),
      projectsAuthed,
      dpl,
      stageSignalsInHtml: stageSignals.length,
      finalUrl: page.url(),
    };
  } finally {
    await ctx.close();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const p of PROFILE_CANDIDATES) {
    results.push(await probeProfile(p));
  }
  const best = results.find((r) => r.exists && r.projectsAuthed && r.studioAccountStatus === 200);
  const report = {
    at: new Date().toISOString(),
    studio: STUDIO,
    profiles: results,
    selectedProfile: best?.profilePath ?? null,
    authReady: Boolean(best),
    productionDpl: best?.dpl ?? results.find((r) => r.dpl)?.dpl ?? null,
  };
  writeFileSync(join(OUT, "AUTHED-PREFLIGHT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.authReady) {
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
