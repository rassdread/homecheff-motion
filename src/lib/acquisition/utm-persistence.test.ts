import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readUtmFromSearchParams,
  scrubUtmValue,
  studioUtmToStripeMetadata,
  utmQueryString,
  type StudioUtmCapture,
} from "./utm-persistence";

describe("studio utm persistence", () => {
  it("reads and scrubs UTM params", () => {
    const params = new URLSearchParams(
      "utm_source=google&utm_medium=cpc&utm_campaign=studio_nl_creator_search_v1&utm_content=ad_a&foo=1",
    );
    const cap = readUtmFromSearchParams(params, "/pricing");
    assert.ok(cap);
    assert.equal(cap!.utm_source, "google");
    assert.equal(cap!.utm_medium, "cpc");
    assert.equal(cap!.utm_campaign, "studio_nl_creator_search_v1");
    assert.equal(cap!.landing_path, "/pricing");
  });

  it("rejects empty or dangerous values", () => {
    assert.equal(scrubUtmValue("<script>"), undefined);
    assert.equal(scrubUtmValue(""), undefined);
    const params = new URLSearchParams("utm_source=<script>&utm_medium=");
    assert.equal(readUtmFromSearchParams(params), null);
  });

  it("accepts medium/content without source but first-touch gate uses source/campaign", () => {
    const params = new URLSearchParams("utm_medium=cpc&utm_content=x");
    const cap = readUtmFromSearchParams(params);
    assert.ok(cap);
    assert.equal(cap!.utm_medium, "cpc");
    assert.equal(cap!.utm_source, undefined);
    assert.equal(cap!.utm_campaign, undefined);
  });

  it("builds query string from capture", () => {
    const capture: StudioUtmCapture = {
      captured_at: "2026-09-02T00:00:00.000Z",
      utm_source: "meta",
      utm_campaign: "studio_test",
    };
    assert.equal(utmQueryString(capture), "utm_source=meta&utm_campaign=studio_test");
  });

  it("maps to Stripe metadata keys", () => {
    const meta = studioUtmToStripeMetadata({
      captured_at: "2026-09-02T12:00:00.000Z",
      utm_source: "google",
      utm_medium: "cpc",
      landing_path: "/pricing",
    });
    assert.equal(meta.utm_source, "google");
    assert.equal(meta.utm_medium, "cpc");
    assert.equal(meta.landing_path, "/pricing");
    assert.equal(meta.first_touch_at, "2026-09-02T12:00:00.000Z");
    assert.equal(meta.utm_campaign, undefined);
  });
});
