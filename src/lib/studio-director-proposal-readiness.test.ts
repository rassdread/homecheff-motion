import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProposalAppliedStoryboard } from "@/lib/studio-director-proposal-readiness";
import type { StudioDirectorProposal } from "@/types/studio-director-proposal";

const t = (key: string) => key;

describe("studio-director-proposal-readiness", () => {
  it("buildProposalAppliedStoryboard includes props and locations", () => {
    const proposal = {
      ideaPrompt: "Test",
      interpretation: {
        directorProfile: "commercial",
        promptStyleProfile: "commercial",
      },
      audio: {
        voiceEnabled: false,
        voiceProfile: "",
        narrationMode: "none",
        musicEnabled: false,
        musicProfile: "",
        musicIntensity: "medium",
        soundEnabled: false,
        soundProfile: "",
        soundDensity: "light",
      },
      text: { narrationScriptPreview: "" },
      scenes: [
        {
          tempId: "temp-1",
          existingSceneId: null,
          order: 0,
          title: "Scene",
          description: "",
          action: "",
          emotion: "",
          camera: "",
          transitionToNext: "",
          durationSeconds: 5,
          characterRefs: [{ existingId: "char-1", name: "Chef", kind: "character" }],
          propRefs: [{ existingId: "prop-1", name: "Tray", kind: "prop" }],
          locationRef: { existingId: "loc-1", name: "Kitchen", kind: "location" },
        },
      ],
    } as StudioDirectorProposal;

    const storyboard = buildProposalAppliedStoryboard(
      {
        id: "sb-1",
        title: "Story",
        scenes: [],
        createdAt: "",
        updatedAt: "",
      } as import("@/types/studio-api").StudioStoryboardDetail,
      proposal,
      [{ id: "char-1", name: "Chef" } as import("@/types/studio-api").StudioCharacterListItem],
      t,
      {
        props: [{ id: "prop-1", name: "Tray" } as import("@/types/studio-api").StudioPropListItem],
        locations: [
          { id: "loc-1", name: "Kitchen" } as import("@/types/studio-api").StudioLocationListItem,
        ],
      }
    );

    const scene = storyboard.scenes[0]!;
    assert.equal(scene.props.length, 1);
    assert.equal(scene.props[0]?.prop.id, "prop-1");
    assert.equal(scene.location?.id, "loc-1");
  });
});
