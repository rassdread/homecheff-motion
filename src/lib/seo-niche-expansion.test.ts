import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

const NICHE_DOCS = [
  "docs/SEO_NICHE_EXPANSION_ROADMAP.md",
  "docs/SEO_NICHE_KEYWORD_MAP.md",
  "docs/SEO_NICHE_INTERNAL_LINKING.md",
  "docs/SEO_NICHE_CONTENT_CALENDAR.md",
] as const;

const REQUIRED_PILLARS = [
  "Families & Kids",
  "Authors & Storytellers",
  "Education",
  "Gaming & RPG",
  "Musicians & Artists",
  "Small Business Marketing",
  "Hobby Communities",
  "Memories & Family History",
  "Entertainment & Animation",
  "Community Projects",
] as const;

const P0_LANDINGS = [
  "child-drawing-to-animation",
  "create-a-cartoon-from-a-drawing",
  "personalized-childrens-story",
  "book-to-trailer",
  "story-to-video",
  "visualize-your-novel",
  "create-your-own-cartoon",
  "create-your-own-anime",
  "create-your-own-animated-series",
  "become-your-own-director",
  "product-photo-to-video",
  "social-content-with-ai",
  "ai-marketing-team",
] as const;

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

describe("SEO niche expansion sprint", () => {
  it("deliverable documents exist with substantive content", () => {
    for (const doc of NICHE_DOCS) {
      const content = read(doc);
      assert.ok(content.length > 2_000, `${doc} should be substantive`);
    }
  });

  it("defines 10+ niche SEO pillars", () => {
    const roadmap = read("docs/SEO_NICHE_EXPANSION_ROADMAP.md");
    for (const pillar of REQUIRED_PILLARS) {
      assert.match(roadmap, new RegExp(pillar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("maps 50+ landing page opportunities", () => {
    const map = read("docs/SEO_NICHE_KEYWORD_MAP.md");
    const landingRows = countMatches(map, /`[a-z0-9-]+`/g);
    assert.ok(landingRows >= 50, `expected >= 50 landing slugs, got ${landingRows}`);
    assert.match(map, /58 landings/);
  });

  it("maps 100+ help article opportunities", () => {
    const map = read("docs/SEO_NICHE_KEYWORD_MAP.md");
    assert.match(map, /112 help/);
    const helpSections = countMatches(map, /### Help cluster/g);
    assert.ok(helpSections >= 10, "help clusters per pillar");
  });

  it("includes internal linking strategy and conversion paths", () => {
    const linking = read("docs/SEO_NICHE_INTERNAL_LINKING.md");
    assert.match(linking, /Studio conversion/i);
    assert.match(linking, /Cross-pillar linking/i);
    assert.match(linking, /\/studio\/storyboards\/new/);
    for (const landing of P0_LANDINGS) {
      assert.ok(
        linking.includes(landing) || read("docs/SEO_NICHE_KEYWORD_MAP.md").includes(landing),
        `missing linking or map entry for ${landing}`
      );
    }
  });

  it("includes content calendar with waves and publishing order", () => {
    const calendar = read("docs/SEO_NICHE_CONTENT_CALENDAR.md");
    assert.match(calendar, /Wave 1/);
    assert.match(calendar, /Wave 4/);
    assert.match(calendar, /Priority publish order/i);
    assert.match(calendar, /58 landings/);
  });

  it("documents HomeCheff differentiation on niche pages", () => {
    const roadmap = read("docs/SEO_NICHE_EXPANSION_ROADMAP.md");
    const advantages = [
      "Story-first workflow",
      "AI director workflow",
      "Reusable characters",
      "Reusable worlds",
      "Automatic subtitles",
      "Automatic translation",
      "Asset library",
      "Project management",
      "Motion generation",
    ];
    for (const item of advantages) {
      assert.match(roadmap, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
    assert.match(roadmap, /Idea → World → Characters/i);
  });

  it("enforces trademark guardrails for major studios", () => {
    for (const doc of NICHE_DOCS) {
      const content = read(doc);
      assert.match(content, /trademark|Trademark|not affiliated|inspirational/i);
      assert.doesNotMatch(content, /Netflix-quality|Disney-approved|official Pixar/i);
    }
  });

  it("covers Creator Dream SEO expansion intents", () => {
    const roadmap = read("docs/SEO_NICHE_EXPANSION_ROADMAP.md");
    const intents = [
      "Bring drawings to life",
      "Sketch to animation",
      "Idea to video",
      "Book to trailer",
      "Become filmmaker",
      "Become your own director",
      "Content team with AI",
    ];
    for (const intent of intents) {
      assert.match(roadmap, new RegExp(intent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
  });

  it("keyword map includes priority traffic and conversion scoring", () => {
    const map = read("docs/SEO_NICHE_KEYWORD_MAP.md");
    assert.match(map, /Priority/);
    assert.match(map, /Traffic/);
    assert.match(map, /Conversion/);
    assert.match(map, /Top 20 by composite score/i);
  });
});
