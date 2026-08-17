/**
 * PX.3 — Simple Studio Home / intent-first creation entry.
 *
 * Routing layer only. Existing engines, routes, PX.2 labels, SSO, credits,
 * and advanced tools stay. HomeCheff listing context enters via PX.4
 * `/studio/from/homecheff/{type}/{id}` and still uses this chooser.
 */

import type { TranslationKey } from "@/i18n";
import { PX2_PRESERVED_ROUTES, px2Cta } from "@/lib/studio-px2-terminology";

export const PX3_PRODUCT_BRAND = "HomeCheff Studio";

export type Px3IntentId = "image" | "video" | "story" | "animation" | "edit";

export type Px3Intent = {
  id: Px3IntentId;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  href: string;
};

/**
 * Ordinary-language intents → existing workflows.
 * Video = produce a video from an idea (orchestrator / studio start).
 * Animation = bring an existing image/scene to life (motion start).
 * Finish/publish is not a start intent — it stays in Meer tools.
 */
export const PX3_INTENTS: readonly Px3Intent[] = [
  {
    id: "image",
    titleKey: "px3.intent.image.title",
    descriptionKey: "px3.intent.image.desc",
    href: "/editor/start",
  },
  {
    id: "video",
    titleKey: "px3.intent.video.title",
    descriptionKey: "px3.intent.video.desc",
    href: "/studio/start",
  },
  {
    id: "story",
    titleKey: "px3.intent.story.title",
    descriptionKey: "px3.intent.story.desc",
    href: "/studio/storyboards/new",
  },
  {
    id: "animation",
    titleKey: "px3.intent.animation.title",
    descriptionKey: "px3.intent.animation.desc",
    href: "/motion/start",
  },
  {
    id: "edit",
    titleKey: "px3.intent.edit.title",
    descriptionKey: "px3.intent.edit.desc",
    href: "/projects",
  },
] as const;

/** Destinations in global chrome — not the five-product pipeline. */
export const PX3_GLOBAL_NAV_HREFS = ["/", "/projects", "/library"] as const;

/** Expert/direct product access — overflow, not the front door. */
export const PX3_TOOL_NAV_HREFS = ["/editor", "/studio", "/motion", "/publish"] as const;

export const PX3_HOME_CREATE_HREF = px2Cta("chooseIntent").destination ?? "/studio/experience";
export const PX3_HOME_CONTINUE_HREF = "/studio";

export const PX3_PRESERVED_ROUTES = PX2_PRESERVED_ROUTES;

export function px3Intent(id: Px3IntentId): Px3Intent {
  const intent = PX3_INTENTS.find((entry) => entry.id === id);
  if (!intent) {
    throw new Error(`Unknown PX.3 intent: ${id}`);
  }
  return intent;
}
