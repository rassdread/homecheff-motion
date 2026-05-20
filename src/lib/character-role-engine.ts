/**
 * CharacterRoleEngine — automatic role assignment and motion direction per role.
 */

export type CharacterRoleId =
  | "CHEF_HOST"
  | "GARDEN_GUIDE"
  | "DESIGN_CREATOR"
  | "HUMAN_PRESENTER"
  | "AFFILIATE_SELLER"
  | "MARKETPLACE_VISITOR"
  | "BACKGROUND_CROWD";

export type CharacterSceneRole = {
  roleId: CharacterRoleId;
  confidence: number;
  label: string;
};

export type CharacterRoleMotionProfile = {
  motionStyle: string;
  facialEnergy: string;
  blinkIntensity: string;
  gestureStyle: string;
  movementPriority: string;
  cameraFocus: string;
  emotionalActing: string;
  fxEmphasis: string;
};

const ROLE_PROFILES: Record<CharacterRoleId, CharacterRoleMotionProfile> = {
  CHEF_HOST: {
    motionStyle: "expressive presenter gestures toward food or audience",
    facialEnergy: "warm enthusiastic smile with lively eyes",
    blinkIntensity: "natural friendly blink cadence",
    gestureStyle: "inviting open hands, cooking/presentation motion",
    movementPriority: "high on face and hands",
    cameraFocus: "center on chef mascot",
    emotionalActing: "friendly chef host selling with charm",
    fxEmphasis: "soft social glow on mascot only",
  },
  GARDEN_GUIDE: {
    motionStyle: "calmer natural sway and gentle pointing",
    facialEnergy: "soft warm expression, relaxed eyes",
    blinkIntensity: "slow relaxed blinks",
    gestureStyle: "organic nurturing gestures, no sharp snaps",
    movementPriority: "medium — smooth pacing",
    cameraFocus: "soft framing on garden guide",
    emotionalActing: "peaceful garden storyteller",
    fxEmphasis: "subtle atmospheric depth",
  },
  DESIGN_CREATOR: {
    motionStyle: "creative showcase gestures and artistic presentation",
    facialEnergy: "focused inspired expression",
    blinkIntensity: "alert creative blink rhythm",
    gestureStyle: "showcase hands, design-forward poses",
    movementPriority: "high on hands and upper body",
    cameraFocus: "highlight design mascot or creator",
    emotionalActing: "artistic product/creative reveal",
    fxEmphasis: "clean glow on subject",
  },
  HUMAN_PRESENTER: {
    motionStyle: "realistic social-media presenter motion",
    facialEnergy: "natural expression shifts, direct eye contact",
    blinkIntensity: "realistic human blink",
    gestureStyle: "conversational hand talk, subtle shoulder movement",
    movementPriority: "face and hands first",
    cameraFocus: "presenter-centered framing",
    emotionalActing: "authentic UGC host energy",
    fxEmphasis: "minimal — preserve realism",
  },
  AFFILIATE_SELLER: {
    motionStyle: "confident product-forward gestures",
    facialEnergy: "assured friendly sales expression",
    blinkIntensity: "steady professional cadence",
    gestureStyle: "point-to-product, open palm offers",
    movementPriority: "product and presenter balanced",
    cameraFocus: "hero product with presenter support",
    emotionalActing: "premium affiliate promo",
    fxEmphasis: "luxury lift on product",
  },
  MARKETPLACE_VISITOR: {
    motionStyle: "curious exploratory body language",
    facialEnergy: "interested approachable look",
    blinkIntensity: "natural",
    gestureStyle: "browsing, discovering, light wave",
    movementPriority: "medium foreground",
    cameraFocus: "environmental storytelling",
    emotionalActing: "community marketplace energy",
    fxEmphasis: "atmospheric dust/depth",
  },
  BACKGROUND_CROWD: {
    motionStyle: "ambient subtle movement only",
    facialEnergy: "low detail background faces",
    blinkIntensity: "minimal",
    gestureStyle: "slow ambient sway",
    movementPriority: "low",
    cameraFocus: "background depth",
    emotionalActing: "environmental life",
    fxEmphasis: "parallax atmosphere only",
  },
};

const ROLE_DETECT_ORDER: CharacterRoleId[] = [
  "CHEF_HOST",
  "GARDEN_GUIDE",
  "DESIGN_CREATOR",
  "HUMAN_PRESENTER",
  "AFFILIATE_SELLER",
  "MARKETPLACE_VISITOR",
];

const ROLE_KEYWORDS: Record<CharacterRoleId, RegExp> = {
  CHEF_HOST: /\bchef\b|\bkok\b|\bcook\b|\bkeuken\b|\bhomecheff\b/i,
  GARDEN_GUIDE: /\bgarden\b|\btuin\b|\bplant\b|\bgroen\b|\bnature\b/i,
  DESIGN_CREATOR: /\bdesign\b|\bcreative\b|\bstudio\b|\bontwerp\b|\bbrand\b/i,
  HUMAN_PRESENTER: /\bpresenter\b|\bhost\b|\bcreator\b|\binfluencer\b|\bhuman\b/i,
  AFFILIATE_SELLER: /\baffiliate\b|\bseller\b|\bproduct\b|\bdeal\b|\bprijs\b/i,
  MARKETPLACE_VISITOR: /\bmarketplace\b|\bvisitor\b|\bshop\b|\bcommunity\b/i,
  BACKGROUND_CROWD: /\bcrowd\b|\bpeople\b|\bbackground\b|\bmensen\b/i,
};

export function detectCharacterRoles(input: {
  corpus: string;
  imageCount: number;
}): CharacterSceneRole[] {
  const found: CharacterSceneRole[] = [];
  for (const roleId of ROLE_DETECT_ORDER) {
    if (ROLE_KEYWORDS[roleId].test(input.corpus)) {
      found.push({
        roleId,
        confidence: 0.85,
        label: roleId.replace(/_/g, " ").toLowerCase(),
      });
    }
  }
  if (found.length === 0 && input.imageCount >= 3) {
    found.push({
      roleId: "CHEF_HOST",
      confidence: 0.55,
      label: "default mascot host",
    });
  }
  if (/\bcrowd\b|\bcommunity\b|\bworld\b/i.test(input.corpus)) {
    found.push({
      roleId: "BACKGROUND_CROWD",
      confidence: 0.7,
      label: "background crowd",
    });
  }
  return found;
}

export function getCharacterRoleProfile(roleId: CharacterRoleId): CharacterRoleMotionProfile {
  return ROLE_PROFILES[roleId];
}

export function buildCharacterRoleEnginePromptBlock(roles: CharacterSceneRole[]): string {
  if (!roles.length) {
    return "";
  }
  const lines = roles.slice(0, 4).map((r) => {
    const p = getCharacterRoleProfile(r.roleId);
    return `- ${r.roleId}: ${p.motionStyle}; ${p.emotionalActing}; gestures: ${p.gestureStyle}; focus: ${p.cameraFocus}.`;
  });
  return `CHARACTER ROLE ENGINE (auto-detected):\n${lines.join("\n")}\n- Typography, logos, and UI panels: STATIC_PRESERVE — no morphing.`;
}
