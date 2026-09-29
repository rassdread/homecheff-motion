import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  BECOME_AFFILIATE_HREF,
  CENTRAL_AFFILIATE_DASHBOARD_HREF,
  STUDIO_PROMO_LIBRARY_HREF,
  STUDIO_PROMOTE_HREF,
  studioAffiliateNavEntry,
  studioCareersHref,
} from "./studio-ecosystem-nav";

describe("studio ecosystem navigation", () => {
  it("sends an active affiliate to the central overview, not Promoten Studio", () => {
    const entry = studioAffiliateNavEntry({ dashboardAccess: true });
    assert.equal(entry.kind, "dashboard");
    assert.equal(entry.href, "https://homecheff.eu/affiliate/dashboard");
    assert.equal(entry.href.includes("/promoten/studio"), false);
  });

  it("sends a non-affiliate to the existing HomeCheff activation page", () => {
    const entry = studioAffiliateNavEntry({ dashboardAccess: false });
    assert.equal(entry.kind, "activate");
    assert.equal(entry.href, BECOME_AFFILIATE_HREF);
    assert.equal(entry.href, "https://homecheff.eu/affiliate");
  });

  it("keeps Studio promotion and the promo library on the central routes", () => {
    assert.equal(STUDIO_PROMOTE_HREF, "https://homecheff.eu/affiliate/dashboard/promoten/studio");
    assert.equal(
      STUDIO_PROMO_LIBRARY_HREF,
      "https://homecheff.eu/affiliate/promotiemateriaal?platform=studio",
    );
    assert.equal(CENTRAL_AFFILIATE_DASHBOARD_HREF, "https://homecheff.eu/affiliate/dashboard");
  });

  it("routes careers by locale without a Studio careers site", () => {
    assert.equal(studioCareersHref("nl"), "https://homecheff.eu/werken-bij");
    assert.equal(studioCareersHref("en"), "https://homecheff.eu/careers");
    assert.equal(studioCareersHref("de"), "https://homecheff.eu/werken-bij");
  });

  it("places the links in the account menu and footer, and redirects the old studio dashboard", () => {
    const menu = readFileSync("src/components/layout/app-shell-user-bar.tsx", "utf8");
    const footer = readFileSync("src/components/layout/studio-site-footer.tsx", "utf8");
    const legacy = readFileSync("src/app/account/affiliate/page.tsx", "utf8");
    assert.match(menu, /data-studio-affiliate-entry/);
    assert.match(menu, /data-studio-promote/);
    assert.match(menu, /data-studio-promo-library/);
    assert.match(menu, /nav\.affiliateDashboard/);
    assert.match(menu, /nav\.becomeAffiliate/);
    assert.doesNotMatch(menu, /\/account\/affiliate/);
    assert.match(footer, /studioCareersHref/);
    assert.match(footer, /data-studio-careers/);
    assert.match(legacy, /CENTRAL_AFFILIATE_DASHBOARD_HREF/);
    assert.match(legacy, /redirect\(/);
    assert.doesNotMatch(legacy, /StudioAffiliateDashboardClient/);
  });
});
