import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  buildSuiteGlobalNavItems,
  buildSuiteToolNavItems,
  resolvePrimaryNavItems,
} from "@/lib/homecheff-primary-nav-config";
import {
  PX3_GLOBAL_NAV_HREFS,
  PX3_HOME_CONTINUE_HREF,
  PX3_HOME_CREATE_HREF,
  PX3_INTENTS,
  PX3_PRESERVED_ROUTES,
  PX3_PRODUCT_BRAND,
  PX3_TOOL_NAV_HREFS,
  px3Intent,
} from "@/lib/studio-px3-home";
import { px2Cta } from "@/lib/studio-px2-terminology";
import {
  resolveUniversePrimaryCtaHref,
  resolveUniverseSecondaryCtaHref,
  resolveUniverseSecondaryCtaKey,
} from "@/lib/universe-public-landing";

describe("PX.3 simple Studio Home", () => {
  it("keeps HomeCheff Studio brand and PX.2 create CTA destination", () => {
    assert.equal(PX3_PRODUCT_BRAND, "HomeCheff Studio");
    assert.equal(PX3_HOME_CREATE_HREF, "/studio/experience");
    assert.equal(px2Cta("chooseIntent").nl, "Wat wil je maken?");
    assert.equal(nl["studio.experience.chooser.title"], "Wat wil je maken?");
  });

  it("maps ordinary-language intents onto existing engines", () => {
    assert.equal(px3Intent("image").href, "/editor/start");
    assert.equal(px3Intent("video").href, "/studio/start");
    assert.equal(px3Intent("story").href, "/studio/storyboards/new");
    assert.equal(px3Intent("animation").href, "/motion/start");
    assert.equal(px3Intent("edit").href, "/projects");
    assert.equal(PX3_INTENTS.length, 5);
    assert.equal(nl["px3.intent.image.desc"], "Maak of bewerk een afbeelding");
    assert.equal(nl["px3.intent.video.desc"], "Maak een video");
    assert.equal(nl["px3.intent.story.desc"], "Maak een verhaal met meerdere scènes");
    assert.equal(nl["px3.intent.animation.desc"], "Breng een beeld of scène tot leven");
    assert.equal(nl["px3.intent.edit.desc"], "Ik heb al iets en wil verder");
    assert.equal(en["px3.intent.image.title"], "Image");
  });

  it("makes global chrome destinations, not five equal products", () => {
    const global = buildSuiteGlobalNavItems();
    assert.deepEqual(
      global.map((item) => item.href),
      [...PX3_GLOBAL_NAV_HREFS]
    );
    assert.equal(global.some((item) => item.href === "/editor"), false);
    assert.equal(global.some((item) => item.href === "/motion"), false);
    assert.equal(global.some((item) => item.href === "/publish"), false);
    assert.equal(resolvePrimaryNavItems(true).length, global.length);
  });

  it("keeps advanced product routes reachable from Meer", () => {
    const tools = buildSuiteToolNavItems();
    for (const href of PX3_TOOL_NAV_HREFS) {
      assert.ok(tools.some((item) => item.href === href), `missing tool ${href}`);
    }
    assert.equal(tools.find((item) => item.productId === "editor")?.href, "/editor");
    assert.equal(tools.find((item) => item.productId === "studio")?.href, "/studio");
    assert.equal(tools.find((item) => item.productId === "motion")?.href, "/motion");
    assert.equal(tools.find((item) => item.productId === "presentation")?.href, "/publish");
  });

  it("keeps Projects and Slice 1A global chrome destinations", () => {
    const global = buildSuiteGlobalNavItems();
    assert.equal(global.find((item) => item.labelKey === "suite.slice1a.nav.projects")?.href, "/projects");
    assert.equal(global.find((item) => item.labelKey === "suite.slice1a.nav.studio")?.href, "/studio");
    assert.equal(global.find((item) => item.labelKey === "suite.slice1a.nav.account")?.href, "/account");
  });

  it("signed-in Home secondary continues existing work without a new API", () => {
    assert.equal(resolveUniverseSecondaryCtaHref(true), PX3_HOME_CONTINUE_HREF);
    assert.equal(resolveUniverseSecondaryCtaKey(true), "px3.cta.continue");
    assert.equal(nl["px3.cta.continue"], "Ga verder");
    assert.equal(resolveUniversePrimaryCtaHref(true), PX3_HOME_CREATE_HREF);
    const home = readFileSync("src/components/studio/studio-unified-home-page.tsx", "utf8");
    assert.match(home, /view=shell/);
    assert.doesNotMatch(home, /limit=500/);
  });

  it("renders Slice 1A unified home with four intents", () => {
    const home = readFileSync("src/components/studio/studio-unified-home-page.tsx", "utf8");
    assert.match(home, /data-testid="studio-unified-home"/);
    assert.match(home, /STUDIO_HOME_INTENTS/);
    assert.match(home, /STUDIO_HOME_INTENTS/);
    assert.match(home, /intent\.href/);
    const funnel = readFileSync("src/components/studio/studio-experience-pack-funnel.tsx", "utf8");
    assert.match(funnel, /StudioPx3IntentChooser/);
    assert.match(funnel, /data-testid="px3-pack-chooser"/);
    const chooser = readFileSync("src/components/studio/studio-px3-intent-chooser.tsx", "utf8");
    assert.match(chooser, /min-h-\[72px\]/);
    assert.match(chooser, /PX3_INTENTS/);
  });

  it("simplifies mobile Home chips away from five equal products", () => {
    const mobile = readFileSync(
      "src/components/suite/universe/universe-home-mobile-quick-actions.tsx",
      "utf8"
    );
    assert.doesNotMatch(mobile, /href: "\/editor"/);
    assert.doesNotMatch(mobile, /href: "\/animate\/instant"/);
    assert.match(mobile, /href: "\/library"/);
    assert.match(mobile, /min-h-\[44px\]/);
    const nav = readFileSync("src/components/layout/app-shell-primary-nav.tsx", "utf8");
    assert.match(nav, /data-testid="px3-nav-tools"/);
  });

  it("preserves deep-link routes and keeps listing context on the PX.4 path", () => {
    for (const route of PX3_PRESERVED_ROUTES) {
      assert.ok(route.startsWith("/"));
    }
    assert.ok(PX3_PRESERVED_ROUTES.includes("/auth/sso/silent"));
    assert.ok(PX3_PRESERVED_ROUTES.includes("/account/credits"));
    assert.ok(PX3_PRESERVED_ROUTES.includes("/editor"));
    assert.ok(PX3_PRESERVED_ROUTES.includes("/publish"));
    const contract = readFileSync("src/lib/studio-px3-home.ts", "utf8");
    assert.match(contract, /\/studio\/from\/homecheff/);
    const chooser = readFileSync("src/components/studio/studio-px3-intent-chooser.tsx", "utf8");
    assert.match(chooser, /href=\{intent\.href\}/);
  });

  it("does not change SSO middleware or credit routes", () => {
    const middleware = readFileSync("src/middleware.ts", "utf8");
    assert.match(middleware, /auth\/sso\/silent/);
    const silent = readFileSync("src/app/auth/sso/silent/route.ts", "utf8");
    assert.match(silent, /interaction:\s*"silent"/);
  });
});
