import type { MotionActionPresetId } from "@/types/motion-action-presets";

export type MotionPresetStoryboardScene = {
  sceneIndex: number;
  title: string;
  motion: string;
  camera: string;
  expression: string;
};

export type MotionPresetStoryboard = {
  presetId: MotionActionPresetId;
  scenes: MotionPresetStoryboardScene[];
  ending: string;
  expectedOutcome: string;
  structuredPromptBlock: string;
};

function storyboard(
  presetId: MotionActionPresetId,
  scenes: Omit<MotionPresetStoryboardScene, "sceneIndex">[],
  ending: string,
  expectedOutcome: string
): MotionPresetStoryboard {
  const numbered = scenes.map((scene, index) => ({ ...scene, sceneIndex: index + 1 }));
  const structuredPromptBlock = [
    "PRESET STORYBOARD:",
    ...numbered.map(
      (s) =>
        `Scene ${s.sceneIndex} — ${s.title}: ${s.motion}. Camera: ${s.camera}. Expression: ${s.expression}.`
    ),
    `Ending: ${ending}`,
    `Expected outcome: ${expectedOutcome}`,
  ].join("\n");
  return { presetId, scenes: numbered, ending, expectedOutcome, structuredPromptBlock };
}

const KEY_STORYBOARDS: Partial<Record<MotionActionPresetId, MotionPresetStoryboard>> = {
  moonwalk: storyboard(
    "moonwalk",
    [
      { title: "Stand confidently", motion: "Hold a strong stage pose", camera: "Full body wide", expression: "Confident" },
      { title: "Prepare movement", motion: "Shift weight and ready the glide", camera: "Medium tracking", expression: "Focused" },
      { title: "Perform moonwalk", motion: "Smooth backward glide across stage", camera: "Full body tracking", expression: "Playful confidence" },
      { title: "Finish pose", motion: "Land the final iconic pose", camera: "Hero full body", expression: "Proud" },
      { title: "Audience reaction", motion: "Brief acknowledgment to crowd", camera: "Medium wide", expression: "Satisfied" },
    ],
    "Hold final pose as spotlight lingers",
    "Uploaded person performs a recognizable moonwalk on stage"
  ),
  penalty_kick: storyboard(
    "penalty_kick",
    [
      { title: "Approach ball", motion: "Walk toward penalty spot", camera: "Sports tracking", expression: "Focused" },
      { title: "Take shot", motion: "Run-up and strike the ball", camera: "Low angle action", expression: "Determined" },
      { title: "Ball enters goal", motion: "Ball flies into net", camera: "Goal-line view", expression: "Intensity" },
      { title: "Crowd reacts", motion: "Stadium erupts", camera: "Wide stadium", expression: "Elation" },
      { title: "Celebrate", motion: "Victory celebration", camera: "Medium hero", expression: "Joy" },
    ],
    "Celebration with arms raised",
    "Same athlete scores from the penalty spot"
  ),
  goal_celebration: storyboard(
    "goal_celebration",
    [
      { title: "Score moment", motion: "React to scoring", camera: "Medium action", expression: "Surprise joy" },
      { title: "Run celebration", motion: "Sprint with arms wide", camera: "Tracking shot", expression: "Euphoric" },
      { title: "Team embrace", motion: "Celebrate with teammates", camera: "Wide field", expression: "United joy" },
      { title: "Crowd cheer", motion: "Acknowledge supporters", camera: "Stadium wide", expression: "Grateful" },
      { title: "Victory pose", motion: "Hold celebration pose", camera: "Hero medium", expression: "Triumphant" },
    ],
    "Hold victory pose facing crowd",
    "Uploaded player celebrates a goal with consistent identity"
  ),
  red_carpet_moment: storyboard(
    "red_carpet_moment",
    [
      { title: "Arrival", motion: "Step out at carpet entrance", camera: "Wide establishing", expression: "Composed" },
      { title: "Walk carpet", motion: "Elegant walk down carpet", camera: "Tracking medium", expression: "Confident" },
      { title: "Photographers", motion: "Pause for cameras", camera: "Front medium", expression: "Polished smile" },
      { title: "Pose", motion: "Signature red carpet pose", camera: "Full body glamour", expression: "Star quality" },
      { title: "Wave to crowd", motion: "Wave to fans", camera: "Medium wide", expression: "Warm" },
    ],
    "Wave and proceed down carpet",
    "Uploaded person owns a red carpet moment"
  ),
  podcast_clip: storyboard(
    "podcast_clip",
    [
      { title: "Settle in", motion: "Adjust at microphone", camera: "Medium upper body", expression: "Relaxed" },
      { title: "Open topic", motion: "Begin speaking naturally", camera: "Podcast medium", expression: "Engaged" },
      { title: "Explain point", motion: "Gestures while talking", camera: "Close medium", expression: "Thoughtful" },
      { title: "React", motion: "Natural listener reactions", camera: "Medium two-shot feel", expression: "Authentic" },
      { title: "Close thought", motion: "Wrap segment", camera: "Medium hold", expression: "Warm" },
    ],
    "Natural conversational close",
    "Uploaded host speaks naturally in a podcast studio"
  ),
  product_launch: storyboard(
    "product_launch",
    [
      { title: "Build anticipation", motion: "Presenter introduces launch", camera: "Stage medium", expression: "Excited" },
      { title: "Reveal product", motion: "Dramatic product reveal", camera: "Product hero", expression: "Proud" },
      { title: "Showcase features", motion: "Highlight key features", camera: "Commercial orbit", expression: "Confident" },
      { title: "Hero moment", motion: "Product center stage", camera: "Tight product hero", expression: "Premium" },
      { title: "Brand close", motion: "Brand lock-up ending", camera: "Wide stage", expression: "Assured" },
    ],
    "Product and brand centered on stage",
    "Uploaded product is the hero of the launch"
  ),
  mascot_commercial: storyboard(
    "mascot_commercial",
    [
      { title: "Brand intro", motion: "Mascot enters branded set", camera: "Wide commercial", expression: "Friendly" },
      { title: "Hook gesture", motion: "Signature mascot greeting", camera: "Medium mascot", expression: "Energetic" },
      { title: "Demo action", motion: "Performs commercial beat", camera: "Tracking medium", expression: "Playful" },
      { title: "Product tie-in", motion: "Points to offer", camera: "Medium two-element", expression: "Encouraging" },
      { title: "Brand outro", motion: "Wave with logo visible", camera: "Wide brand", expression: "Warm" },
    ],
    "Mascot holds brand pose",
    "Uploaded mascot performs the commercial unchanged"
  ),
};

const GENERIC_SCENE_TITLES = [
  "Establish subject",
  "Build action",
  "Peak moment",
  "Reaction beat",
  "Closing pose",
];

export function resolveMotionPresetStoryboard(presetId: MotionActionPresetId): MotionPresetStoryboard {
  const keyed = KEY_STORYBOARDS[presetId];
  if (keyed) {
    return keyed;
  }
  return storyboard(
    presetId,
    GENERIC_SCENE_TITLES.map((title, index) => ({
      title,
      motion: `Perform preset action beat ${index + 1}`,
      camera: index < 2 ? "Medium shot" : "Full body tracking",
      expression: index === 2 ? "Focused" : "Natural",
    })),
    "Hold final pose",
    `Uploaded subject completes ${presetId.replace(/_/g, " ")} with consistent identity`
  );
}

export function motionPresetStoryboardPromptBlock(presetId: MotionActionPresetId): string {
  return resolveMotionPresetStoryboard(presetId).structuredPromptBlock;
}
