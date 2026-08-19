import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  PX2_CTA_VOCABULARY,
  PX2_PRESERVED_ROUTES,
  PX2_PRODUCT_BRAND,
  px2Cta,
  px2Term,
} from "@/lib/studio-px2-terminology";
import { buildSuiteGlobalNavItems, buildSuiteToolNavItems } from "@/lib/homecheff-primary-nav-config";
import {
  STUDIO_PRODUCT_LANDING_CONFIG,
} from "@/lib/studio-product-landing-config";
import {
  UNIVERSE_GUIDED_CREATION_PATH,
  resolveUniversePlanetLabel,
  resolveUniversePrimaryCtaHref,
  resolveUniverseStartProjectHref,
} from "@/lib/universe-public-landing";

describe("PX.2 terminology contract", () => {
  it("keeps HomeCheff Studio as the product brand", () => {
    assert.equal(PX2_PRODUCT_BRAND, "HomeCheff Studio");
    assert.equal(nl["brand.studio.name"], "HomeCheff Studio");
    assert.equal(en["brand.studio.name"], "HomeCheff Studio");
  });

  it("does not expose Universe, FrameFlow, or Motion Studio to normal NL UI", () => {
    assert.equal(nl["studio.home.title"], px2Term("studioHome").nl);
    assert.notEqual(nl["studio.home.title"], "Motion Studio");
    assert.doesNotMatch(nl["universe.hero.welcomeSignedOut"], /Universe/i);
    assert.equal(px2Term("frameflow").surface, "internal");
    assert.equal(px2Term("home").nl, "Home");
  });

  it("uses outcome nav labels instead of internal suite architecture names", () => {
    assert.equal(nl["suite.nav.home"], "Home");
    assert.equal(nl["suite.nav.editor"], px2Term("images").nl);
    assert.equal(nl["suite.nav.studio"], px2Term("stories").nl);
    assert.equal(nl["suite.nav.motion"], px2Term("animation").nl);
    assert.equal(nl["suite.nav.publish"], px2Term("finishVideo").nl);
    assert.equal(nl["nav.motion"], px2Term("animation").nl);
  });

  it("keeps suite product destinations unchanged in Meer tools", () => {
    const tools = buildSuiteToolNavItems();
    assert.equal(tools.find((item) => item.productId === "editor")?.href, "/editor");
    assert.equal(tools.find((item) => item.labelKey === "suite.nav.studio")?.href, "/studio");
    assert.equal(tools.find((item) => item.productId === "motion")?.href, "/motion");
    assert.equal(tools.find((item) => item.productId === "presentation")?.href, "/publish");
    assert.equal(buildSuiteGlobalNavItems().find((item) => item.labelKey === "suite.slice1a.nav.studio")?.href, "/studio");
  });

  it("maps planet chrome to outcome words, not EDITOR/MOTION", () => {
    assert.equal(resolveUniversePlanetLabel("editor"), "BEELDEN");
    assert.equal(resolveUniversePlanetLabel("studio"), "VERHALEN");
    assert.equal(resolveUniversePlanetLabel("motion"), "ANIMATIE");
    assert.equal(resolveUniversePlanetLabel("publish"), "AFRONDEN");
    assert.equal(resolveUniversePlanetLabel("library"), "BIBLIOTHEEK");
  });

  it("uses human NL for story, objects, style world, files, traits, help, suggestions", () => {
    assert.equal(nl["studio.shell.newStory"], px2Cta("newStory").nl);
    assert.equal(nl["studio.start.newStory"], px2Cta("newStory").nl);
    assert.equal(nl["studio.feature.props.title"], px2Term("objects").nl);
    assert.equal(nl["studio.tools.props"], px2Term("objects").nl);
    assert.equal(nl["studio.feature.worlds.title"], "Stijlwerelden");
    assert.equal(nl["studio.tools.world"], px2Term("styleWorld").nl);
    assert.equal(nl["studio.feature.assets.title"], px2Term("files").nl);
    assert.equal(nl["studio.memory.tabTitle"], px2Term("traits").nl);
    assert.equal(nl["studio.tools.consistency"], px2Term("sameLook").nl);
    assert.equal(nl["assistant.title"], px2Term("help").nl);
    assert.equal(nl["studioCopilot.title"], px2Term("help").nl);
    assert.equal(nl["studio.directorV2.shell.title"], px2Term("suggestions").nl);
    assert.equal(nl["studio.shell.aiDirector"], px2Term("suggestions").nl);
  });

  it("keeps Director as an advanced mode label", () => {
    assert.equal(nl["studio.creativeDirector.mode.DIRECTOR"], "Director");
    assert.equal(en["studio.creativeDirector.mode.DIRECTOR"], "Director");
  });
});

describe("PX.2 start-action vocabulary", () => {
  it("does not reuse one start verb for unrelated destinations", () => {
    const byNl = new Map<string, string[]>();
    for (const cta of PX2_CTA_VOCABULARY) {
      if (!cta.destination) continue;
      const current = byNl.get(cta.nl) ?? [];
      current.push(cta.destination);
      byNl.set(cta.nl, current);
    }
    for (const [label, destinations] of byNl) {
      assert.equal(
        new Set(destinations).size,
        1,
        `CTA "${label}" points at multiple destinations: ${destinations.join(", ")}`
      );
    }
  });

  it("home primary start still opens the existing experience chooser", () => {
    assert.equal(resolveUniverseStartProjectHref(false), UNIVERSE_GUIDED_CREATION_PATH);
    assert.equal(resolveUniversePrimaryCtaHref(true), UNIVERSE_GUIDED_CREATION_PATH);
    assert.equal(nl["universe.hero.cta.startProject"], px2Cta("chooseIntent").nl);
    assert.equal(nl["universe.hero.cta.startWithIdea"], px2Cta("chooseIntent").nl);
    assert.equal(nl["studio.experience.chooser.title"], px2Cta("chooseIntent").nl);
  });

  it("product landings use destination-honest CTA keys without changing hrefs", () => {
    assert.equal(STUDIO_PRODUCT_LANDING_CONFIG.editor.primaryCtaHref, "/editor/start");
    assert.equal(STUDIO_PRODUCT_LANDING_CONFIG.studio.primaryCtaHref, "/studio/storyboards/new");
    assert.equal(STUDIO_PRODUCT_LANDING_CONFIG.motion.primaryCtaHref, "/motion/start");
    assert.equal(STUDIO_PRODUCT_LANDING_CONFIG.publish.primaryCtaHref, "/publish/start");
    assert.equal(nl[STUDIO_PRODUCT_LANDING_CONFIG.editor.primaryCtaKey], "Start met bewerken");
    assert.equal(nl[STUDIO_PRODUCT_LANDING_CONFIG.studio.primaryCtaKey], px2Cta("newStory").nl);
    assert.equal(nl[STUDIO_PRODUCT_LANDING_CONFIG.motion.primaryCtaKey], px2Cta("startAnimation").nl);
    assert.equal(nl[STUDIO_PRODUCT_LANDING_CONFIG.publish.primaryCtaKey], px2Cta("finishVideo").nl);
  });

  it("getting-started Editor CTA is wired to /editor, not the experience chooser", () => {
    const source = readFileSync(
      "src/components/suite/universe/universe-home-getting-started.tsx",
      "utf8"
    );
    assert.match(source, /href="\/editor"/);
    assert.match(source, /universe\.home\.gettingStarted\.openEditor/);
    assert.equal(nl["universe.home.gettingStarted.openEditor"], px2Cta("editImages").nl);
  });

  it("preserves existing creation routes for later PX phases", () => {
    for (const route of PX2_PRESERVED_ROUTES) {
      assert.ok(route.startsWith("/"));
    }
  });
});

describe("PX.2 NL-first accidental English", () => {
  it("removes Choose an experience and Create. Animate. Publish. from NL", () => {
    assert.notEqual(nl["marketing.positioning.tagline"], "Create. Animate. Publish.");
    assert.notEqual(nl["suite.home.headline"], "Create. Animate. Publish.");
    assert.match(nl["marketing.positioning.tagline"], /[à-ÿA-Za-z]/);
    const funnel = readFileSync(
      "src/components/studio/studio-experience-pack-funnel.tsx",
      "utf8"
    );
    assert.doesNotMatch(funnel, /Choose an experience/);
    assert.doesNotMatch(funnel, /Browse experiences/);
  });
});
