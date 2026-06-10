import type {
  EditorObject,
  EditorObjectAnimationProfile,
  EditorObjectHierarchy,
  EditorObjectPart,
  EditorPartAnimationProfile,
  EditorPartCategory,
} from "@/types/homecheff-visual-editor";

const DEFAULT_OBJECT_ANIMATION: Partial<Record<string, EditorObjectAnimationProfile>> = {
  mascot: "float",
  logo: "pulse",
  prop: "none",
};

const DEFAULT_PART_ANIMATION: Partial<Record<EditorPartCategory, EditorPartAnimationProfile>> = {
  head: "nod",
  left_arm: "wave",
  right_arm: "wave",
  logo: "spin",
  globe: "rotate",
  tie: "sway",
};

export function defaultObjectAnimationProfile(category: EditorObject["category"]): EditorObjectAnimationProfile {
  return DEFAULT_OBJECT_ANIMATION[category] ?? "none";
}

export function defaultPartAnimationProfile(category: EditorPartCategory): EditorPartAnimationProfile {
  return DEFAULT_PART_ANIMATION[category] ?? "none";
}

export function setObjectAnimationProfile(
  object: EditorObject,
  profile: EditorObjectAnimationProfile
): EditorObject {
  return { ...object, animationProfile: profile };
}

export function setPartAnimationProfile(
  part: EditorObjectPart,
  profile: EditorPartAnimationProfile
): EditorObjectPart {
  return { ...part, animationProfile: profile };
}

export function setPartAnimationInHierarchy(
  hierarchy: EditorObjectHierarchy,
  partId: string,
  profile: EditorPartAnimationProfile
): EditorObjectHierarchy {
  return {
    ...hierarchy,
    parts: hierarchy.parts.map((p) => (p.id === partId ? setPartAnimationProfile(p, profile) : p)),
  };
}

export function collectAnimationMetadata(
  hierarchies: Record<string, EditorObjectHierarchy>,
  objects: EditorObject[]
): Record<string, EditorObjectAnimationProfile | EditorPartAnimationProfile> {
  const profiles: Record<string, EditorObjectAnimationProfile | EditorPartAnimationProfile> = {};
  for (const object of objects) {
    profiles[object.id] = object.animationProfile ?? defaultObjectAnimationProfile(object.category);
    const hierarchy = hierarchies[object.id];
    if (hierarchy) {
      for (const part of hierarchy.parts) {
        profiles[part.id] = part.animationProfile;
      }
    }
  }
  return profiles;
}

export type MotionPreviewKeyframe = {
  rotation: number;
  scale: number;
  offsetY: number;
};

export function motionPreviewKeyframes(
  profile: EditorObjectAnimationProfile | EditorPartAnimationProfile,
  frame: number,
  totalFrames = 60
): MotionPreviewKeyframe {
  const t = (frame % totalFrames) / totalFrames;
  const angle = t * Math.PI * 2;

  switch (profile) {
    case "rotate":
    case "spin":
      return { rotation: angle * (180 / Math.PI), scale: 1, offsetY: 0 };
    case "float":
    case "bob":
      return { rotation: 0, scale: 1, offsetY: Math.sin(angle) * 0.02 };
    case "pulse":
      return { rotation: 0, scale: 1 + Math.sin(angle) * 0.05, offsetY: 0 };
    case "bounce":
      return { rotation: 0, scale: 1, offsetY: Math.abs(Math.sin(angle)) * -0.03 };
    case "wave":
    case "sway":
      return { rotation: Math.sin(angle) * 12, scale: 1, offsetY: 0 };
    case "nod":
      return { rotation: Math.sin(angle) * 8, scale: 1, offsetY: 0 };
    case "orbit":
      return { rotation: angle * (180 / Math.PI), scale: 1, offsetY: Math.cos(angle) * 0.02 };
    default:
      return { rotation: 0, scale: 1, offsetY: 0 };
  }
}

export function animationProfileHasMotion(
  profile: EditorObjectAnimationProfile | EditorPartAnimationProfile
): boolean {
  return profile !== "none" && profile !== "follow_path";
}
