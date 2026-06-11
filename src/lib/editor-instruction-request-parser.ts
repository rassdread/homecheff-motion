import { buildChangePlanItemFromSelection } from "@/lib/editor-instruction-change-plan";
import type {
  EditorInstructionChangePlanItem,
  EditorInstructionDynamicAction,
  EditorInstructionObjectCategory,
  EditorInstructionOutputTarget,
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

export type ParsedEditorInstructionRequest = {
  rawPrompt: string;
  objects: ParsedInstructionObject[];
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
    /\b(apron|lab coat|white lab coat|suit|jacket|tie|shoes|globe|logo|background|mascot|character|face|packaging|text)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = objectPattern.exec(lower)) !== null) {
    const object = match[1]!;
    const key = object.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const actions: ParsedInstructionAction[] = [];

    if (/add\s+(?:the\s+)?(?:homecheff\s+)?logo|logo\s+on/.test(lower) && /apron|coat|suit|jacket|clothing|packaging/.test(key)) {
      actions.push({ action: "add_logo", logo: "HomeCheff" });
    }
    if (/replace\s+(?:the\s+)?logo/.test(lower) && key === "logo") {
      actions.push({ action: "replace_logo", logo: "HomeCheff" });
    }
    if (/(make|change|turn).*(green|red|blue|black|white|#[0-9a-f]{3,8})/.test(lower) && lower.includes(key)) {
      const colorMatch = lower.match(/(green|red|blue|black|white|#[0-9a-f]{3,8})/);
      actions.push({ action: "change_color", color: colorMatch?.[1] });
    }
    if (/replace\s+(?:the\s+)?/.test(lower) && lower.includes(key) && key !== "background") {
      const replaceMatch = prompt.match(new RegExp(`replace\\s+(?:the\\s+)?${object}\\s+with\\s+([^,.]+)`, "i"));
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
  return {
    rawPrompt: trimmed,
    objects,
    outputTarget: detectOutputTarget(trimmed),
    suggestions: buildSuggestions(objects, trimmed),
  };
}

export function parsedRequestToChangePlanItems(
  parsed: ParsedEditorInstructionRequest,
  resolveObjectId: (label: string, category: EditorInstructionObjectCategory) => string
): EditorInstructionChangePlanItem[] {
  const items: EditorInstructionChangePlanItem[] = [];
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
  return items;
}
