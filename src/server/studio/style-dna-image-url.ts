import { getPublicOrigin } from "@/lib/public-origin";

export type StyleDnaImageUrlType =
  | "https"
  | "http"
  | "blob"
  | "data"
  | "relative"
  | "missing";

export function classifyStyleDnaImageUrl(imageUrl: string | undefined | null): StyleDnaImageUrlType {
  const trimmed = imageUrl?.trim() ?? "";
  if (!trimmed) {
    return "missing";
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("blob:")) {
    return "blob";
  }
  if (lower.startsWith("data:")) {
    return "data";
  }
  if (trimmed.startsWith("/")) {
    return "relative";
  }
  if (lower.startsWith("https://")) {
    return "https";
  }
  if (lower.startsWith("http://")) {
    return "http";
  }
  return "relative";
}

/** Resolve editor/library image URLs to an OpenAI-fetchable absolute https URL when possible. */
export function resolveStyleDnaImageUrlForProvider(imageUrl: string): {
  ok: true;
  url: string;
  urlType: StyleDnaImageUrlType;
} | {
  ok: false;
  urlType: StyleDnaImageUrlType;
  error: string;
} {
  const trimmed = imageUrl.trim();
  const urlType = classifyStyleDnaImageUrl(trimmed);

  if (urlType === "missing") {
    return { ok: false, urlType, error: "Reference image URL is required." };
  }
  if (urlType === "blob" || urlType === "data") {
    return {
      ok: false,
      urlType,
      error: "Local browser image URLs cannot be analyzed. Upload the image first.",
    };
  }

  let resolved = trimmed;
  if (urlType === "relative") {
    const base = getPublicOrigin().replace(/\/$/, "");
    resolved = `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  }

  try {
    const parsed = new URL(resolved);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, urlType, error: `Unsupported image URL protocol: ${parsed.protocol}` };
    }
    return { ok: true, url: parsed.toString(), urlType: urlType === "relative" ? "relative" : urlType };
  } catch {
    return { ok: false, urlType, error: "Image URL is not a valid absolute URL." };
  }
}
