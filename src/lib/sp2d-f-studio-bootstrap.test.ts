import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from "node:test";
import {
  fetchRecentLibraryAdditions,
  invalidateLibraryConsistencyQueryCache,
  queryLibraryConsistency,
} from "@/lib/library-consistency-client";

describe("SP.2D-F library recent vs query bootstrap", () => {
  beforeEach(() => {
    invalidateLibraryConsistencyQueryCache();
    mock.restoreAll();
  });

  it("home-style recent fetch uses GET /recent and does not POST /query", async () => {
    const urls: string[] = [];
    mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      assert.match(url, /\/api\/studio\/library-consistency\/recent\?limit=8/);
      return new Response(
        JSON.stringify({
          ok: true,
          records: [{ id: "a1", assetName: "Clip", category: "motion", updatedAt: new Date().toISOString() }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const records = await fetchRecentLibraryAdditions(8);
    assert.equal(records.length, 1);
    assert.equal(urls.length, 1);
    assert.ok(!urls.some((u) => u.includes("/library-consistency/query")));
  });

  it("browse/hub unfiltered query still coalesces into one POST", async () => {
    let calls = 0;
    mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      assert.equal(init?.method, "POST");
      await new Promise((r) => setTimeout(r, 10));
      return new Response(
        JSON.stringify({
          ok: true,
          results: Array.from({ length: 12 }, (_, i) => ({ id: `r${i}` })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const [a, b] = await Promise.all([
      queryLibraryConsistency({ limit: 500 }),
      queryLibraryConsistency({ limit: 500 }),
    ]);
    assert.equal(calls, 1);
    assert.equal(a.results?.length, 12);
    assert.equal(b.results?.length, 12);
  });
});

describe("SP.2D-F studio insights shell view routing", () => {
  it("route source wires view=shell to buildUserStudioHomeShell", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const route = readFileSync(
      join(process.cwd(), "src/app/api/me/studio-insights/route.ts"),
      "utf8"
    );
    assert.match(route, /buildUserStudioHomeShell/);
    assert.match(route, /view === "shell"/);

    const home = readFileSync(
      join(process.cwd(), "src/components/studio/studio-home-dashboard.tsx"),
      "utf8"
    );
    assert.match(home, /view=shell/);
    assert.match(home, /view=dashboard/);
    assert.match(home, /dynamic\(/);

    const universe = readFileSync(
      join(process.cwd(), "src/components/suite/universe/universe-home-sections.tsx"),
      "utf8"
    );
    assert.match(universe, /fetchRecentLibraryAdditions\(8\)/);
    assert.doesNotMatch(universe, /queryLibraryConsistency/);

    const assistant = readFileSync(
      join(process.cwd(), "src/components/assistant/homecheff-assistant-provider.tsx"),
      "utf8"
    );
    assert.match(assistant, /fetchRecentLibraryAdditions\(40\)/);
    assert.doesNotMatch(assistant, /queryLibraryConsistency\(\{ limit: 500 \}\)/);

    const workspace = readFileSync(
      join(process.cwd(), "src/components/studio/studio-workspace-shell.tsx"),
      "utf8"
    );
    assert.match(workspace, /fetchAuthSessionJson\(\)/);
    assert.doesNotMatch(workspace, /fetchAuthSessionJson\(\{ force: true \}\)/);

    const manifest = readFileSync(
      join(process.cwd(), "src/server/studio/library-consistency-manifest-blob.ts"),
      "utf8"
    );
    assert.match(manifest, /MANIFEST_CACHE_TTL_MS/);
    assert.match(manifest, /invalidateLibraryConsistencyManifestCache/);
  });
});
