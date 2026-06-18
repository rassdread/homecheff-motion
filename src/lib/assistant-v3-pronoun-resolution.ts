/**
 * Editor-first pronoun resolution for Assistant V3.5.
 */

import type { AssistantSessionMemory } from "@/lib/assistant-session-memory";
import type { AssistantEditorContextHint } from "@/types/assistant-v3";

const PLURAL_PRONOUNS = /\b(ze|zij|them|those|these|deze|dit)\b/i;
const DEMONSTRATIVE = /\b(deze|dit|this)\b/i;

export function resolveEditorAwareMessage(
  message: string,
  editorContext: AssistantEditorContextHint | null | undefined,
  memory: AssistantSessionMemory
): string {
  const text = message.trim();
  if (!text) {
    return message;
  }

  const partName =
    editorContext?.selectedPartName ??
    memory.v3?.selectedPartName ??
    null;
  const partGroup =
    editorContext?.selectedPartGroup ??
    memory.v3?.selectedPartGroup ??
    null;
  const assetName =
    editorContext?.selectedAssetName ??
    memory.v3?.selectedAssetName ??
    memory.conversationMemory?.lastCharacter ??
    null;

  if (!partName && !assetName) {
    return message;
  }

  const lower = text.toLowerCase();

  if (PLURAL_PRONOUNS.test(lower) && partGroup === "eyes" && partName) {
    return text.replace(/\b(ze|zij|them|those)\b/gi, partName);
  }

  if (DEMONSTRATIVE.test(lower) && partName) {
    if (/blauw|blue|groter|bigger|kleiner|smaller|rood|red|groen|green/.test(lower)) {
      return `${text} (${partName})`;
    }
  }

  if (/\b(ogen|eyes)\b/i.test(lower) && assetName) {
    return text.replace(/\b(zijn|haar|its)\s+(ogen|eyes)\b/gi, `de ogen van ${assetName}`);
  }

  if (/\bhem\b/i.test(lower) && assetName && !partName) {
    return `${text} (${assetName})`;
  }

  if (/\bhem\b/i.test(lower) && partName) {
    return text.replace(/\bhem\b/gi, partName);
  }

  return message;
}
