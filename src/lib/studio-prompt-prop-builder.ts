import type { PropSnapshot } from "@/types/studio-prop-snapshot";

export function buildPropPromptLine(prop: PropSnapshot): string {
  const parts = [prop.name];
  if (prop.description.trim()) {
    parts.push(prop.description.trim());
  } else if (prop.category === "brand_asset") {
    parts.push("branded asset visible in frame");
  }
  return parts.join(" — ");
}

export function buildPropsPrompt(props: PropSnapshot[]): string {
  if (props.length === 0) {
    return "";
  }
  return props.map(buildPropPromptLine).join("\n");
}
