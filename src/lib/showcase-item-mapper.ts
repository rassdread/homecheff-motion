import type { HomeCheffExample, HomeCheffExampleService } from "@/lib/homecheff-examples";
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
    return item.mediaUrl.trim();
  }
  return item.mediaUrl.trim() || resolveShowcaseCardSrc(item);
}

export function studioShowcaseItemToExample(item: StudioShowcaseItemRecord): HomeCheffExample {
  const service =
    item.serviceKey ?
      (item.serviceKey as HomeCheffExampleService)
    : mapPageKeyToExampleService(item.pageKey);
  const cardSrc = resolveShowcaseCardSrc(item);
  return {
    id: item.id,
    service,
    title: item.title,
    subtitle: item.subtitle ?? undefined,
    description: item.description,
    thumbnailUrl: cardSrc,
    mediaUrl: item.mediaUrl,
    posterUrl: item.posterUrl ?? undefined,
    mediaKind: item.mediaType,
    tags: item.category ? [item.category] : [],
    assistantPrompt: item.assistantPrompt ?? undefined,
    ctaLabel: item.ctaLabel ?? undefined,
    ctaHref: item.ctaHref ?? undefined,
  };
}
