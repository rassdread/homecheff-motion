import { devices, expect, test } from "@playwright/test";

test.describe("PX.4A.4 public compositor certification", () => {
  test("desktop public creator keeps free watermark and duration, no credits", async ({ page }) => {
    await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("px4a-composer")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("px4a-duration")).toBeVisible();
    await expect(page.getByTestId("px4a-remaining")).toBeVisible();
    await expect(page.getByTestId("px4a-free-label")).toBeVisible();
    await expect(page.getByText("Geen credits nodig").first()).toBeVisible();
    await expect(page.locator("text=Koop credits")).toHaveCount(0);
    await expect(page.getByTestId("px4a-item-back")).toHaveCount(0);
    await page.getByRole("button", { name: "Liggend" }).click();
    await expect(page.getByRole("button", { name: "Liggend" })).toHaveAttribute("aria-pressed", "true");
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
    await context.close();
  });
});
