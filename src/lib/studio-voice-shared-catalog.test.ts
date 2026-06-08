import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyVoiceAccent, filterVoiceLibrary } from "@/lib/studio-voice-accent-model";
import {
  ElevenLabsVoiceAccessDeniedError,
  isElevenLabsVoiceAccessDenied,
} from "@/lib/elevenlabs-voice";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import {
  fetchElevenLabsSharedVoices,
  mapElevenLabsSharedVoice,
  mergeAccountAndSharedVoices,
  normalizeSharedAccent,
  type ElevenLabsSharedVoiceRow,
} from "@/lib/studio-voice-shared-catalog";

describe("studio-voice-shared-catalog", () => {
  it("maps shared voice accent and language fields", () => {
    const voice = mapElevenLabsSharedVoice({
      voice_id: "shared-british-1",
      name: "Oliver - British Chef",
      accent: "british",
      language: "en",
      gender: "male",
      age: "middle_aged",
      category: "professional",
      description: "Warm British narrator",
      preview_url: "https://example.com/british.mp3",
    });
    assert.ok(voice);
    assert.equal(voice!.id, "shared-british-1");
    assert.equal(voice!.accent, "british");
    assert.equal(voice!.language, "en");
    assert.equal(voice!.category, "professional");
    assert.equal(voice!.labels.catalog_source, "shared");
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "english.british");
  });

  it("maps standard accent with nl language to dutch", () => {
    const accent = normalizeSharedAccent({
      rawAccent: "standard",
      language: "nl",
      name: "Sanne",
      description: "Dutch grower voice",
    });
    assert.equal(accent, "dutch");

    const voice = mapElevenLabsSharedVoice({
      voice_id: "shared-dutch-1",
      name: "Sanne - Dutch Grower",
      accent: "standard",
      language: "nl",
      gender: "female",
      category: "professional",
      description: "Dutch narration",
    });
    assert.ok(voice);
    assert.equal(voice!.language, "nl");
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "dutch.nederlands");
  });

  it("dedupes account voice over shared voice on same id", () => {
    const account = [
      {
        id: "dup-id",
        name: "Account Name",
        accent: "american",
        gender: "male",
        age: "young",
        language: "en",
        description: "",
        labels: { accent: "american", catalog_source: "account" },
        previewUrl: "https://example.com/account.mp3",
        category: "premade",
      },
    ];
    const shared = [
      {
        id: "dup-id",
        name: "Shared Name",
        accent: "american",
        gender: "male",
        age: "young",
        language: "en",
        description: "Shared description",
        labels: { accent: "american", catalog_source: "shared" },
        previewUrl: "https://example.com/shared.mp3",
        category: "professional",
      },
    ];

    const merged = mergeAccountAndSharedVoices(account, shared);
    assert.equal(merged.dedupeCount, 1);
    assert.equal(merged.voices.length, 1);
    assert.equal(merged.voices[0]!.name, "Account Name");
    assert.equal(merged.voices[0]!.previewUrl, "https://example.com/account.mp3");
    assert.equal(merged.voices[0]!.labels.catalog_source, "account");
  });

  it("paginates shared voices until max limit", async () => {
    const pages: ElevenLabsSharedVoiceRow[][] = [
      Array.from({ length: 100 }, (_, index) => ({
        voice_id: `page0-${index}`,
        name: `Voice ${index}`,
        accent: "american",
        language: "en",
        category: "professional",
      })),
      Array.from({ length: 50 }, (_, index) => ({
        voice_id: `page1-${index}`,
        name: `Voice B ${index}`,
        accent: "british",
        language: "en",
        category: "professional",
      })),
    ];

    const fetchFn = async (url: string | URL | Request) => {
      const href = typeof url === "string" ? url : url.toString();
      const page = href.includes("page=1") ? 1 : 0;
      return new Response(
        JSON.stringify({
          voices: pages[page],
          has_more: page === 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchElevenLabsSharedVoices("test-key", {
      maxVoices: 120,
      pageSize: 100,
      fetchFn,
    });

    assert.equal(result.fetched, 120);
    assert.equal(result.paginationLimited, false);
    assert.equal(result.voices.length, 120);
  });

  it("marks paginationLimited when more shared voices remain", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          voices: Array.from({ length: 100 }, (_, index) => ({
            voice_id: `voice-${index}`,
            name: `Voice ${index}`,
            accent: "american",
            language: "en",
            category: "professional",
          })),
          has_more: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    const result = await fetchElevenLabsSharedVoices("test-key", {
      maxVoices: 50,
      pageSize: 100,
      fetchFn,
    });

    assert.equal(result.fetched, 50);
    assert.equal(result.paginationLimited, true);
  });

  it("matches persona presets to shared british and jamaican voices", () => {
    const catalog = {
      version: 1 as const,
      source: "elevenlabs" as const,
      fetchedAt: new Date().toISOString(),
      voices: [
        {
          id: "british-shared",
          name: "Oliver",
          accent: "british",
          gender: "male",
          age: "middle aged",
          language: "en",
          description: "",
          labels: { accent: "british", gender: "male", language: "en", catalog_source: "shared" },
          previewUrl: "https://example.com/oliver.mp3",
          category: "professional",
        },
        {
          id: "jamaican-shared",
          name: "Marcus",
          accent: "jamaican",
          gender: "male",
          age: "young",
          language: "en",
          description: "Jamaican street chef",
          labels: { accent: "jamaican", gender: "male", language: "en", catalog_source: "shared" },
          previewUrl: "https://example.com/marcus.mp3",
          category: "professional",
        },
      ],
    };

    const presets = buildVoicePersonaPresets(catalog);
    const british = presets.find((p) => p.id === "british_chef");
    const jamaican = presets.find((p) => p.id === "jamaican_street_chef");
    assert.ok(british?.available);
    assert.equal(british!.voiceId, "british-shared");
    assert.ok(jamaican?.available);
    assert.equal(jamaican!.voiceId, "jamaican-shared");
  });

  it("keeps persona unavailable when no real accent match exists", () => {
    const catalog = {
      version: 1 as const,
      source: "elevenlabs" as const,
      fetchedAt: new Date().toISOString(),
      voices: [
        {
          id: "american-only",
          name: "Generic",
          accent: "american",
          gender: "male",
          age: "young",
          language: "en",
          description: "",
          labels: { accent: "american", catalog_source: "shared" },
          previewUrl: "",
          category: "professional",
        },
      ],
    };
    const presets = buildVoicePersonaPresets(catalog);
    assert.equal(presets.find((p) => p.id === "jamaican_street_chef")?.available, false);
    assert.equal(presets.find((p) => p.id === "dutch_grower")?.available, false);
  });

  it("search finds shared voice by accent query", () => {
    const catalog = {
      version: 1 as const,
      source: "elevenlabs" as const,
      fetchedAt: new Date().toISOString(),
      voices: [
        {
          id: "jamaican-shared",
          name: "Marcus",
          accent: "jamaican",
          gender: "male",
          age: "young",
          language: "en",
          description: "Caribbean chef",
          labels: { accent: "jamaican", catalog_source: "shared" },
          previewUrl: "",
          category: "professional",
        },
      ],
    };
    const matches = filterVoiceLibrary(catalog, { query: "jamaican" });
    assert.equal(matches.length, 1);
    assert.equal(matches[0]!.id, "jamaican-shared");
  });

  it("mock catalog fallback remains unchanged", () => {
    const catalog = mockVoiceLibraryCatalog();
    assert.equal(catalog.source, "mock");
    assert.ok(catalog.voices.length >= 18);
    assert.equal(catalog.ingestion, undefined);
  });

  it("detects ElevenLabs voice access denied errors", () => {
    assert.equal(isElevenLabsVoiceAccessDenied(403, "missing_permissions"), true);
    assert.equal(isElevenLabsVoiceAccessDenied(200, "ok"), false);
    const err = new ElevenLabsVoiceAccessDeniedError();
    assert.equal(err.code, "VOICE_LIBRARY_ACCESS_DENIED");
  });
});
