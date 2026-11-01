import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveLowCreditTier } from "@/lib/billing-conversion-utils";
import {
  buildFilmHeaderMetaChips,
  buildFilmWorkspaceReadiness,
  defaultFilmAssistantCollapsed,
  formatFilmDurationMs,
  normalizeFilmAspectRatio,
  readFilmAssistantCollapsedPreference,
  resolveSharedHcDisplayAmount,
  writeFilmAssistantCollapsedPreference,
  FILM_ASSISTANT_COLLAPSE_PREF_KEY,
} from "@/lib/studio-film-workspace-shell";
import {
  canonicalAmountForLowBalanceWarning,
  resolveCanonicalSpendableBalance,
} from "@/lib/studio-canonical-balance";
import { assembleProjectWorkspace } from "@/lib/studio-project-workspace";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("studio-film-workspace-shell", () => {
  it("formats authoritative duration and omits invalid values", () => {
    assert.equal(formatFilmDurationMs(10_000), "0:10");
    assert.equal(formatFilmDurationMs(61_000), "1:01");
    assert.equal(formatFilmDurationMs(null), null);
    assert.equal(formatFilmDurationMs(Number.NaN), null);
    assert.equal(formatFilmDurationMs(-1), null);
  });

  it("normalizes aspect ratio without inventing 16:9", () => {
    assert.equal(normalizeFilmAspectRatio("16:9"), "16:9");
    assert.equal(normalizeFilmAspectRatio("  "), null);
    assert.equal(normalizeFilmAspectRatio(undefined), null);
  });

  it("film header meta omits asset-derived aspect ratio and keeps title companions", () => {
    const chips = buildFilmHeaderMetaChips({
      durationLabel: "Duration 0:10",
      durationFallback: "Duration unavailable",
      hcLabel: "9,625 HC",
    });
    assert.deepEqual(
      chips.map((chip) => chip.id),
      ["duration", "hc"],
    );
    assert.equal(chips.some((chip) => chip.id === "duration"), true);
    assert.equal(chips.some((chip) => chip.id === "hc"), true);
    assert.equal(
      chips.some((chip) => String(chip.id).includes("aspect") || chip.testId.includes("aspect")),
      false,
    );
    assert.equal(chips.every((chip) => chip.value.trim().length > 0), true);
  });

  it("workspace header markup no longer renders film-aspect test id", () => {
    const workspace = readFileSync(
      join(process.cwd(), "src/components/studio/studio-unified-project-workspace.tsx"),
      "utf8",
    );
    const shell = readFileSync(join(process.cwd(), "src/lib/studio-film-workspace-shell.ts"), "utf8");
    assert.equal(workspace.includes("studio-v2753-film-aspect"), false);
    assert.equal(workspace.includes("normalizeFilmAspectRatio"), false);
    assert.equal(workspace.includes("filmAspectRatio"), false);
    assert.match(workspace, /buildFilmHeaderMetaChips/);
    assert.match(workspace, /studio-v2753-preview/);
    assert.match(workspace, /studio-v2753-export/);
    assert.match(workspace, /studio-v2753-compact-hero/);
    assert.match(workspace, /publishStudioFilmAssistantContext/);
    assert.match(workspace, /writeFilmAssistantCollapsedPreference/);
    assert.match(shell, /studio-v2753-film-duration/);
    assert.match(shell, /studio-v2753-film-hc/);
    assert.equal(shell.includes("studio-v2753-film-aspect"), false);
  });

  it("workspace DTO still accepts film.aspectRatio without requiring header use", () => {
    const view = assembleProjectWorkspace({
      project: {
        id: "p1",
        title: "Spot",
        description: "",
        status: "active",
        createdAt: "2026-10-19T00:00:00.000Z",
        updatedAt: "2026-10-19T00:00:00.000Z",
        storyboardLinked: true,
        animationLinked: false,
      },
      characters: [],
      assets: [],
      scenes: [],
      music: [],
      soundEffects: [],
      voiceover: [],
      exports: [],
      jobs: [],
      links: [],
      mediaProjectIds: [],
      audioLibraryAvailable: true,
      hcAvailable: 40,
      hcSource: "legacy_studio_wallet",
      film: { timelineAvailable: true, durationMs: 10_000, aspectRatio: "16:9" },
    });
    assert.equal(view.film.aspectRatio, "16:9");
    assert.equal(view.film.durationMs, 10_000);
    assert.equal(view.project.title, "Spot");
    assert.equal(view.hcAvailable, 40);
  });

  it("defaults AI collapsed on compact layouts and preserves stored preference", () => {
    assert.equal(defaultFilmAssistantCollapsed("full"), false);
    assert.equal(defaultFilmAssistantCollapsed("compact"), true);
    assert.equal(defaultFilmAssistantCollapsed("mobile"), true);
    const storage = memoryStorage();
    assert.equal(readFilmAssistantCollapsedPreference(storage, "compact"), true);
    writeFilmAssistantCollapsedPreference(storage, false);
    assert.equal(storage.getItem(FILM_ASSISTANT_COLLAPSE_PREF_KEY), "0");
    assert.equal(readFilmAssistantCollapsedPreference(storage, "compact"), false);
  });

  it("readiness uses library videos without counting exports as scene videos", () => {
    const view = assembleProjectWorkspace({
      project: {
        id: "cmvcbmxdp00032jryohiw8a84",
        title: "MADE WITH PASSION",
        description: "",
        status: "active",
        createdAt: "2026-10-18T00:00:00.000Z",
        updatedAt: "2026-10-19T00:00:00.000Z",
        storyboardLinked: true,
        animationLinked: false,
      },
      characters: [],
      assets: [
        { id: "still", family: "image", title: "Still", status: "active", previewUrl: "https://cdn.example/still.png" },
        { id: "video", family: "video", title: "Baker", status: "active", previewUrl: "https://cdn.example/baker.mp4" },
      ],
      scenes: [
        { id: "s1", order: 1, title: "A", description: "", imageUrl: "https://cdn.example/still.png", imageStatus: "completed" },
        { id: "s2", order: 2, title: "B", description: "", imageUrl: null, imageStatus: null },
      ],
      music: [],
      soundEffects: [],
      voiceover: [{ id: "vo", language: "nl", status: "completed", audioUrl: "https://cdn.example/vo.mp3" }],
      exports: [{ id: "ex", label: "Export", status: "completed", downloadUrl: "https://cdn.example/export.mp4" }],
      jobs: [],
      links: [],
      mediaProjectIds: [],
      audioLibraryAvailable: true,
      hcAvailable: 9625,
      hcSource: "central_hc",
      film: { timelineAvailable: true, durationMs: 10_000, aspectRatio: "16:9" },
    });
    const readiness = buildFilmWorkspaceReadiness(view);
    assert.equal(readiness.scenes, 2);
    assert.equal(readiness.scenesWithStill, 1);
    assert.equal(readiness.libraryVideos, 1);
    assert.equal(readiness.narrationAvailable, true);
    assert.equal(readiness.timelineAvailable, true);
  });
});

describe("HC balance consistency for film shell", () => {
  it("CASE 1: sufficient HC — correct amount, no low-credit tier", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 9625,
        reservedHc: 0,
      },
    });
    const amount = resolveSharedHcDisplayAmount(balance, { resolved: true, loading: false });
    assert.equal(amount, 9625);
    assert.equal(resolveLowCreditTier(amount!), null);
  });

  it("CASE 2: zero HC — zero shown, low-credit tier fires", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 0,
        reservedHc: 0,
      },
    });
    const amount = resolveSharedHcDisplayAmount(balance, { resolved: true, loading: false });
    assert.equal(amount, 0);
    assert.equal(resolveLowCreditTier(amount!), 20);
  });

  it("CASE 3: loading — no misleading zero", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: null,
    });
    assert.equal(resolveSharedHcDisplayAmount(balance, { resolved: false, loading: true }), null);
  });

  it("CASE 4: unavailable — no false numeric balance", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: false,
        availableHc: 0,
        reservedHc: 0,
      },
    });
    assert.equal(balance.source, "unavailable");
    assert.equal(resolveSharedHcDisplayAmount(balance, { resolved: true, loading: false }), null);
    assert.equal(canonicalAmountForLowBalanceWarning(balance), null);
  });

  it("CASE 5: low positive balance — correct warning threshold", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 40,
        reservedHc: 0,
      },
    });
    const amount = resolveSharedHcDisplayAmount(balance, { resolved: true, loading: false });
    assert.equal(amount, 40);
    // Thresholds are checked high→low; 40 is at or below 100.
    assert.equal(resolveLowCreditTier(amount!), 100);
  });

  it("CASE 6: malformed balance — safe handling", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 10,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: Number.NaN,
        reservedHc: 0,
      },
    });
    assert.equal(balance.source, "unavailable");
    assert.equal(canonicalAmountForLowBalanceWarning(balance), null);
  });

  it("CASE 7: banner and workspace share the same canonical amount", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 4154,
        reservedHc: 0,
      },
    });
    const banner = canonicalAmountForLowBalanceWarning(balance);
    const workspace = resolveSharedHcDisplayAmount(balance, { resolved: true, loading: false });
    assert.equal(banner, workspace);
    assert.equal(banner, 4154);
  });

  it("CASE 8: unresolved overview must not invent legacy zero for warnings", () => {
    assert.equal(
      resolveSharedHcDisplayAmount(
        {
          spendable: null,
          reserved: 0,
          unit: "HC",
          source: "unavailable",
          legacyStudioAvailable: 0,
          identityResolved: false,
          walletResolved: false,
        },
        { resolved: true, loading: false },
      ),
      null,
    );
  });
});
