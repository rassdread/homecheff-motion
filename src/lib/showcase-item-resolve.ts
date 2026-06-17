import {
  HOMECHEFF_EXAMPLES,
  listAllExamples,
  listExamplesForService,
  type HomeCheffExample,
  type HomeCheffExampleService,
} from "@/lib/homecheff-examples";
import { studioShowcaseItemToExample } from "@/lib/showcase-item-mapper";
import type { ShowcasePageKey, StudioShowcaseItemRecord } from "@/types/studio-showcase-item";

export function isShowcaseItemScheduleActive(
  item: Pick<StudioShowcaseItemRecord, "isActive" | "startsAt" | "endsAt">,
  now: Date
): boolean {
  if (!item.isActive) {
    return false;
  }
  if (item.startsAt) {
    const start = new Date(item.startsAt);
    if (now < start) {
      return false;
    }
  }
  if (item.endsAt) {
    const end = new Date(item.endsAt);
    if (now > end) {
      return false;
    }
  }
  return true;
}

export function filterActiveShowcaseItems(
  items: StudioShowcaseItemRecord[],
  now: Date,
  locale?: string | null
): StudioShowcaseItemRecord[] {
  return items
    .filter((item) => isShowcaseItemScheduleActive(item, now))
    .filter((item) => {
      if (!locale?.trim()) {
        return true;
      }
      if (!item.locale?.trim()) {
        return true;
      }
      return item.locale.trim().toLowerCase() === locale.trim().toLowerCase();
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

function staticFallbackForPageKey(pageKey: ShowcasePageKey): HomeCheffExample[] {
  switch (pageKey) {
    case "studio":
      return listExamplesForService("studio");
    case "editor":
      return listExamplesForService("editor");
    case "motion":
      return listExamplesForService("motion");
    case "publish":
      return listExamplesForService("publish");
    case "library":
    case "projects":
    case "usage":
    case "global":
      return listAllExamples();
    case "home":
    default:
      return listAllExamples();
  }
}

export function resolvePublicShowcaseExamples(params: {
  pageKey: ShowcasePageKey;
  pageItems: StudioShowcaseItemRecord[];
  globalItems: StudioShowcaseItemRecord[];
  now?: Date;
  locale?: string | null;
}): { examples: HomeCheffExample[]; source: "page" | "global" | "static" } {
  const now = params.now ?? new Date();
  const pageActive = filterActiveShowcaseItems(params.pageItems, now, params.locale);
  if (pageActive.length > 0) {
    return {
      examples: pageActive.map(studioShowcaseItemToExample),
      source: "page",
    };
  }

  const globalActive = filterActiveShowcaseItems(params.globalItems, now, params.locale);
  if (globalActive.length > 0) {
    return {
      examples: globalActive.map(studioShowcaseItemToExample),
      source: "global",
    };
  }

  return {
    examples: staticFallbackForPageKey(params.pageKey),
    source: "static",
  };
}

export function mapShowcasePageKeyToDbQuery(pageKey: string): ShowcasePageKey {
  const normalized = pageKey.trim().toLowerCase();
  const allowed: ShowcasePageKey[] = [
    "home",
    "studio",
    "editor",
    "motion",
    "publish",
    "library",
    "projects",
    "usage",
    "global",
  ];
  if (allowed.includes(normalized as ShowcasePageKey)) {
    return normalized as ShowcasePageKey;
  }
  return "home";
}

export function staticExamplesCatalogSize(): number {
  return HOMECHEFF_EXAMPLES.length;
}

export function staticExamplesForService(service: HomeCheffExampleService): HomeCheffExample[] {
  return listExamplesForService(service);
}
