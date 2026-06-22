import type { HomeCheffExample, HomeCheffExampleService } from "@/lib/homecheff-examples";
import { resolvePlayableVideoSrc } from "@/lib/playable-media-url";
import type { ShowcasePageKey, StudioShowcaseItemRecord } from "@/types/studio-showcase-item";

export function mapPageKeyToExampleService(pageKey: ShowcasePageKey): HomeCheffExampleService {
  switch (pageKey) {
    case "studio":
      return "studio";
    case "editor":
      return "editor";
    case "motion":
      return "motion";
    case "publish":
      return "publish";
    default:
      return "home";
  }
}

export function resolveShowcaseCardSrc(item: Pick<
  StudioShowcaseItemRecord,
  "mediaType" | "mediaUrl" | "thumbnailUrl" | "posterUrl"
>): string {
  if (item.thumbnailUrl?.trim()) {
    return item.thumbnailUrl.trim();
  }
  if (item.posterUrl?.trim()) {
    return item.posterUrl.trim();
  }
  return item.mediaUrl.trim();
}

export function resolveShowcaseModalSrc(item: Pick<
  StudioShowcaseItemRecord,
  "mediaType" | "mediaUrl" | "thumbnailUrl" | "posterUrl"
>): string {
  if (item.mediaType === "video") {
    const playable = resolvePlayableVideoSrc(item.mediaUrl);
    if (playable) {
      return playable;
    }
    return item.posterUrl?.trim() || item.thumbnailUrl?.trim() || "";
  }
  return item.mediaUrl.trim() || resolveShowcaseCardSrc(item);
}

function sanitizeShowcaseMediaUrl(
  item: Pick<StudioShowcaseItemRecord, "mediaType" | "mediaUrl" | "thumbnailUrl" | "posterUrl">
): string {
  const raw = item.mediaUrl.trim();
  if (item.mediaType !== "video") {
    return raw;
  }
  const playable = resolvePlayableVideoSrc(raw);
  if (playable) {
    return playable;
  }
  return item.posterUrl?.trim() || item.thumbnailUrl?.trim() || "";
}

export function studioShowcaseItemToExample(item: StudioShowcaseItemRecord): HomeCheffExample {
  const service =
    item.serviceKey ?
      (item.serviceKey as HomeCheffExampleService)
    : mapPageKeyToExampleService(item.pageKey);
  const cardSrc = resolveShowcaseCardSrc(item);
  const mediaUrl = sanitizeShowcaseMediaUrl(item);
  const effectiveMediaKind =
    item.mediaType === "video" && !resolvePlayableVideoSrc(mediaUrl) ? "image" : item.mediaType;
  return {
    id: item.id,
    service,
    title: item.title,
    subtitle: item.subtitle ?? undefined,
    description: item.description,
    thumbnailUrl: cardSrc,
    mediaUrl: mediaUrl || undefined,
    posterUrl: item.posterUrl ?? undefined,
    mediaKind: effectiveMediaKind,
    tags: item.category ? [item.category] : [],
    assistantPrompt: item.assistantPrompt ?? undefined,
    ctaLabel: item.ctaLabel ?? undefined,
    ctaHref: item.ctaHref ?? undefined,
  };
}
