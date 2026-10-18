/**
 * Account-level voice favorites. The store keeps the provider id, not a copy of the catalog row.
 */

export const VOICE_FAVORITE_PROVIDER = "elevenlabs";
export const VOICE_FAVORITE_PAGE_SIZE = 24;

export function normalizeFavoriteVoiceId(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : "";
}

export type VoiceFavoriteRow = {
  userId: string;
  provider: string;
  providerVoiceId: string;
  createdAt: Date;
};

export type VoiceFavoriteStore = {
  list(userId: string): Promise<VoiceFavoriteRow[]>;
  add(row: { userId: string; provider: string; providerVoiceId: string }): Promise<void>;
  remove(row: { userId: string; provider: string; providerVoiceId: string }): Promise<void>;
};

export async function setVoiceFavoriteWithStore(
  store: VoiceFavoriteStore,
  input: { userId: string; providerVoiceId: string; favorite: boolean; provider?: string }
): Promise<"added" | "removed" | "invalid"> {
  const providerVoiceId = normalizeFavoriteVoiceId(input.providerVoiceId);
  const provider = (input.provider ?? VOICE_FAVORITE_PROVIDER).trim();
  if (!input.userId.trim() || !providerVoiceId || provider !== VOICE_FAVORITE_PROVIDER) {
    return "invalid";
  }
  const key = { userId: input.userId, provider, providerVoiceId };
  if (input.favorite) {
    await store.add(key);
    return "added";
  }
  await store.remove(key);
  return "removed";
}

export function pageFavoriteRows(rows: VoiceFavoriteRow[], page: number, pageSize = VOICE_FAVORITE_PAGE_SIZE) {
  const ordered = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.providerVoiceId.localeCompare(b.providerVoiceId));
  const size = Math.min(48, Math.max(1, pageSize));
  const safePage = Math.max(0, Math.floor(page));
  return {
    total: ordered.length,
    page: safePage,
    pageSize: size,
    rows: ordered.slice(safePage * size, safePage * size + size),
  };
}
