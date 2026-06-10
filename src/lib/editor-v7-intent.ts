import type {
  EditorPosterTemplate,
  EditorSocialPreset,
  EditorV7CommandActionType,
} from "@/types/homecheff-visual-editor";

export type EditorV7DetectedIntent = {
  actionType: EditorV7CommandActionType;
  labelKey: string;
  params?: Record<string, string>;
  objectRef?: string;
};

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function extractReplaceTarget(prompt: string): { target: string; replacement: string } | null {
  const patterns = [
    /replace\s+(?:the\s+)?(.+?)\s+with\s+(?:a\s+)?(.+)/i,
    /vervang\s+(?:de\s+)?(.+?)\s+door\s+(?:een\s+)?(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return { target: match[1].trim(), replacement: match[2].trim() };
    }
  }
  return null;
}

function detectPosterTemplate(lower: string): EditorPosterTemplate | undefined {
  if (includesAny(lower, ["restaurant poster", "restaurant"])) {
    return "restaurant";
  }
  if (includesAny(lower, ["menu design", "menu"])) {
    return "menu";
  }
  if (includesAny(lower, ["marketplace", "product photo"])) {
    return "marketplace";
  }
  if (includesAny(lower, ["flyer"])) {
    return "flyer";
  }
  if (includesAny(lower, ["a3"])) {
    return "a3";
  }
  if (includesAny(lower, ["a4"])) {
    return "a4";
  }
  if (includesAny(lower, ["poster", "affiche"])) {
    return "restaurant";
  }
  return undefined;
}

function detectSocialPreset(lower: string): EditorSocialPreset | undefined {
  if (includesAny(lower, ["instagram story", "story"])) {
    return "instagram_story";
  }
  if (includesAny(lower, ["instagram", "insta"])) {
    return "instagram_post";
  }
  if (includesAny(lower, ["tiktok"])) {
    return "tiktok_cover";
  }
  if (includesAny(lower, ["youtube", "thumbnail"])) {
    return "youtube_thumbnail";
  }
  if (includesAny(lower, ["facebook"])) {
    return "facebook_post";
  }
  if (includesAny(lower, ["linkedin"])) {
    return "linkedin_post";
  }
  if (includesAny(lower, ["pinterest"])) {
    return "pinterest";
  }
  if (includesAny(lower, ["social", "publish"])) {
    return "instagram_post";
  }
  return undefined;
}

export function detectEditorCommandIntents(prompt: string): EditorV7DetectedIntent[] {
  const lower = prompt.toLowerCase().trim();
  const intents: EditorV7DetectedIntent[] = [];

  const replace = extractReplaceTarget(prompt);
  if (replace) {
    intents.push({
      actionType: "magic_replace",
      labelKey: "editor.v7.plan.replaceObject",
      params: { target: replace.target, replacement: replace.replacement, prompt },
      objectRef: replace.target,
    });
  }

  if (
    includesAny(lower, ["remove background", "remove the background", "achtergrond verwijderen"]) ||
    (includesAny(lower, ["remove", "verwijder"]) && includesAny(lower, ["background", "achtergrond"]))
  ) {
    intents.push({
      actionType: "background_remove",
      labelKey: "editor.v7.plan.removeBackground",
    });
  }

  if (includesAny(lower, ["remove all people", "remove people", "people in the background"])) {
    intents.push({
      actionType: "remove_object",
      labelKey: "editor.v7.plan.removePeople",
      objectRef: "background",
    });
  }

  if (
    includesAny(lower, ["chef jacket", "black jacket", "modern jacket", "give him", "give her"]) ||
    (includesAny(lower, ["jacket", "jas", "clothing", "outfit"]) &&
      includesAny(lower, ["give", "modern", "black", "blue", "wear"]))
  ) {
    intents.push({
      actionType: "magic_replace",
      labelKey: "editor.v7.plan.changeClothing",
      params: { prompt },
      objectRef: "jacket",
    });
  }

  if (includesAny(lower, ["rotate the globe", "rotate globe"])) {
    intents.push({
      actionType: "animate",
      labelKey: "editor.v7.plan.rotateGlobe",
      objectRef: "globe",
      params: { preset: "rotate" },
    });
  }

  if (includesAny(lower, ["add logo", "add my logo", "logo to the shirt", "place logo"])) {
    intents.push({
      actionType: "logo_placement",
      labelKey: "editor.v7.plan.addLogo",
    });
  }

  if (includesAny(lower, ["homecheff branding", "homecheff brand", "brand kit"])) {
    intents.push({
      actionType: "brand_kit",
      labelKey: "editor.v7.plan.addBranding",
    });
  }

  const posterTemplate = detectPosterTemplate(lower);
  if (posterTemplate || includesAny(lower, ["create poster", "turn this into a poster", "poster"])) {
    intents.push({
      actionType: "poster_template",
      labelKey: "editor.v7.plan.createPoster",
      params: posterTemplate ? { template: posterTemplate } : undefined,
    });
  }

  if (
    includesAny(lower, ["motion-ready", "motion ready", "prepare for motion", "make this motion-ready"])
  ) {
    intents.push({
      actionType: "motion_ready",
      labelKey: "editor.v7.plan.motionReady",
    });
  }

  if (includesAny(lower, ["create a gif", "create gif", "gif of the globe", "make a gif"])) {
    intents.push({
      actionType: "quick_motion_gif",
      labelKey: "editor.v7.plan.createGif",
      objectRef: includesAny(lower, ["globe", "wereldbol"]) ? "globe" : undefined,
    });
  }

  const social = detectSocialPreset(lower);
  if (social) {
    intents.push({
      actionType: "social_preset",
      labelKey: "editor.v7.plan.socialExport",
      params: { preset: social },
    });
  }

  if (includesAny(lower, ["translate", "vertaal"]) && includesAny(lower, ["dutch", "nederlands"])) {
    intents.push({
      actionType: "translate_text",
      labelKey: "editor.v7.plan.translateText",
      params: { language: "nl" },
    });
  }

  if (includesAny(lower, ["print", "print-ready", "print ready"])) {
    intents.push({
      actionType: "print_export",
      labelKey: "editor.v7.plan.printExport",
    });
  }

  if (includesAny(lower, ["5-scene", "5 scene", "storyboard", "create a story"])) {
    const sceneMatch = lower.match(/(\d+)[\s-]*scene/);
    intents.push({
      actionType: "studio_story",
      labelKey: "editor.v7.plan.studioStory",
      params: sceneMatch ? { sceneCount: sceneMatch[1] } : { sceneCount: "5" },
    });
  }

  if (includesAny(lower, ["publish to social", "publish social"])) {
    intents.push({
      actionType: "publish_social",
      labelKey: "editor.v7.plan.publishSocial",
    });
  }

  if (includesAny(lower, ["improve composition", "center", "align"])) {
    intents.push({
      actionType: "align",
      labelKey: "editor.v7.plan.improveComposition",
      params: { action: "center" },
    });
  }

  return intents;
}
