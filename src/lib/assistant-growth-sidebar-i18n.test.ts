import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantRecommendationCards } from "@/components/assistant/assistant-recommendation-cards";
import { getTranslator } from "@/i18n";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

const sampleRecommendation = (overrides: Partial<AssistantRecommendation> = {}): AssistantRecommendation => ({
  id: "goal_celebration",
  category: "for_you",
  emoji: "⚽",
  titleKey: "assistant.recommendation.goalCelebration.title",
  descriptionKey: "assistant.recommendation.goalCelebration.description",
  whyKey: "assistant.recommendation.goalCelebration.why",
  promptMessage: "Ik wil een doelpunt maken",
  status: "ready",
  statusNoteKey: "assistant.recommendation.status.readyToStart",
  score: 1,
  ...overrides,
});

describe("assistant growth sidebar i18n rendering", () => {
  it("AssistantRecommendationCards renders with a missing title key", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const items = [
      sampleRecommendation({
        id: "missing_key_card",
        titleKey: "assistant.recommendation.__missing_render_title__" as never,
        descriptionKey: "assistant.recommendation.__missing_render_description__" as never,
        promptMessage: "Render fallback prompt",
      }),
    ];

    const html = renderToStaticMarkup(
      React.createElement(AssistantRecommendationCards, {
        items,
        onSelect: () => {},
      })
    );

    process.env.NODE_ENV = originalEnv;

    assert.match(html, /Render fallback prompt/);
    assert.doesNotMatch(html, /undefined/);
  });

  it("GrowthSidebar CTA labels resolve through translator", () => {
    const t = getTranslator("nl");
    const labels = [
      t("assistant.growth.cta.filmTrailer.title"),
      t("assistant.growth.cta.goalCelebration.action"),
      t("assistant.growth.discover.title"),
      t("assistant.growth.trending.subtitle"),
    ];
    for (const label of labels) {
      assert.equal(typeof label, "string");
      assert.ok(label.length > 0);
    }
  });
});
