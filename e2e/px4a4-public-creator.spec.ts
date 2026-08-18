import { devices, expect, test } from "@playwright/test";
import { PHOTO_VIDEO_FONTS, canvasFontShorthand } from "../src/lib/photo-video/text-overlay";

test.describe("PX.4A.4 public compositor certification", () => {
  test("desktop public creator keeps free watermark and duration control, no credits", async ({ page }) => {
    await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("px4a-composer")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("px4a-duration")).toBeVisible();
    await expect(page.getByTestId("px4a-video-duration")).toBeVisible();
    await expect(page.getByTestId("px4a-movement")).toBeVisible();
    await expect(page.getByTestId("px4a-free-label")).toBeVisible();
    await expect(page.getByText("Geen credits nodig").first()).toBeVisible();
    await expect(page.locator("text=Koop credits")).toHaveCount(0);
    await expect(page.getByTestId("px4a-item-back")).toHaveCount(0);
    await page.getByRole("button", { name: "Liggend" }).click();
    await expect(page.getByRole("button", { name: "Liggend" })).toHaveAttribute("aria-pressed", "true");
  });

  test("all six overlay fonts resolve to a concrete canvas shorthand Chromium will honor", async ({ page }) => {
    await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("px4a-composer")).toBeVisible({ timeout: 20_000 });
    const geist = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans")
    );
    const rows = PHOTO_VIDEO_FONTS.map((font) => ({
      font,
      shorthand: canvasFontShorthand(font, 48, (name) => (name === "--font-geist-sans" ? geist : "")),
    }));
    const applied = await page.evaluate((list) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d");
      return list.map((row) => {
        ctx.font = "10px sans-serif";
        ctx.font = row.shorthand;
        return {
          font: row.font,
          requested: row.shorthand,
          applied: ctx.font,
          width: ctx.measureText("Test").width,
        };
      });
    }, rows);
    for (const row of applied) {
      expect(row.requested, row.font).not.toContain("var(");
      expect(row.applied, row.font).not.toBe("10px sans-serif");
      expect(row.width, row.font).toBeGreaterThan(40);
    }
  });

  test("mobile 390px public creator stays usable", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Pixel 5"],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("px4a-composer")).toBeVisible({ timeout: 20_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(8);
    await expect(page.getByTestId("px4a-file-input")).toBeAttached();
    await expect(page.getByTestId("px4a-add-photo-tile")).toBeVisible();
    await context.close();
  });

  test("default overlay text is painted at the requested size, not 10px dots", async ({ page }) => {
    await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("px4a-composer")).toBeVisible({ timeout: 20_000 });
    const png = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 640;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d");
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, 640, 640);
        return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
      }),
      "base64"
    );
    const resume = page.getByTestId("px4a-resume-fresh");
    if (await resume.count()) await resume.click();
    await page.getByTestId("px4a-file-input").setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png },
    ]);
    await expect(page.getByTestId("px4a-photo-0")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("Test");
    const ratios = ["Verticaal", "Vierkant", "Liggend"] as const;
    for (const label of ratios) {
      await page.getByTestId("px4a-ratio").getByRole("button", { name: label }).click();
      await page.waitForTimeout(350);
      const metrics = await page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='px4a-preview-canvas']");
        if (!canvas) return { white: 0 };
        const ctx = canvas.getContext("2d");
        if (!ctx) return { white: 0 };
        const { width: w, height: h } = canvas;
        const data = ctx.getImageData(0, 0, w, h).data;
        let white = 0;
        const top = Math.floor(h * 0.45);
        for (let y = 0; y < top; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const i = (y * w + x) * 4;
            if (data[i]! > 200 && data[i + 1]! > 200 && data[i + 2]! > 200) white += 1;
          }
        }
        return { white, h };
      });
      expect(metrics.white, label).toBeGreaterThan(80);
    }
  });

  test("selected-photo inspector isolates text per photo", async ({ page }) => {
    await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("px4a-composer")).toBeVisible({ timeout: 20_000 });
    const resume = page.getByTestId("px4a-resume-fresh");
    if (await resume.count()) await resume.click();
    const png = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d");
        ctx.fillStyle = "#336699";
        ctx.fillRect(0, 0, 64, 64);
        return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
      }),
      "base64"
    );
    await page.getByTestId("px4a-file-input").setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png },
    ]);
    await expect(page.getByTestId("px4a-photo-0")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("px4a-photo-0").locator("button[aria-pressed]").first().click();
    await expect(page.getByTestId("px4a-photo-inspector")).toContainText(/Foto 1 aanpassen|Edit photo 1/);
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("ALPHA");
    await page.getByTestId("px4a-photo-1").locator("button[aria-pressed]").first().click();
    await expect(page.getByTestId("px4a-photo-inspector")).toContainText(/Foto 2 aanpassen|Edit photo 2/);
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("BETA");
    await page.getByTestId("px4a-photo-0").locator("button[aria-pressed]").first().click();
    await expect(page.getByTestId("px4a-text-input")).toHaveValue("ALPHA");
    await page.getByTestId("px4a-photo-1").locator("button[aria-pressed]").first().click();
    await expect(page.getByTestId("px4a-text-input")).toHaveValue("BETA");
    await expect(page.getByTestId("px4a-text-input")).toHaveAttribute("type", "text");
    await expect(page.getByTestId("px4a-add-photo-tile")).toBeVisible();
    await expect(page.getByTestId("px4a-movement-photo")).toBeVisible();
  });
});
