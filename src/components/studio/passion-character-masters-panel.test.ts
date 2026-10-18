import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PassionCharacterMastersPanel,
  passionMastersProviderUsd,
  type PassionMastersCharacterView,
  type PassionMastersQuoteView,
} from "./passion-character-masters-panel";

const quote: PassionMastersQuoteView = {
  model: "gpt-image-1",
  size: "1024x1536",
  quality: "high",
  initialImages: 3,
  initialHc: 375,
  callUsdBound: 0.27,
};

const characters: PassionMastersCharacterView[] = [
  { key: "baker", name: "Baker" },
  { key: "potter", name: "Potter" },
  { key: "gardener", name: "Gardener" },
];

function buttonTag(html: string): string {
  return html.match(/<button\b[^>]*>/)?.[0] ?? "";
}

function markup(input: { accepted: boolean; busy?: boolean }) {
  return renderToStaticMarkup(
    createElement(PassionCharacterMastersPanel, {
      quote,
      studioHcAvailable: 10000,
      characters,
      masters: [],
      accepted: input.accepted,
      busy: input.busy ?? false,
      activeKey: null,
      error: "",
      onAcceptedChange: () => undefined,
      onGenerate: () => undefined,
    })
  );
}

describe("passion character masters panel", () => {
  it("shows three cards, the Studio balance, and the initial cost", () => {
    const html = markup({ accepted: false });
    assert.match(html, /Baker/);
    assert.match(html, /Potter/);
    assert.match(html, /Gardener/);
    assert.match(html, /10,000 Studio HC/);
    assert.match(html, /central HomeCheff HC balance/);
    assert.match(html, /gpt-image-1/);
    assert.match(html, /High/);
    assert.match(html, /1024 × 1536/);
    assert.match(html, /3 images/);
    assert.match(html, /375 Studio HC/);
    assert.match(html, /\$0\.81/);
    assert.equal(passionMastersProviderUsd(quote), "0.81");
  });

  it("keeps the confirmation unchecked and the button disabled until accepted", () => {
    const waiting = markup({ accepted: false });
    assert.match(waiting, /Ik bevestig dat ik 375 Studio-HC wil gebruiken om drie AI-personages te genereren\./);
    assert.match(buttonTag(waiting), /\sdisabled=""/);
    assert.match(waiting, />Genereer 3 personages</);
    assert.doesNotMatch(waiting, /<input[^>]*\schecked=""/);

    const ready = markup({ accepted: true });
    assert.doesNotMatch(buttonTag(ready), /\sdisabled=""/);
    assert.match(ready, />Genereer 3 personages</);
  });

  it("disables the button again while generation is running", () => {
    const html = markup({ accepted: true, busy: true });
    assert.match(buttonTag(html), /\sdisabled=""/);
    assert.match(html, />Bezig…</);
  });
});
