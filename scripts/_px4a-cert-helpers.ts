/**
 * Shared PX.4A / Slice 1B certification helpers.
 * Maps legacy toolbar interactions to the context-bar UX without changing test intent.
 */
import type { Page } from "playwright";

export type Px4aContextAction = "text" | "motion" | "order" | "trim" | "fit" | "audio" | "style" | "position";

/** Clear IndexedDB draft when resume overlay is shown. */
export async function clearDraftIfOffered(page: Page): Promise<void> {
  const fresh = page.getByTestId("px4a-resume-fresh");
  if (await fresh.count()) {
    await fresh.click();
    await page.waitForTimeout(800);
    return;
  }
  const cont = page.getByTestId("px4a-resume-continue");
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(1200);
  }
}

/** Open composer with optional fresh draft. */
export async function openPhotoVideoComposer(page: Page, baseUrl: string, fresh = true): Promise<void> {
  await page.goto(`${baseUrl}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  if (fresh) await clearDraftIfOffered(page);
}

export async function overflowPx(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Slice 1B context model visible: helper when nothing selected, or action bar when selected. */
export async function mobileContextModelVisible(page: Page): Promise<boolean> {
  const helper = await page.getByTestId("px4a-context-none-helper").isVisible().catch(() => false);
  const bar = await page.getByTestId("px4a-context-bar").isVisible().catch(() => false);
  return helper || bar;
}

/** Inspector + context-bar state for certification reports. */
export async function inspectorContextState(page: Page) {
  return page.evaluate(() => ({
    contextBar: !!document.querySelector('[data-testid="px4a-context-bar"]'),
    contextHelper: !!document.querySelector('[data-testid="px4a-context-none-helper"]'),
    contextTrim: !!document.querySelector('[data-testid="px4a-context-trim"]'),
    contextText: !!document.querySelector('[data-testid="px4a-context-text"]'),
    trim: !!document.querySelector('[data-testid="px4a-video-trim"]'),
    audio: !!document.querySelector('[data-testid="px4a-video-audio"]'),
    fit: !!document.querySelector('[data-testid="px4a-video-fit"]'),
    movementPhoto: !!document.querySelector('[data-testid="px4a-movement-photo"]'),
    posture: document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture") ?? null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvas: document.querySelectorAll('[data-testid="px4a-composer"] canvas').length,
    ua: navigator.userAgent,
  }));
}

/** Activate a context action (Inkorten, Tekst, …). Video trim opens by default on select; click only if needed. */
export async function openContextAction(page: Page, action: Px4aContextAction): Promise<void> {
  const btn = page.getByTestId(`px4a-context-${action}`);
  if (!(await btn.count())) return;
  const pressed = await btn.getAttribute("aria-pressed");
  if (pressed !== "true") await btn.click();
  await page.waitForTimeout(400);
}

export async function selectStripItem(page: Page, index: number): Promise<void> {
  await page.getByTestId(`px4a-photo-${index}`).locator("button[aria-pressed]").first().click();
  await page.waitForTimeout(500);
}

export async function makeTestPng(page: Page, color: string): Promise<Buffer> {
  return Buffer.from(
    await page.evaluate((fill) => {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d");
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 720, 1280);
      return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
    }, color),
    "base64"
  );
}
