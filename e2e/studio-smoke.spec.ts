import { expect, test } from "@playwright/test";

const studioApiPaths = [
  "/api/studio/storyboards",
  "/api/studio/locations",
  "/api/studio/characters",
  "/api/studio/props",
];

const landingHeadline = /AI-video|AI video/i;
const studioEditorHeading = /Verhaaleditor|Story editor/;

function isStoryboardListRequest(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return path === "/api/studio/storyboards";
  } catch {
    return false;
  }
}

test.describe("Motion Studio production smoke", () => {
  test("A — / shows public landing; /studio shows productive shell without legacy grid", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(landingHeadline);

    await page.goto("/studio");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(studioEditorHeading);
    await expect(page.locator('a[href="/studio/characters"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Mijn videoverhalen|My video stories/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Nieuw videoverhaal|New video story/i })).toBeVisible();
  });

  test("C — unauthenticated studio APIs return JSON 401 without CORS throw", async ({
    page,
  }) => {
    await page.goto("/studio");
    const result = await page.evaluate(async (paths) => {
      const checks: Array<{ path: string; status: number; contentType: string; threw: boolean }> =
        [];
      for (const path of paths) {
        try {
          const res = await fetch(path, {
            credentials: "include",
            mode: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          checks.push({
            path,
            status: res.status,
            contentType: res.headers.get("content-type") ?? "",
            threw: false,
          });
        } catch {
          checks.push({ path, status: 0, contentType: "", threw: true });
        }
      }
      return checks;
    }, studioApiPaths);

    for (const check of result) {
      expect(check.threw, `${check.path} should not throw access-control error`).toBe(false);
      expect(check.status, `${check.path} status`).toBe(401);
      expect(check.contentType, `${check.path} content-type`).toContain("application/json");
    }
  });

  test("C — OPTIONS preflight returns ACAO for production origin", async ({ request }) => {
    const res = await request.fetch("/api/studio/locations", {
      method: "OPTIONS",
      headers: {
        Origin: "https://studio.homecheff.eu",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(res.status()).toBe(204);
    expect(res.headers()["access-control-allow-origin"]).toBe("https://studio.homecheff.eu");
    expect(res.headers()["access-control-allow-credentials"]).toBe("true");
  });

  test("B — unauthenticated /studio/storyboards shows login CTA without API loop", async ({
    page,
  }) => {
    const storyboardListRequests: string[] = [];
    page.on("request", (req) => {
      if (isStoryboardListRequest(req.url())) {
        storyboardListRequests.push(req.url());
      }
    });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/studio/storyboards");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(
      page.getByRole("main").getByRole("link", { name: /log in|inloggen/i })
    ).toBeVisible();

    const accessControlLogs = consoleErrors.filter((line) =>
      /access control checks/i.test(line)
    );
    expect(accessControlLogs).toEqual([]);
    expect(storyboardListRequests.length).toBeLessThanOrEqual(1);
    await expect(page.getByLabel("Loading")).toHaveCount(0);
  });

  test("A — authenticated storyboards list (optional E2E_SESSION_COOKIE)", async ({
    page,
    context,
  }) => {
    const sessionCookie = process.env.E2E_SESSION_COOKIE?.trim();
    test.skip(!sessionCookie, "Set E2E_SESSION_COOKIE");

    await context.addCookies([
      {
        name: "studio_session",
        value: sessionCookie!,
        domain: "studio.homecheff.eu",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const storyboardListRequests: string[] = [];
    page.on("request", (req) => {
      if (isStoryboardListRequest(req.url())) {
        storyboardListRequests.push(req.url());
      }
    });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/studio/storyboards");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /videoverhalen|video stories/i
    );

    const accessControlLogs = consoleErrors.filter((line) =>
      /access control checks/i.test(line)
    );
    expect(accessControlLogs).toEqual([]);
    expect(storyboardListRequests.length).toBeLessThanOrEqual(2);
    await expect(page.getByLabel("Loading")).toHaveCount(0);
  });

  test("B — authenticated workspace APIs (optional E2E_SESSION_COOKIE + E2E_STORYBOARD_ID)", async ({
    page,
    context,
  }) => {
    const sessionCookie = process.env.E2E_SESSION_COOKIE?.trim();
    const storyboardId = process.env.E2E_STORYBOARD_ID?.trim();
    test.skip(!sessionCookie || !storyboardId, "Set E2E_SESSION_COOKIE and E2E_STORYBOARD_ID");

    await context.addCookies([
      {
        name: "studio_session",
        value: sessionCookie!,
        domain: "studio.homecheff.eu",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`/studio?storyboardId=${encodeURIComponent(storyboardId!)}`);
    await page.waitForLoadState("networkidle");

    const apiResult = await page.evaluate(
      async ({ storyboardId: id }) => {
        const paths = [
          `/api/studio/storyboards/${id}`,
          "/api/studio/locations",
          "/api/studio/characters",
          "/api/studio/props",
        ];
        const rows: Array<{ path: string; status: number; threw: boolean }> = [];
        for (const path of paths) {
          try {
            const res = await fetch(path, {
              credentials: "include",
              mode: "same-origin",
              cache: "no-store",
              headers: { Accept: "application/json" },
            });
            rows.push({ path, status: res.status, threw: false });
          } catch {
            rows.push({ path, status: 0, threw: true });
          }
        }
        return rows;
      },
      { storyboardId: storyboardId! }
    );

    for (const row of apiResult) {
      expect(row.threw, row.path).toBe(false);
      expect(row.status, row.path).toBe(200);
    }

    const accessControlLogs = consoleErrors.filter((line) =>
      /access control checks/i.test(line)
    );
    expect(accessControlLogs).toEqual([]);

    await expect(page.getByText(/Verhaaleditor|Story editor/i)).toBeVisible();
  });
});
