import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const MODULES = ["editor", "studio", "motion", "publish", "projects", "library", "usage"] as const;

describe("studio page intro", () => {
  it("component exposes title, description, optional eyebrow and actions", () => {
    const source = readFileSync("src/components/suite/studio-page-intro.tsx", "utf8");
    assert.match(source, /data-testid="studio-page-intro"/);
    assert.match(source, /title/);
    assert.match(source, /description/);
    assert.match(source, /eyebrow/);
    assert.match(source, /actions/);
  });

  it("landing pages use StudioPageIntro with module descriptions", () => {
    const landingSource = readFileSync("src/components/suite/studio-product-landing-page.tsx", "utf8");
    const projectsSource = readFileSync("src/components/projects/homecheff-project-hub.tsx", "utf8");
    assert.match(landingSource, /StudioPageIntro/);
    assert.match(landingSource, /suite\.pageIntro\.\$\{config\.moduleKey\}\.description/);
    assert.match(projectsSource, /suite\.pageIntro\.projects\.description/);
  });

  for (const moduleKey of MODULES) {
    it(`has page intro copy for ${moduleKey} in NL and EN`, () => {
      const key = `suite.pageIntro.${moduleKey}.description` as keyof typeof nl;
      assert.ok(nl[key]?.length);
      assert.ok(en[key]?.length);
    });
  }
});
