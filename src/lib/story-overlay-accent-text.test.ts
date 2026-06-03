import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import {
  applyAccentHighlightsToAssLine,
  resolveSceneAccentWords,
  tokenizeAccentPhrase,
} from "@/lib/story-overlay-accent-text";
import { normalizeSceneText } from "@/lib/story-overlay-templates";
import { defaultV2OverlayTheme } from "@/server/animation-export/adaptive-overlay-style";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

const GOLD = defaultV2OverlayTheme().accentColorAss;
const PRIMARY = defaultV2OverlayTheme().primaryColorAss;

describe("story overlay accent text", () => {
  it("matches all caps words case-insensitively", () => {
    const out = applyAccentHighlightsToAssLine("HIDDEN TALENT", ["talent"], {
      primaryColorAss: PRIMARY,
      accentColorAss: GOLD,
    });
    assert.match(out, /\\c&H0000B7F5&/i);
    assert.match(out, /TALENT/);
  });

  it("matches title case words", () => {
    const out = applyAccentHighlightsToAssLine("Hidden Talent", ["TALENT"], {
      primaryColorAss: PRIMARY,
      accentColorAss: GOLD,
    });
    assert.match(out, /\\c&H0000B7F5&/i);
    assert.match(out, /Talent/);
  });

  it("matches multi-word phrases", () => {
    const out = applyAccentHighlightsToAssLine("trade time for money", ["time for"], {
      primaryColorAss: PRIMARY,
      accentColorAss: GOLD,
    });
    assert.match(out, /time for/);
    assert.match(out, /\\c&H0000B7F5&/i);
  });

  it("matches words with punctuation adjacent", () => {
    const out = applyAccentHighlightsToAssLine("Hello, MONEY!", ["money"], {
      primaryColorAss: PRIMARY,
      accentColorAss: GOLD,
    });
    assert.match(out, /MONEY/);
    assert.match(out, /\\c&H0000B7F5&/i);
    assert.match(out, /,/);
  });

  it("tokenizeAccentPhrase strips punctuation from tokens", () => {
    assert.deepEqual(tokenizeAccentPhrase("time, for"), ["TIME", "FOR"]);
  });

  it("resolveSceneAccentWords prefers manual accent list", () => {
    const scene = normalizeSceneText({
      template: "scene",
      accentWords: ["Earn", "Talent"],
    });
    assert.deepEqual(resolveSceneAccentWords(scene, "ignored"), ["EARN", "TALENT"]);
  });

  it("burns highlight into titleBeats ASS dialogue", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "ROTTERDAM",
          titleBeats: ["Hidden Talent"],
          subtitleBeats: ["is everywhere."],
          accentWords: ["Talent"],
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /HIDDEN TALENT|Hidden Talent|TALENT/);
    assert.match(ass, /\\c&H0000B7F5&/i);
  });

  it("burns highlight into subtitleBeats ASS dialogue", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "CITY",
          titleBeats: ["Main title"],
          subtitleBeats: ["everywhere."],
          accentWords: ["everywhere"],
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /everywhere/);
    assert.match(ass, /\\c&H0000B7F5&/i);
  });

  it("text rerender payload keeps accentWords", () => {
    const draft = {
      ...emptySceneTextDraft(),
      heroText: "HEAD",
      title: "Hidden Talent",
      accentWords: "Talent, Money",
    };
    const payload = instantSceneTextFromDraft(draft, 0, 1);
    assert.deepEqual(payload.accentWords, ["Talent", "Money"]);
  });

  it("custom layer title color does not override highlight accent color", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEAD",
          titleBeats: ["Hidden Talent"],
          accentWords: ["Talent"],
          overlayLayerStyles: {
            title: { textColor: "#00FF00" },
          },
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /\\c&H0000B7F5&/i);
    assert.match(ass, /&H00FF00&|&H0000FF00&/i);
  });

  it("title and subtitle font sizes stay independent with layer styles", () => {
    const baseline = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEAD",
          titleBeats: ["Title line"],
          subtitleBeats: ["Subtitle line"],
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const customized = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEAD",
          titleBeats: ["Title line"],
          subtitleBeats: ["Subtitle line"],
          overlayLayerStyles: {
            title: { fontSize: "smaller" },
            subtitle: { fontSize: "larger" },
          },
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const baseTitle = Number(baseline.match(/HCStoryTitle_s0,Arial,(\d+)/)?.[1]);
    const baseSubtitle = Number(baseline.match(/HCStorySubtitle_s0,Arial,(\d+)/)?.[1]);
    const customTitle = Number(customized.match(/HCStoryTitle_s0,Arial,(\d+)/)?.[1]);
    const customSubtitle = Number(customized.match(/HCStorySubtitle_s0,Arial,(\d+)/)?.[1]);
    assert.ok(customTitle < baseTitle);
    assert.ok(customSubtitle > baseSubtitle);
  });

  it("headline and title colors stay independent with layer styles", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [
        {
          template: "scene",
          heroText: "HEADLINE",
          titleBeats: ["Title line"],
          accentWords: ["Title"],
          overlayLayerStyles: {
            headline: { textColor: "#FF0000" },
            title: { textColor: "#0000FF" },
          },
        },
      ],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    const headlineStyle = ass
      .split("\n")
      .find((line) => line.startsWith("Style: HCStoryHeadline_s0"));
    const titleStyle = ass
      .split("\n")
      .find((line) => line.startsWith("Style: HCStoryTitle_s0"));
    assert.ok(headlineStyle && titleStyle);
    assert.notEqual(headlineStyle, titleStyle);
    assert.match(ass, /\\c&H0000B7F5&/i);
  });
});
