import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyVoiceCatalogEligibility } from "@/lib/studio-voice-catalog-policy";
import {
  buildVoiceCatalogWhere,
  searchVoiceCatalogWithClient,
  voiceCatalogFilterOptionsFromCounts,
  type VoiceCatalogSearchClient,
  type VoiceCatalogSearchRow,
} from "@/lib/studio-voice-catalog-search";
import { runStudioVoiceCatalogSync, type VoiceCatalogSyncClient } from "@/server/studio/studio-voice-catalog-sync";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

const SAVED_CHARACTERS = [
  { id: "cmvdlq3wy0005k007dpq2mp8c", name: "Baker", voiceProfile: "" },
  { id: "cmvdlrtuo000fk007np7d6ft3", name: "Potter", voiceProfile: "" },
  { id: "cmvdltib5000pk00762r013fr", name: "Gardener", voiceProfile: "library:owned" },
];

function entry(id: string, language: string, previewUrl: string): VoiceLibraryEntry {
  return {
    id,
    name: `Voice ${id}`,
    accent: "american",
    gender: "female",
    age: "young",
    language,
    description: "",
    labels: { catalog_source: "shared" },
    previewUrl,
    category: "shared",
  };
}

describe("voice catalog eligibility", () => {
  it("requires a valid id and an https sample, and keeps unknown languages", () => {
    assert.equal(
      classifyVoiceCatalogEligibility({ providerVoiceId: "", previewUrl: "https://example.com/a.mp3", name: "A" }).eligibilityStatus,
      "EXCLUDED_INVALID_ID"
    );
    assert.equal(
      classifyVoiceCatalogEligibility({ providerVoiceId: "voice-1", previewUrl: "", name: "A", language: "en" }).eligibilityStatus,
      "EXCLUDED_NO_SAMPLE"
    );
    const unknown = classifyVoiceCatalogEligibility({
      providerVoiceId: "voice-2",
      previewUrl: "https://example.com/a.mp3",
      name: "A",
      language: "xx",
    });
    assert.equal(unknown.eligibilityStatus, "ELIGIBLE");
    assert.equal(unknown.availabilityStatus, "AVAILABILITY_UNKNOWN");
    const confirmed = classifyVoiceCatalogEligibility({
      providerVoiceId: "voice-3",
      previewUrl: "https://example.com/a.mp3",
      name: "A",
      language: "en",
      confirmedUnavailable: true,
    });
    assert.equal(confirmed.eligibilityStatus, "ELIGIBLE");
    assert.equal(confirmed.availabilityStatus, "UNAVAILABLE_CONFIRMED");
  });

  it("does not change saved Baker, Potter, or Gardener voice profiles", () => {
    const before = SAVED_CHARACTERS.map((character) => ({ ...character }));
    classifyVoiceCatalogEligibility({ providerVoiceId: "other", previewUrl: "", name: "Other" });
    assert.deepEqual(SAVED_CHARACTERS, before);
    assert.equal(SAVED_CHARACTERS[2]?.voiceProfile, "library:owned");
  });
});

describe("voice catalog database search", () => {
  it("requests one page from 20000 rows and does not repeat ids", async () => {
    const rows: VoiceCatalogSearchRow[] = Array.from({ length: 20000 }, (_, index) => ({
      providerVoiceId: `v${String(index).padStart(5, "0")}`,
      name: `Voice ${String(index).padStart(5, "0")}`,
      canonicalLanguage: index % 2 === 0 ? "en" : "nl",
      accent: "american",
      gender: "female",
      age: "young",
      category: "shared",
      description: "",
      previewUrl: "https://example.com/sample.mp3",
    }));
    let loaded = 0;
    const client: VoiceCatalogSearchClient = {
      async count({ where }) {
        assert.equal(where.eligibilityStatus, "ELIGIBLE");
        assert.equal(where.availabilityStatus, "AVAILABILITY_UNKNOWN");
        return rows.filter((row) => !where.canonicalLanguage || row.canonicalLanguage === where.canonicalLanguage).length;
      },
      async findMany(args) {
        assert.equal(args.take, 24);
        assert.deepEqual(args.orderBy, [{ name: "asc" }, { providerVoiceId: "asc" }]);
        const matched = rows.filter((row) => !args.where.canonicalLanguage || row.canonicalLanguage === args.where.canonicalLanguage);
        const page = matched.slice(args.skip, args.skip + args.take);
        loaded += page.length;
        return page;
      },
      async groupBy() {
        return [
          { canonicalLanguage: "en", _count: { _all: 10000 } },
          { canonicalLanguage: "nl", _count: { _all: 10000 } },
        ];
      },
    };
    const first = await searchVoiceCatalogWithClient(client, { language: "ENGLISH", page: 0 });
    const second = await searchVoiceCatalogWithClient(client, { language: "en", page: 1 });
    assert.equal(first.total, 10000);
    assert.equal(first.voices.length, 24);
    assert.equal(second.voices.length, 24);
    assert.equal(loaded, 48);
    assert.equal(first.voices.some((voice) => second.voices.some((next) => next.id === voice.id)), false);
    assert.deepEqual(buildVoiceCatalogWhere({ sample: "no" }).previewUrl, "");
    const options = voiceCatalogFilterOptionsFromCounts({
      accents: [{ value: "english.american", voiceCount: 4 }],
      genders: [{ value: "female", voiceCount: 4 }],
      languages: [{ value: "nl", voiceCount: 2 }],
      ages: [{ value: "young", voiceCount: 4 }],
      categories: [{ value: "shared", voiceCount: 4 }],
    });
    assert.equal(options.accents[0]?.voiceCount, 4);
    assert.equal(options.languages[0]?.value, "nl");
  });
});

describe("voice catalog sync", () => {
  it("does not call the provider without a key and does not delete rows after a partial failure", async () => {
    let upserts = 0;
    let runningChecks = 0;
    const db: VoiceCatalogSyncClient = {
      async findLastCompleted() {
        return null;
      },
      async findRunning() {
        runningChecks += 1;
        return null;
      },
      async startRun() {
        return { id: "run-1", status: "running", startedAt: new Date() };
      },
      async finishRun(_id, patch) {
        assert.equal(patch.status, "failed");
        assert.equal(patch.upserted, 1);
      },
      async upsert() {
        upserts += 1;
        if (upserts > 1) {
          throw new Error("rate limited");
        }
      },
    };
    const blocked = await runStudioVoiceCatalogSync({
      apiKey: "",
      db,
      loadAccount: async () => {
        throw new Error("should not load");
      },
      async *loadSharedPages() {
        yield [];
      },
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.providerRequests, 0);
    assert.equal(runningChecks, 0);

    const failed = await runStudioVoiceCatalogSync({
      apiKey: "test-key",
      db,
      loadAccount: async () => [entry("voice-a", "en", "https://example.com/a.mp3")],
      async *loadSharedPages() {
        yield [entry("voice-b", "nl", "https://example.com/b.mp3")];
      },
    });
    assert.equal(failed.status, "failed");
    assert.equal(failed.upserted, 1);
    assert.equal(upserts, 2);
  });

  it("refuses a second sync while one is running", async () => {
    let upserts = 0;
    const db: VoiceCatalogSyncClient = {
      async findLastCompleted() {
        return null;
      },
      async findRunning() {
        return { id: "run-live", status: "running", startedAt: new Date() };
      },
      async startRun() {
        throw new Error("should not start");
      },
      async finishRun() {
        throw new Error("should not finish");
      },
      async upsert() {
        upserts += 1;
      },
    };
    const result = await runStudioVoiceCatalogSync({
      apiKey: "test-key",
      db,
      loadAccount: async () => [],
      async *loadSharedPages() {
        yield [];
      },
    });
    assert.equal(result.status, "already_running");
    assert.equal(result.providerRequests, 0);
    assert.equal(upserts, 0);
  });

  it("skips a new provider crawl inside the configured interval", async () => {
    const db: VoiceCatalogSyncClient = {
      async findLastCompleted() {
        return { finishedAt: new Date() };
      },
      async findRunning() {
        throw new Error("should not look for a running sync");
      },
      async startRun() {
        throw new Error("should not start");
      },
      async finishRun() {
        throw new Error("should not finish");
      },
      async upsert() {
        throw new Error("should not upsert");
      },
    };
    const result = await runStudioVoiceCatalogSync({
      apiKey: "test-key",
      db,
      intervalMs: 60_000,
      loadAccount: async () => {
        throw new Error("should not load");
      },
      async *loadSharedPages() {
        yield [];
      },
    });
    assert.equal(result.status, "skipped");
    assert.equal(result.providerRequests, 0);
  });
});
