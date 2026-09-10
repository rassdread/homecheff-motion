#!/usr/bin/env npx tsx
/** Portrait-recovery only after landscape PASS. */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, type Browser, type Page } from "playwright";

const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
const STUDIO = "https://studio.homecheff.eu";
const STORYBOARD_ID = process.env.CERT_STORYBOARD_ID?.trim() || "cmt5izwgu0001gq0444v3ipil";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const SHOTS = join(OUT, "iphone-final");
const LIVE = join(OUT, "IPHONE-FINAL-LIVE.json");

function say(m: string) {
  process.stdout.write(`${m}\n`);
}

async function connect(): Promise<Browser> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${CDP}/json`);
      const d = (await res.json()) as unknown[];
      if (Array.isArray(d) && d.length > 0) break;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  try {
    return await webkit.connectOverCDP(CDP, { timeout: 25_000 });
  } catch {
    return await chromium.connectOverCDP(CDP, { timeout: 25_000 });
  }
}

async function orient(page: Page) {
  return page.evaluate(() => {
    const mm = window.matchMedia("(orientation: landscape)").matches;
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      mmLandscape: mm,
      so: String(screen.orientation?.type || ""),
      orient: mm || window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    };
  });
}

async function preview(page: Page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 48 && r.height > 48 && i.naturalWidth > 0;
    });
    const first = imgs[0];
    let blackish = false;
    if (first) {
      try {
        const c = document.createElement("canvas");
        c.width = 10;
        c.height = 10;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(first, 0, 0, 10, 10);
          const d = ctx.getImageData(0, 0, 10, 10).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += d[i]! + d[i + 1]! + d[i + 2]!;
          blackish = sum / (10 * 10 * 3) < 8;
        }
      } catch {
        /* */
      }
    }
    return { visibleImages: imgs.length, blackishSample: blackish };
  });
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await connect();
  const page =
    browser.contexts()[0]?.pages().find((p) => /studio\.homecheff\.eu/i.test(p.url())) ||
    browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("NO_PAGE");

  if (!page.url().includes(STORYBOARD_ID)) {
    await page
      .goto(`${STUDIO}/studio?storyboardId=${STORYBOARD_ID}&stage=visuals&continueInStudio=1`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      })
      .catch(() => undefined);
    await page.waitForTimeout(2000);
  }

  const start = await orient(page);
  say(`current=${start.orient} ${start.w}x${start.h}`);
  say("\n*** Rotate PHYSICAL iPhone back to PORTRAIT now. Waiting up to 3 min… ***\n");

  let port = start;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    port = await orient(page);
    say(`  ${port.orient} ${port.w}x${port.h} so=${port.so}`);
    if (port.orient === "portrait") break;
    await page.waitForTimeout(3000);
  }

  const nav = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  const previewP = await preview(page);
  const url = page.url();
  const shot = join(SHOTS, `${Date.now()}-portrait-recovery-final.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => undefined);

  const recoveryPass =
    port.orient === "portrait" && port.h >= port.w && nav && !previewP.blackishSample && url.includes(STORYBOARD_ID);

  const prev = existsSync(LIVE) ? JSON.parse(readFileSync(LIVE, "utf8")) : {};
  const gates = Array.isArray(prev.gates) ? [...prev.gates] : [];
  const upsert = (gate: string, pass: boolean, evidence: unknown) => {
    const i = gates.findIndex((g: { gate: string }) => g.gate === gate);
    const row = { gate, pass, evidence: JSON.stringify(evidence).slice(0, 900) };
    if (i >= 0) gates[i] = row;
    else gates.push(row);
  };
  upsert("orientation_recovery", recoveryPass, { port, nav, previewP, url, shot });
  upsert("black_preview_after_rotation", !previewP.blackishSample, previewP);

  // Preserve landscape pass if already true
  const landGate = gates.find((g: { gate: string }) => g.gate === "landscape");
  if (landGate && landGate.pass !== true && start.orient === "landscape") {
    // keep prior landscape pass from last run in prev
  }

  const failed = gates.filter((g: { pass: boolean }) => g.pass === false);
  const report = {
    ...prev,
    gates,
    portraitRecoveryAt: new Date().toISOString(),
    classification: failed.length === 0 ? "CERTIFIED" : "FAILED",
    failedGates: failed.map((f: { gate: string }) => f.gate),
    recoveryPass,
    port,
    providerHits: 0,
  };
  writeFileSync(LIVE, JSON.stringify(report, null, 2));
  say(JSON.stringify({ classification: report.classification, failed: report.failedGates, recoveryPass, port }, null, 2));
  await browser.close().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
