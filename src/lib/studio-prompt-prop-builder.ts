import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import { buildPropIdentityPromptContext } from "@/lib/studio-prop-identity-visual-hints";
import type { StudioPropListItem } from "@/types/studio-api";

export function buildPropPromptLine(
  prop: PropSnapshot,
  sourceProp?: StudioPropListItem | null
): string {
  const parts = [prop.name];
  if (prop.description.trim()) {
    parts.push(prop.description.trim());
  } else if (prop.category === "brand_asset") {
    parts.push("branded asset visible in frame");
  }
  const identityContext = buildPropIdentityPromptContext(sourceProp ?? null);
  if (identityContext) {
    parts.push(identityContext);
  }
  return parts.join(" — ");
}

export function buildPropsPrompt(
  props: PropSnapshot[],
  sourceProps?: StudioPropListItem[]
): string {
  if (props.length === 0) {
    return "";
  }
  const byId = new Map((sourceProps ?? []).map((p) => [p.id, p]));
  return props
    .map((prop) => buildPropPromptLine(prop, byId.get(prop.id) ?? null))
    .join("\n");
}
