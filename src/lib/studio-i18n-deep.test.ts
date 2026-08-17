import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";
import { getTranslator } from "@/i18n";

const STUDIO_PREFIXES = [
  "studio.shell.",
  "studio.start.",
  "studio.tools.",
  "studio.workspace.",
  "studio.directorV2.",
  "maak.",
];

const FORBIDDEN_EN_IN_NL = [
  "Characters",
  "Locations",
  "Director Console",
  "Inspector",
  "Story Purpose",
  "Suggest direction",
  "Thumbnail",
  "Workspace",
  "Handoff",
  "Storyboard",
  "Introduction",
  "Problem",
  "Discovery",
  "Transformation",
  "Solution",
  "Happy",
  "Calm",
  "Excited",
  "Dramatic",
  "Curious",
  "Save failed",
  "Generation failed",
];

const FORBIDDEN_NL_IN_EN = [
  "Personages",
  "Locaties",
  "Verhaaleditor",
  "Maak video",
  "Ondertitels",
  "Vertalen",
  "Mijn videoverhalen",
  "Nieuw verhaal",
  "Wat wil je maken",
  "Verhaaldoel",
  "Projectanalyse",
  "Introductie",
  "Ontdekking",
  "Oplossing",
  "Blij",
  "Rustig",
  "Enthousiast",
  "Nieuwsgierig",
];

function studioKeys(locale: Record<string, string>): string[] {
  return Object.keys(locale).filter((key) =>
    STUDIO_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectTsxFiles(full));
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("Studio deep i18n", () => {
  it("has nl/en parity for studio-facing key prefixes", () => {
    const nlKeys = studioKeys(nl).sort();
    const enKeys = studioKeys(en).sort();
    assert.deepEqual(nlKeys, enKeys);
  });

  it("uses canonical NL director labels", () => {
    assert.equal(nl["studio.directorV2.shell.title"], "Suggesties");
    assert.equal(nl["studio.directorV2.inspector.title"], "Projectanalyse");
    assert.equal(nl["studio.directorV2.director.storyPurpose"], "Verhaaldoel");
    assert.equal(nl["studio.directorV2.director.suggestDirection"], "Regie voorstellen");
    assert.equal(nl["studio.workspace.scenes"], "Scènes");
  });

  it("uses canonical EN director labels", () => {
    assert.equal(en["studio.directorV2.shell.title"], "Suggestions");
    assert.equal(en["studio.directorV2.inspector.title"], "Project analysis");
    assert.equal(en["studio.directorV2.director.storyPurpose"], "Story purpose");
    assert.equal(en["studio.directorV2.director.suggestDirection"], "Suggest direction");
  });

  it("translates story purpose option labels", () => {
    const tNl = getTranslator("nl");
    const tEn = getTranslator("en");
    assert.equal(tNl("studio.directorV2.purpose.introduction"), "Introductie");
    assert.equal(tEn("studio.directorV2.purpose.introduction"), "Introduction");
    assert.equal(tNl("studio.directorV2.purpose.finale"), "Finale");
    assert.equal(tEn("studio.directorV2.purpose.finale"), "Finale");
  });

  it("translates emotion card labels", () => {
    const tNl = getTranslator("nl");
    const tEn = getTranslator("en");
    assert.equal(tNl("studio.directorV2.emotion.card.happy"), "Blij");
    assert.equal(tEn("studio.directorV2.emotion.card.happy"), "Happy");
    assert.equal(tNl("studio.directorV2.emotion.card.curious"), "Nieuwsgierig");
    assert.equal(tEn("studio.directorV2.emotion.card.curious"), "Curious");
  });

  it("translates camera shot labels in nl", () => {
    const tNl = getTranslator("nl");
    assert.equal(tNl("studio.director.shot.wide"), "Breed shot");
    assert.equal(tNl("studio.director.shot.detail_shot"), "Detailshot");
    assert.equal(tNl("studio.directorV2.camera.shot.extreme_wide"), "Extreem breed");
  });

  it("translates status labels", () => {
    const tNl = getTranslator("nl");
    const tEn = getTranslator("en");
    assert.equal(tNl("studio.jobs.status.running"), "Bezig");
    assert.equal(tEn("studio.jobs.status.running"), "Running");
    assert.equal(tNl("studio.jobs.status.completed"), "Voltooid");
    assert.equal(tEn("studio.jobs.status.completed"), "Completed");
    assert.equal(tNl("studio.jobs.status.failed"), "Mislukt");
    assert.equal(tEn("studio.jobs.status.failed"), "Failed");
    assert.equal(tNl("studio.aiAssistant.readiness.level.needsWork"), "Nog werk nodig");
    assert.equal(tEn("studio.aiAssistant.readiness.level.needsWork"), "Needs work");
    assert.equal(tNl("studio.badge.comingSoon"), "Binnenkort");
    assert.equal(tEn("studio.badge.comingSoon"), "Coming soon");
    assert.equal(tNl("studio.movieBuilder.readiness.ready"), "Klaar");
    assert.equal(tEn("studio.movieBuilder.readiness.ready"), "Ready");
  });

  it("avoids forbidden English UI terms in nl studio strings", () => {
    const hits: string[] = [];
    for (const key of studioKeys(nl)) {
      const value = nl[key as keyof typeof nl];
      for (const term of FORBIDDEN_EN_IN_NL) {
        if (value.includes(term)) {
          hits.push(`${key}: ${term}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("avoids forbidden Dutch UI terms in en studio strings", () => {
    const hits: string[] = [];
    for (const key of studioKeys(en)) {
      const value = en[key as keyof typeof en];
      for (const term of FORBIDDEN_NL_IN_EN) {
        if (value.includes(term)) {
          hits.push(`${key}: ${term}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("scans studio components for common hardcoded UI literals", () => {
    const root = join(process.cwd(), "src/components/studio");
    const patterns = [
      /name: "(Production|Movie builder|Worlds|Assets|Asset registry)"/,
      /"Save failed"/,
      /"Generation failed"/,
      />Thumbnail</,
      />Inspector</,
      />Director Console</,
    ];
    const hits: string[] = [];
    for (const file of collectTsxFiles(root)) {
      const src = readFileSync(file, "utf8");
      for (const pattern of patterns) {
        if (pattern.test(src)) {
          hits.push(`${file.replace(process.cwd() + "/", "")}: ${pattern}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });
});
