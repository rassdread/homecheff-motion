import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildCharacterReadinessView } from "@/lib/studio-character-readiness";
import { emptyCharacterIdentityForm } from "@/lib/studio-character-identity-fields";
import {
  analyzeCloneSampleDuration,
  formatCloneDurationLabel,
  qualityMeterBlocks,
} from "@/lib/studio-voice-clone-quality";
import {
  CLONE_SAMPLE_SCRIPT_BODY_KEYS,
  CLONE_SAMPLE_SCRIPT_LENGTHS,
} from "@/lib/studio-voice-clone-sample-scripts";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

describe("studio-character-readiness", () => {
  it("suggests voice when identity is filled but voice is default", () => {
    const view = buildCharacterReadinessView({
      mode: "create",
      identity: {
        ...emptyCharacterIdentityForm({ name: "Chef" }),
        characterType: "mascot",
        description: "Friendly kitchen mascot",
      },
      referenceImageUrl: "",
      voiceEnabled: true,
      voiceProfile: "warm_narrator",
      voiceStatus: "preset",
      worlds: [],
    });
    assert.equal(view.nextStepKey, "studio.characterReadiness.next.voice");
    assert.ok(view.domains.some((d) => d.id === "voice" && d.status === "warning"));
  });

  it("marks reference missing on create", () => {
    const view = buildCharacterReadinessView({
      mode: "create",
      identity: emptyCharacterIdentityForm({ name: "Chef" }),
      referenceImageUrl: "",
      voiceEnabled: false,
      voiceProfile: "warm_narrator",
      voiceStatus: "none",
      worlds: [],
    });
    const ref = view.domains.find((d) => d.id === "referenceImage");
    assert.equal(ref?.status, "missing");
  });

  it("exposes creation phases identity → voice → reference → ready", () => {
    const view = buildCharacterReadinessView({
      mode: "create",
      identity: emptyCharacterIdentityForm(),
      referenceImageUrl: "",
      voiceEnabled: false,
      voiceProfile: "warm_narrator",
      voiceStatus: "none",
      worlds: [],
    });
    assert.deepEqual(
      view.creationPhases.map((p) => p.id),
      ["identity", "voice", "reference", "ready"]
    );
  });
});

describe("studio-voice-clone-quality", () => {
  it("rates short samples as basic", () => {
    const result = analyzeCloneSampleDuration(15);
    assert.equal(result.tier, "basic");
    assert.ok(result.filledBlocks <= 2);
  });

  it("rates 60+ seconds as excellent", () => {
    const result = analyzeCloneSampleDuration(72);
    assert.equal(result.tier, "excellent");
    assert.equal(result.filledBlocks, 5);
  });

  it("formats duration label", () => {
    assert.equal(formatCloneDurationLabel(65), "1:05");
    assert.equal(formatCloneDurationLabel(8), "0:08");
  });

  it("renders quality meter blocks", () => {
    assert.equal(qualityMeterBlocks(3), "■■■□□");
  });
});

describe("character creation completion wiring", () => {
  it("clone workflow includes recording coach and scripts", () => {
    const path = join(process.cwd(), "src/components/studio/studio-voice-clone-workflow.tsx");
    const src = readFileSync(path, "utf8");
    assert.match(src, /studio\.voiceClone\.coach\.title/);
    assert.match(src, /CLONE_SAMPLE_SCRIPT_LENGTHS/);
    assert.match(src, /analyzeCloneSampleDuration/);
  });

  it("character form mounts summary readiness panel", () => {
    const path = join(process.cwd(), "src/components/studio/studio-character-form.tsx");
    const src = readFileSync(path, "utf8");
    assert.match(src, /StudioCharacterSummaryReadinessPanel/);
  });

  it("user voice library exposes lastUsedAt", () => {
    const typePath = join(process.cwd(), "src/types/studio-user-voice-library.ts");
    const libPath = join(process.cwd(), "src/lib/studio-user-voice-library.ts");
    assert.match(readFileSync(typePath, "utf8"), /lastUsedAt/);
    assert.match(readFileSync(libPath, "utf8"), /lastUsedAt/);
  });

  it("i18n parity for readiness and clone coach", () => {
    assert.ok(nl["studio.characterReadiness.next.voice"]);
    assert.ok(en["studio.characterReadiness.next.voice"]);
    assert.ok(nl["studio.voiceClone.coach.title"]);
    assert.ok(en["studio.voiceClone.coach.title"]);
    for (const length of CLONE_SAMPLE_SCRIPT_LENGTHS) {
      assert.ok(nl[CLONE_SAMPLE_SCRIPT_BODY_KEYS[length] as keyof typeof nl]);
      assert.ok(en[CLONE_SAMPLE_SCRIPT_BODY_KEYS[length] as keyof typeof en]);
    }
  });
});
