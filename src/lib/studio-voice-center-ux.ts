import { parseVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";
import {
  buildVoiceRecommendations,
  filterMarketplaceEntries,
  type VoiceMarketplaceContext,
  type VoiceMarketplaceEntry,
} from "@/lib/studio-voice-marketplace";
import type { VoiceLibraryPayload } from "@/lib/studio-voice-library-client";
import {
  isClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  parseVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import type {
  VoicePersonaPresetGroupId,
  VoicePersonaResolvedPreset,
} from "@/lib/studio-voice-persona-presets";
import { VOICE_PERSONA_GROUP_LABEL_KEYS } from "@/lib/studio-voice-persona-presets";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";

export const PREVIEW_TEXT_DEBOUNCE_MS = 800;

export function resolvePersonaGroupFromCharacterType(
  characterType?: string
): VoicePersonaPresetGroupId {
  const hay = (characterType ?? "").toLowerCase();
  if (/chef|cook|kitchen|culinary|restaurant|food|bak/.test(hay)) {
    return "chef";
  }
  if (/garden|gardener|plant|grow|tuin|hort/.test(hay)) {
    return "garden";
  }
  if (/design|architect|interior|decor/.test(hay)) {
    return "designer";
  }
  return "community";
}

/** True when the user picked a library/clone voice or has selection memory. */
export function hasExplicitVoiceSelection(voiceProfile: string, voiceNotes: string): boolean {
  if (isLibraryVoiceProfileRef(voiceProfile) || isClonedVoiceProfileRef(voiceProfile)) {
    return true;
  }
  if (parseVoiceSelectionMemory(voiceNotes)) {
    return true;
  }
  const ref = parseVoiceProfileRef(voiceProfile);
  return ref.kind === "library" || ref.kind === "clone";
}

export function countVoiceRecommendations(params: {
  payload: VoiceLibraryPayload;
  marketplaceContext: VoiceMarketplaceContext;
  clones: UserVoiceLibraryEntry[];
}): number {
  return buildVoiceRecommendations({
    catalog: params.payload.catalog,
    clones: params.clones,
    context: params.marketplaceContext,
    personaPresets: params.payload.personaPresets,
    limit: 6,
  }).length;
}

export type VoiceQuickPick = {
  id: string;
  labelKey: string;
  entry: VoiceMarketplaceEntry;
};

const CARIBBEAN_ACCENT_IDS = new Set(["english.jamaican", "english.caribbean"]);

function addQuickPickEntries(
  picks: VoiceQuickPick[],
  seen: Set<string>,
  labelKey: string,
  entries: VoiceMarketplaceEntry[],
  limit: number,
  maxTotal: number
): boolean {
  let added = 0;
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    picks.push({ id: `${labelKey}-${entry.id}`, labelKey, entry });
    added += 1;
    if (picks.length >= maxTotal) {
      return true;
    }
    if (added >= limit) {
      return false;
    }
  }
  return picks.length >= maxTotal;
}

/** Curated quick picks from persona presets and accent/language filters (max 8). */
export function buildVoiceQuickPicks(
  entries: VoiceMarketplaceEntry[],
  personaPresets: VoicePersonaResolvedPreset[],
  maxTotal = 8
): VoiceQuickPick[] {
  const picks: VoiceQuickPick[] = [];
  const seen = new Set<string>();

  const voiceIdsForGroup = (groupId: VoicePersonaPresetGroupId) =>
    new Set(
      personaPresets
        .filter((p) => p.groupId === groupId && p.available && p.voiceId.trim())
        .map((p) => p.voiceId)
    );

  const entriesForVoiceIds = (voiceIds: Set<string>) =>
    entries.filter((e) => voiceIds.has(e.id));

  const specs: Array<{
    labelKey: string;
    resolve: () => VoiceMarketplaceEntry[];
    limit: number;
  }> = [
    {
      labelKey: "studio.voiceCenter.quickPick.chef",
      resolve: () => entriesForVoiceIds(voiceIdsForGroup("chef")),
      limit: 2,
    },
    {
      labelKey: "studio.voiceCenter.quickPick.dutch",
      resolve: () => filterMarketplaceEntries(entries, { language: "nl" }),
      limit: 2,
    },
    {
      labelKey: "studio.voiceCenter.quickPick.british",
      resolve: () => filterMarketplaceEntries(entries, { accentId: "english.british" }),
      limit: 2,
    },
    {
      labelKey: "studio.voiceCenter.quickPick.caribbean",
      resolve: () =>
        entries.filter(
          (e) =>
            (e.accentCanonicalId && CARIBBEAN_ACCENT_IDS.has(e.accentCanonicalId)) ||
            /jamaican|caribbean/i.test(e.accent)
        ),
      limit: 2,
    },
    {
      labelKey: "studio.voiceCenter.quickPick.community",
      resolve: () => entriesForVoiceIds(voiceIdsForGroup("community")),
      limit: 2,
    },
  ];

  for (const spec of specs) {
    if (
      addQuickPickEntries(picks, seen, spec.labelKey, spec.resolve(), spec.limit, maxTotal)
    ) {
      break;
    }
  }

  return picks;
}

export function personaGroupSummaryLabelKey(
  preferredGroupId: VoicePersonaPresetGroupId
): string {
  return VOICE_PERSONA_GROUP_LABEL_KEYS[preferredGroupId];
}
