import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import { isHomeCheffAssistantRoute } from "@/lib/homecheff-assistant-flag";
import { buildSuiteGlobalNavItems } from "@/lib/homecheff-primary-nav-config";
import { PHOTO_VIDEO_MUSIC_CATALOG_STATUS } from "@/lib/photo-video/music-catalog";
import {
  STUDIO_HOME_ADVANCED_HREF,
  STUDIO_HOME_CONTINUE_MAX,
  STUDIO_HOME_INTENTS,
  studioHomeIntent,
  studioHcContextualIntents,
} from "@/lib/studio-slice1a-home";
import {
  studioLandingHasDeepLink,
  studioRouteNeedsRootPage,
} from "@/lib/studio-product-landing-routes";

describe("Slice 1A — Unified Studio front door", () => {
  it("exposes four primary creation intents with correct routes", () => {
    assert.equal(STUDIO_HOME_INTENTS.length, 4);
    assert.equal(studioHomeIntent("quickVideo").href, "/studio/photo-video");
    assert.equal(studioHomeIntent("image").href, "/editor/start");
    assert.equal(studioHomeIntent("aiVideo").href, "/studio/experience");
    assert.equal(studioHomeIntent("animation").href, "/motion/start");
    assert.equal(studioHomeIntent("quickVideo").free, true);
    assert.equal(studioHomeIntent("aiVideo").usesCredits, true);
  });

  it("has NL/EN labels without Director or Orchestrator jargon on home", () => {
    for (const intent of STUDIO_HOME_INTENTS) {
      assert.ok(nl[intent.titleKey].trim());
      assert.ok(en[intent.titleKey].trim());
      assert.doesNotMatch(nl[intent.titleKey], /Director|Orchestrator|Storyboard/i);
      assert.doesNotMatch(en[intent.titleKey], /Director|Orchestrator|Storyboard/i);
    }
    assert.equal(nl["studio.slice1a.intent.quickVideo.title"], "Snelle video");
    assert.equal(en["studio.slice1a.intent.quickVideo.title"], "Quick video");
    assert.match(nl["studio.slice1a.free.onDevice"], /Gratis op je apparaat/);
    assert.match(en["studio.slice1a.free.noCredits"], /No credits needed/);
  });

  it("limits continue section to three items", () => {
    assert.equal(STUDIO_HOME_CONTINUE_MAX, 3);
  });

  it("simplifies global nav to Studio, projects, and account", () => {
    const global = buildSuiteGlobalNavItems();
    assert.equal(global.length, 3);
    assert.deepEqual(
      global.map((item) => item.labelKey),
      ["suite.slice1a.nav.studio", "suite.slice1a.nav.projects", "suite.slice1a.nav.account"]
    );
    assert.equal(global.find((item) => item.href === "/studio")?.labelKey, "suite.slice1a.nav.studio");
    assert.equal(nl["suite.slice1a.nav.projects"], "Mijn projecten");
    assert.equal(en["suite.slice1a.nav.projects"], "My projects");
  });

  it("redirects /studio/start to /studio while preserving workspace and workflow context", () => {
    const startPage = readFileSync("src/app/studio/start/page.tsx", "utf8");
    assert.match(startPage, /router\.replace\(qs \? `\/studio\?\$\{qs\}` : "\/studio"\)/);
    assert.equal(studioLandingHasDeepLink(new URLSearchParams("storyboardId=abc")), true);
    assert.equal(studioRouteNeedsRootPage(new URLSearchParams("storyboardId=abc")), true);
    assert.equal(studioRouteNeedsRootPage(new URLSearchParams("intent=product")), true);
    assert.equal(studioRouteNeedsRootPage(new URLSearchParams("idea=hello")), true);
    assert.equal(studioRouteNeedsRootPage(new URLSearchParams("")), false);
  });

  it("renders unified home on /studio without deep links", () => {
    const landing = readFileSync("src/components/suite/studio-landing-route.tsx", "utf8");
    assert.match(landing, /StudioUnifiedHomePage/);
    assert.match(landing, /studioRouteNeedsRootPage/);
    const home = readFileSync("src/components/studio/studio-unified-home-page.tsx", "utf8");
    assert.match(home, /data-testid="studio-unified-home"/);
    assert.match(home, /STUDIO_HOME_INTENTS/);
    assert.match(home, /view=shell/);
    assert.match(home, /studio-intent-\$\{intent\.id\}/);
  });

  it("narrows HomeCheff contextual chooser to human options", () => {
    const hcPage = readFileSync("src/app/studio/from/homecheff/[type]/[id]/page.tsx", "utf8");
    assert.match(hcPage, /StudioPx4ContextualIntentChooser/);
    assert.match(hcPage, /quick-video/);
    const intents = studioHcContextualIntents("/studio/from/homecheff/product/x/quick-video");
    assert.equal(intents.length, 3);
    assert.equal(intents[0]?.id, "productVideo");
  });

  it("hides Growth assistant on focused Photo Video routes", () => {
    assert.equal(isHomeCheffAssistantRoute("/studio/photo-video"), false);
    assert.equal(isHomeCheffAssistantRoute("/studio/photo-video/from-item"), false);
    assert.equal(isHomeCheffAssistantRoute("/studio"), true);
  });

  it("hides empty free-music catalog CTA while keeping own music", () => {
    assert.equal(PHOTO_VIDEO_MUSIC_CATALOG_STATUS, "empty");
    const composer = readFileSync("src/components/photo-video/photo-video-composer.tsx", "utf8");
    assert.match(composer, /catalogAvailable/);
    assert.match(composer, /data-testid="px4a-audio-own"/);
  });

  it("keeps advanced tools reachable without competing with intents", () => {
    assert.equal(STUDIO_HOME_ADVANCED_HREF, "/studio/storyboards");
    const home = readFileSync("src/components/studio/studio-unified-home-page.tsx", "utf8");
    assert.match(home, /studio-home-advanced/);
  });

  it("has NL/EN i18n parity for slice1a keys", () => {
    const prefix = "studio.slice1a.";
    const nlKeys = Object.keys(nl).filter((k) => k.startsWith(prefix));
    const enKeys = Object.keys(en).filter((k) => k.startsWith(prefix));
    assert.deepEqual(nlKeys.sort(), enKeys.sort());
    const navKeys = ["suite.slice1a.nav.studio", "suite.slice1a.nav.projects", "suite.slice1a.nav.account"];
    for (const key of navKeys) {
      assert.ok(nl[key as keyof typeof nl].trim());
      assert.ok(en[key as keyof typeof en].trim());
    }
  });
});
