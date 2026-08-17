import { expect, test } from "@playwright/test";

test.describe("PX.4A.4 contextual creator surfaces", () => {
  test("public photo-video creator stays public and is not the item journey", async ({ page }) => {
    const response = await page.goto("/studio/photo-video", { waitUntil: "domcontentloaded" });
    expect(response?.ok() ?? false).toBeTruthy();
    expect(page.url()).toContain("/studio/photo-video");
    expect(page.url()).not.toContain("/from-item");
    await expect(page.getByTestId("px4a-item-shell")).toHaveCount(0);
    await expect(page.getByTestId("px4a-item-back")).toHaveCount(0);
  });

  test("from-item is private and does not dump onto Studio Home", async ({ page }) => {
    const response = await page.goto("/studio/photo-video/from-item", {
      waitUntil: "domcontentloaded",
    });
    const status = response?.status() ?? 0;
    expect(status).not.toBe(500);
    const url = page.url();
    expect(url).not.toMatch(/https:\/\/studio\.homecheff\.eu\/?$/);
    expect(url).not.toContain("/studio/experience");
    const isCreator = url.includes("/studio/photo-video/from-item");
    const isAuthHandoff =
      url.includes("/auth/sso") ||
      url.includes("/login") ||
      url.includes("homecheff.eu");
    expect(isCreator || isAuthHandoff).toBeTruthy();
    if (isCreator) {
      await expect(page.getByTestId("px4a-item-back")).toBeVisible();
      await expect(page.getByTestId("px4a-item-finish-hint")).toBeVisible();
      await expect(page.getByText("Gratis account maken")).toHaveCount(0);
    }
  });
});
