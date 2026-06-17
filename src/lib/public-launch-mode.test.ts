import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";

const ROOT = process.cwd();

describe("public launch mode", () => {
  it("signup API allows public registration without invite token", () => {
    const signupApi = readFileSync(
      join(ROOT, "src/app/api/auth/signup/route.ts"),
      "utf8"
    );
    assert.doesNotMatch(signupApi, /INVITE_REQUIRED/);
    assert.match(signupApi, /role:\s*"user"/);
    assert.match(signupApi, /isFirstUserBootstrap/);
  });

  it("signup page always shows the registration form", () => {
    const page = readFileSync(join(ROOT, "src/app/signup/page.tsx"), "utf8");
    const content = readFileSync(
      join(ROOT, "src/components/auth/signup-page-content.tsx"),
      "utf8"
    );
    assert.doesNotMatch(page, /inviteRequired/);
    assert.doesNotMatch(content, /inviteRequired/);
    assert.match(content, /<AuthForm mode="signup"/);
  });

  it("animate auth uses public launch copy not invite-only hint", () => {
    const animate = readFileSync(join(ROOT, "src/app/animate/page.tsx"), "utf8");
    const en = readFileSync(join(ROOT, "src/i18n/locales/en.ts"), "utf8");
    const nl = readFileSync(join(ROOT, "src/i18n/locales/nl.ts"), "utf8");
    assert.match(animate, /animate\.auth\.publicSignupHint/);
    assert.doesNotMatch(en, /inviteSignupHint/);
    assert.doesNotMatch(nl, /inviteSignupHint/);
    assert.doesNotMatch(en, /only possible with an invite link/i);
    assert.doesNotMatch(nl, /alleen mogelijk met een uitnodigingslink/i);
  });

  it("robots allows indexing and sitemap lists public launch pages", () => {
    const robots = readFileSync(join(ROOT, "src/app/robots.ts"), "utf8");
    assert.match(robots, /allow:\s*"\//);
    assert.doesNotMatch(robots, /noindex/i);

    const sitemap = readFileSync(join(ROOT, "src/app/sitemap.ts"), "utf8");
    assert.match(sitemap, /SEO_PUBLIC_PATHS/);
    for (const path of ["/", "/studio", "/pricing", "/help"]) {
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
  });

  it("auth form no longer handles INVITE_REQUIRED", () => {
    const form = readFileSync(join(ROOT, "src/components/auth/auth-form.tsx"), "utf8");
    assert.doesNotMatch(form, /INVITE_REQUIRED/);
  });
});
