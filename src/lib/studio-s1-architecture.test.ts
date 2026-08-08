/**
 * S.1 architecture guards — credit SSOT + client boundary denylist.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  FUSION_INTENT_RENDER_CREDITS,
  FUSION_INTENT_RENDER_FALLBACK_CREDITS,
  FUSION_RENDER_ACTION_DEFAULT_CREDITS,
  USD_PER_CREDIT,
  fusionIntentRenderCredits,
} from "@/lib/studio-credit-constants";
import { fusionWorkflowRenderCredits } from "@/lib/editor-fusion-workflow-credits";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";
import {
  resolveFusionRenderCreditsRequired,
} from "@/server/editor/editor-fusion-render-billing";

const ROOT = join(process.cwd(), "src");

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsx(full, out);
      continue;
    }
    if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("S.1 credit source of truth", () => {
  it("registry fusion_render default matches shared constant", () => {
    assert.equal(
      STUDIO_ACTION_COST_REGISTRY.fusion_render.defaultCreditCost,
      FUSION_RENDER_ACTION_DEFAULT_CREDITS
    );
  });

  it("USD_PER_CREDIT is shared and stable", () => {
    assert.equal(USD_PER_CREDIT, 0.005);
    assert.equal(STUDIO_ACTION_COST_REGISTRY.fusion_render.actionType, "fusion_render");
  });

  it("intent map values are unchanged (financial regression)", () => {
    assert.equal(fusionIntentRenderCredits("character_fusion"), 25);
    assert.equal(fusionIntentRenderCredits("future_child"), 35);
    assert.equal(fusionIntentRenderCredits("life_timeline"), 50);
    assert.equal(fusionIntentRenderCredits("character_upgrade"), 15);
    assert.equal(fusionIntentRenderCredits("human_into_mascot"), 20);
    assert.equal(FUSION_INTENT_RENDER_FALLBACK_CREDITS, 20);
    assert.equal(FUSION_INTENT_RENDER_CREDITS.campaign_variant, 25);
  });

  it("UI helper and server billing resolver agree on intent credits", () => {
    for (const intent of [
      "character_fusion",
      "genetic_blend",
      "life_timeline",
      "mascot_into_human",
      "how_will_i_look",
    ] as const) {
      assert.equal(fusionWorkflowRenderCredits(intent), resolveFusionRenderCreditsRequired(intent));
    }
  });
});

describe("S.1 workspace route ownership", () => {
  it("canonical workspace href is /studio?storyboardId=", () => {
    assert.equal(studioWorkspaceHref("sb_123"), "/studio?storyboardId=sb_123");
  });

  it("compatibility redirect page still exists", () => {
    const page = readFileSync(join(ROOT, "app/studio/workspace/page.tsx"), "utf8");
    assert.match(page, /studioWorkspaceHref/);
    assert.match(page, /router\.replace/);
  });
});

describe("S.1 client/server boundary denylist", () => {
  const FORBIDDEN_FROM_CLIENT = [
    "@/server/studio/studio-user-audio-library-blob",
    "@/server/studio/attach-audio-mix-handoff",
    "@/server/studio-account/studio-action-cost-registry",
    "@/server/studio-account/studio-wallet-service",
    "node:crypto",
  ];

  it("use client files do not import forbidden server modules", () => {
    const files = [
      ...walkTsx(join(ROOT, "components")),
      ...walkTsx(join(ROOT, "hooks")),
    ];
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes('"use client"') && !src.includes("'use client'")) {
        continue;
      }
      for (const forbidden of FORBIDDEN_FROM_CLIENT) {
        if (src.includes(forbidden)) {
          violations.push(`${file} imports ${forbidden}`);
        }
      }
    }
    assert.deepEqual(violations, []);
  });

  it("audio mix resolve stays free of server blob imports", () => {
    const src = readFileSync(join(ROOT, "lib/studio-audio-mix-resolve.ts"), "utf8");
    assert.doesNotMatch(src, /studio-user-audio-library-blob/);
    assert.match(src, /studio-user-audio-library-find/);
  });

  it("fusion workflow credits stays free of server registry imports", () => {
    const src = readFileSync(join(ROOT, "lib/editor-fusion-workflow-credits.ts"), "utf8");
    assert.doesNotMatch(src, /studio-action-cost-registry/);
    assert.match(src, /studio-credit-constants/);
  });

  it("audio handoff lives under server/studio", () => {
    const src = readFileSync(
      join(ROOT, "server/studio/attach-audio-mix-handoff.ts"),
      "utf8"
    );
    assert.match(src, /listUserAudioLibraryAssets/);
    assert.match(src, /SERVER_ONLY/);
  });

  it("blob module is marked SERVER_ONLY", () => {
    const src = readFileSync(
      join(ROOT, "server/studio/studio-user-audio-library-blob.ts"),
      "utf8"
    );
    assert.match(src, /SERVER_ONLY/);
    assert.match(src, /node:crypto/);
  });
});
