import { getMotionActionPreset } from "@/lib/motion-action-presets";
import { motionPresetStoryboardPromptBlock } from "@/lib/motion-preset-storyboards";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type { MotionPresetIntelligenceProfile } from "@/types/motion-preset-engine";

function block(
  presetId: MotionActionPresetId,
  environment: string,
  motion: string,
  expression: string,
  camera: string,
  sceneProgression?: string,
  ending?: string,
  expectedOutcome?: string
): MotionPresetIntelligenceProfile {
  const storyboardBlock = motionPresetStoryboardPromptBlock(presetId);
  const structuredPromptBlock = [
    `Environment: ${environment}.`,
    `Motion: ${motion}.`,
    `Expression: ${expression}.`,
    `Camera: ${camera}.`,
    sceneProgression ? `Scene progression: ${sceneProgression}.` : "",
    ending ? `Ending: ${ending}.` : "",
    expectedOutcome ? `Expected outcome: ${expectedOutcome}.` : "",
    "Preserve exact subject identity from the uploaded reference(s).",
    storyboardBlock,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    presetId,
    environment,
    motion,
    expression,
    camera,
    sceneProgression,
    ending,
    expectedOutcome,
    structuredPromptBlock,
  };
}

const KEY_PROFILES: Partial<Record<MotionActionPresetId, MotionPresetIntelligenceProfile>> = {
  moonwalk: block(
    "moonwalk",
    "Stage with spotlight",
    "Smooth moonwalk glide across the stage",
    "Confident and playful",
    "Full body tracking shot",
    "Stand → prepare → moonwalk → finish pose → audience reaction",
    "Hold final pose under spotlight",
    "Uploaded person performs a recognizable moonwalk"
  ),
  penalty_kick: block(
    "penalty_kick",
    "Football field penalty spot",
    "Run-up then kick then celebration",
    "Focused and determined",
    "Sports tracking camera",
    "Approach → strike → goal → crowd → celebrate",
    "Victory celebration",
    "Same athlete scores the penalty"
  ),
  goal_celebration: block(
    "goal_celebration",
    "Football stadium",
    "Explosive goal celebration run",
    "Euphoric",
    "Tracking sports camera",
    "Score react → sprint → team embrace → crowd → victory pose",
    "Arms raised victory pose",
    "Uploaded player celebrates consistently"
  ),
  red_carpet_moment: block(
    "red_carpet_moment",
    "Red carpet premiere",
    "Elegant carpet walk and poses",
    "Polished and confident",
    "Glamour tracking shot",
    "Arrival → walk → photographers → pose → wave",
    "Wave to fans",
    "Uploaded person owns the red carpet"
  ),
  podcast_clip: block(
    "podcast_clip",
    "Podcast studio with microphone",
    "Natural talking with subtle hand gestures",
    "Relaxed and conversational",
    "Medium shot upper body",
    "Settle → open → explain → react → close",
    "Warm conversational close",
    "Uploaded host speaks naturally"
  ),
  product_launch: block(
    "product_launch",
    "Product launch stage with spotlight",
    "Dramatic product reveal presentation",
    "Confident and proud",
    "Commercial hero shot",
    "Anticipation → reveal → features → hero → brand close",
    "Product center stage",
    "Uploaded product is the hero"
  ),
  product_showcase: block(
    "product_showcase",
    "Clean commercial studio",
    "Slow orbit showcase of product",
    "Premium and calm",
    "Product hero orbit",
    "Establish → rotate → detail → hero → brand",
    "Product hero hold",
    "Uploaded product stays recognizable"
  ),
  mascot_commercial: block(
    "mascot_commercial",
    "Branded commercial set",
    "Mascot performs friendly commercial gestures",
    "Warm and energetic",
    "Medium-wide mascot-focused shot",
    "Intro → hook → demo → tie-in → outro",
    "Mascot brand pose",
    "Uploaded mascot performs unchanged"
  ),
  mascot_greeting: block(
    "mascot_greeting",
    "Friendly branded entrance",
    "Wave and welcoming gesture",
    "Cheerful",
    "Medium mascot shot",
    "Enter → wave → gesture → smile → hold",
    "Friendly wave hold",
    "Uploaded mascot greets audience"
  ),
  award_ceremony: block(
    "award_ceremony",
    "Award stage with spotlight",
    "Walk to podium and accept award",
    "Humble pride",
    "Ceremony tracking",
    "Walk → podium → accept → speech beat → applause",
    "Hold trophy moment",
    "Uploaded person accepts award"
  ),
  business_presentation: block(
    "business_presentation",
    "Modern conference room",
    "Presenting with confident gestures",
    "Professional and focused",
    "Medium shot",
    "Open → explain → gesture → emphasize → close",
    "Confident close",
    "Uploaded presenter delivers pitch"
  ),
  conference_speaker: block(
    "conference_speaker",
    "Conference stage with screen",
    "Keynote speaking with stage movement",
    "Authoritative",
    "Stage medium-wide",
    "Enter → open → point → engage → close",
    "Stage bow",
    "Uploaded speaker owns the stage"
  ),
  influencer_reel: block(
    "influencer_reel",
    "Trendy social studio",
    "Quick energetic creator beats",
    "Expressive",
    "Vertical-friendly medium",
    "Hook → action → reaction → CTA beat → outro",
    "Signature creator pose",
    "Uploaded creator stays recognizable"
  ),
  travel_vlog: block(
    "travel_vlog",
    "Scenic travel location",
    "Walk-and-talk exploration",
    "Curious and upbeat",
    "Handheld travel follow",
    "Arrive → explore → react → highlight → wave",
    "Scenic outro wave",
    "Uploaded traveler explores location"
  ),
  boxing_entrance: block(
    "boxing_entrance",
    "Arena tunnel to ring",
    "Power walk entrance with intensity",
    "Fierce focus",
    "Low angle sports tracking",
    "Tunnel → walk → ring → pose → crowd",
    "Fighter pose in ring",
    "Uploaded fighter makes entrance"
  ),
  training_montage: block(
    "training_montage",
    "Gym or training facility",
    "Dynamic training sequence",
    "Determined",
    "Montage cuts feel",
    "Warm up → drill → peak effort → recover → finish",
    "Victory breath",
    "Uploaded athlete trains consistently"
  ),
  cooking_tutorial: block(
    "cooking_tutorial",
    "Kitchen studio",
    "Cooking demonstration beats",
    "Warm instructor",
    "Over-shoulder and medium",
    "Prep → cook → taste → plate → present",
    "Present finished dish",
    "Uploaded chef demonstrates recipe"
  ),
  restaurant_service: block(
    "restaurant_service",
    "Restaurant dining room",
    "Serve and hospitality gestures",
    "Welcoming",
    "Medium service shot",
    "Greet → serve → interact → smile → bow",
    "Warm hospitality close",
    "Uploaded server delivers service"
  ),
  gardening_activity: block(
    "gardening_activity",
    "Garden or greenhouse",
    "Tending plants naturally",
    "Peaceful focus",
    "Medium outdoor",
    "Approach → tend → inspect → admire → rest",
    "Admire garden result",
    "Uploaded gardener tends plants"
  ),
  brand_reveal: block(
    "brand_reveal",
    "Premium branded backdrop",
    "Logo or brand reveal gesture",
    "Confident",
    "Centered branding shot",
    "Tease → reveal → highlight → hold",
    "Brand lock-up",
    "Uploaded brand stays intact"
  ),
};

export function resolveMotionPresetIntelligenceProfile(
  presetId: MotionActionPresetId
): MotionPresetIntelligenceProfile {
  const keyed = KEY_PROFILES[presetId];
  if (keyed) {
    return keyed;
  }
  const preset = getMotionActionPreset(presetId);
  if (!preset) {
    return block(presetId, "Cinematic environment", "Natural motion", "Neutral", "Medium shot");
  }
  return block(
    presetId,
    preset.sceneSettings.environment,
    preset.motionSettings.movement,
    preset.audioSuggestions.musicMood === "triumphant" ? "Excited" : "Natural",
    preset.motionSettings.shotType
  );
}
