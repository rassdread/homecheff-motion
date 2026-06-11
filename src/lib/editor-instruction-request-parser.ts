import {
  buildChangePlanItemFromSelection,
  buildStyleChangePlanItem,
} from "@/lib/editor-instruction-change-plan";
import { EDITOR_STYLE_ACTIONS } from "@/lib/editor-style-actions";
import type {
  EditorInstructionChangePlanEntry,
  EditorInstructionDynamicAction,
  EditorInstructionObjectCategory,
  EditorInstructionOutputTarget,
  EditorStyleAttribute,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

export type ParsedInstructionAction = {
  action: EditorInstructionDynamicAction;
  color?: string;
  replacement?: string;
  logo?: string;
};

export type ParsedInstructionObject = {
  object: string;
  objectCategory: EditorInstructionObjectCategory;
  actions: ParsedInstructionAction[];
};

export type ParsedStyleChange = {
  styleAttribute: EditorStyleAttribute;
  actionId: string;
  instruction: string;
};

export type ParsedEditorInstructionRequest = {
  rawPrompt: string;
  objects: ParsedInstructionObject[];
  styleChanges: ParsedStyleChange[];
  outputTarget?: EditorInstructionOutputTarget;
  suggestions: string[];
};

function inferObjectCategory(object: string): EditorInstructionObjectCategory {
  const lower = object.toLowerCase();
  if (/apron|coat|suit|jacket|tie|shirt|clothing|uniform|shoe/.test(lower)) {
    return "clothing";
  }
  if (/globe/.test(lower) && !/globe man/.test(lower)) {
    return "tool";
  }
  if (/logo|brand/.test(lower)) {
    return "logo";
  }
  if (/background|scene|kitchen|room/.test(lower)) {
    return "background";
  }
  if (/text|caption|title/.test(lower)) {
    return "text";
  }
  if (/packaging|box|label/.test(lower)) {
    return "packaging";
  }
  if (/mascot|character|chef|man|face/.test(lower)) {
    return "character";
  }
  return "other";
}

function detectOutputTarget(prompt: string): EditorInstructionOutputTarget | undefined {
  const lower = prompt.toLowerCase();
  if (/print|flyer|poster|sticker|packaging|menu|press/.test(lower)) {
    return "print";
  }
  if (/video|animation|motion|commercial/.test(lower)) {
    return "motion";
  }
  if (/social|instagram|tiktok|facebook/.test(lower)) {
    return "social";
  }
  return undefined;
}

function extractObjects(prompt: string): ParsedInstructionObject[] {
  const lower = prompt.toLowerCase();
  const results: ParsedInstructionObject[] = [];
  const seen = new Set<string>();

  const objectPattern =
    /\b(apron|lab coat|white lab coat|suit|jacket|shirt|tie|pants|shoes|globe|logo|background|mascot|character|face|packaging|text)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(lower)) !== null) {
    const object = match[1]!;
    const key = object.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const actions: ParsedInstructionAction[] = [];

    if (
      (/add\s+(?:the\s+)?(?:homecheff\s+)?logo|logo\s+(?:to|on)/.test(lower) &&
        /apron|coat|suit|jacket|shirt|clothing|packaging/.test(key)) ||
      (/logo/.test(lower) && key === "jacket" && /jacket/.test(lower))
    ) {
      actions.push({ action: "add_logo", logo: "HomeCheff" });
    }
    if (/(make|change|turn).*(dark\s+blue|navy)/.test(lower) && key === "tie") {
      actions.push({ action: "change_color", color: "dark blue" });
    }
    if (/replace\s+(?:the\s+)?logo/.test(lower) && key === "logo") {
      actions.push({ action: "replace_logo", logo: "HomeCheff" });
    }
    if (/(make|change|turn).*(green|red|blue|black|white|#[0-9a-f]{3,8})/.test(lower) && lower.includes(key)) {
      const colorMatch = lower.match(/(green|red|blue|black|white|#[0-9a-f]{3,8})/);
      actions.push({ action: "change_color", color: colorMatch?.[1] });
    }
    if (/replace\s+(?:the\s+)?/.test(lower) && (lower.includes(key) || lower.includes(`the ${key}`)) && key !== "background") {
      const replaceMatch = prompt.match(
        new RegExp(`replace\\s+(?:the\\s+)?${object}\\s+with\\s+(?:a\\s+)?([^,.]+)`, "i")
      );
      if (replaceMatch) {
        actions.push({
          action: "replace",
          replacement: replaceMatch[1]?.trim() ?? "described replacement",
        });
      }
    }
    if (key === "background" && /(?:replace|place|put).*(?:kitchen|scene|background|room)/.test(lower)) {
      const bgMatch = prompt.match(/(?:with|into|in)\s+(?:a\s+)?([^,.]+)/i);
      actions.push({
        action: "replace",
        replacement: bgMatch?.[1]?.trim() ?? "described scene",
      });
    }

    if (actions.length > 0) {
      results.push({
        object,
        objectCategory: inferObjectCategory(object),
        actions,
      });
    }
  }

  return results;
}

function extractStyleChanges(prompt: string): ParsedStyleChange[] {
  const lower = prompt.toLowerCase();
  const results: ParsedStyleChange[] = [];
  const seen = new Set<string>();

  const rules: Array<{ pattern: RegExp; attribute: EditorStyleAttribute; actionId: string; instruction: string }> = [
    { pattern: /premium|more luxury|luxury palette/, attribute: "color_palette", actionId: "more_premium", instruction: "Make the overall color palette more premium." },
    { pattern: /more vibrant|vibrant color/, attribute: "color_palette", actionId: "more_vibrant", instruction: "Make the color palette more vibrant." },
    { pattern: /more realistic.{0,20}proportion|proportion.{0,20}realistic|slightly more realistic/, attribute: "body_proportions", actionId: "more_realistic", instruction: "Make body proportions slightly more realistic." },
    { pattern: /thicker outline|outline.{0,12}thick|increase outline/, attribute: "outline_style", actionId: "thicker", instruction: "Increase outline thickness." },
    { pattern: /stronger line|line weight|thicker lines/, attribute: "line_weight", actionId: "stronger", instruction: "Use stronger line weight." },
    { pattern: /friendlier face|more expressive/, attribute: "facial_style", actionId: "more_expressive", instruction: "Make facial style more expressive." },
    { pattern: /more mascot|mascot.driven/, attribute: "illustration_style", actionId: "more_mascot", instruction: "Make illustration style more mascot-driven." },
    { pattern: /stronger homecheff|brand color/, attribute: "brand_colors", actionId: "stronger_homecheff", instruction: "Strengthen HomeCheff brand colors." },
    { pattern: /more iconic|recognizable silhouette/, attribute: "silhouette", actionId: "more_iconic", instruction: "Make silhouette more iconic." },
  ];

  for (const rule of rules) {
    if (!rule.pattern.test(lower)) {
      continue;
    }
    const key = `${rule.attribute}:${rule.actionId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push({
      styleAttribute: rule.attribute,
      actionId: rule.actionId,
      instruction: rule.instruction,
    });
  }

  return results;
}

function buildSuggestions(objects: ParsedInstructionObject[], prompt: string): string[] {
  const suggestions: string[] = [];
  const lower = prompt.toLowerCase();
  if (objects.some((o) => o.objectCategory === "clothing")) {
    suggestions.push("editor.instructionStudio.v2.director.suggest.logoPlacement");
  }
  if (/packaging|product/.test(lower)) {
    suggestions.push("editor.instructionStudio.v2.director.suggest.packaging");
  }
  if (!/motion|video|print|social/.test(lower)) {
    suggestions.push("editor.instructionStudio.v2.director.suggest.socialVersion");
    suggestions.push("editor.instructionStudio.v2.director.suggest.motionReady");
  }
  return suggestions;
}

export function parseEditorInstructionRequest(prompt: string): ParsedEditorInstructionRequest {
  const trimmed = prompt.trim();
  const objects = extractObjects(trimmed);
  const styleChanges = extractStyleChanges(trimmed);
  return {
    rawPrompt: trimmed,
    objects,
    styleChanges,
    outputTarget: detectOutputTarget(trimmed),
    suggestions: buildSuggestions(objects, trimmed),
  };
}

export function parsedRequestToChangePlanEntries(
  parsed: ParsedEditorInstructionRequest,
  resolveObjectId: (label: string, category: EditorInstructionObjectCategory) => string
): EditorInstructionChangePlanEntry[] {
  const items: EditorInstructionChangePlanEntry[] = [];
  let order = 0;
  for (const obj of parsed.objects) {
    for (const act of obj.actions) {
      const selection = {
        objectKey: resolveObjectId(obj.object, obj.objectCategory),
        objectLabel: obj.object,
        category: obj.objectCategory,
        action: act.action,
        replacement: act.replacement,
        color: act.color,
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
        brandingPlacementHint: act.logo ? "chest area" : undefined,
      };
      items.push(buildChangePlanItemFromSelection(selection, order));
      order += 1;
    }
  }
  for (const style of parsed.styleChanges) {
    const options = EDITOR_STYLE_ACTIONS[style.styleAttribute];
    const action = options.find((o) => o.id === style.actionId) ?? options[0];
    if (!action) {
      continue;
    }
    items.push(
      buildStyleChangePlanItem({
        styleAttribute: style.styleAttribute,
        action,
        order,
      })
    );
    order += 1;
  }
  return items;
}

/** @deprecated use parsedRequestToChangePlanEntries */
export function parsedRequestToChangePlanItems(
  parsed: ParsedEditorInstructionRequest,
  resolveObjectId: (label: string, category: EditorInstructionObjectCategory) => string
) {
  return parsedRequestToChangePlanEntries(parsed, resolveObjectId).filter(
    (e) => e.entryType !== "style"
  );
}
