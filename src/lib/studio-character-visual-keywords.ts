/**
 * Parse structured identity tokens from visualKeywords (hc:key=value).
 * Shared by identity builder and canonical reference resolution.
 */

export type StructuredVisualKeywords = {
  characterType: string;
  visualStyle: string;
  shapeLanguage: string;
  energy: string;
  colorTheme: string;
};

const STRUCTURED_PREFIX = "hc:";

export function parseStructuredKeywordsFromVisualKeywords(raw: string | null | undefined): StructuredVisualKeywords {
  const result: StructuredVisualKeywords = {
    characterType: "",
    visualStyle: "",
    shapeLanguage: "",
    energy: "",
    colorTheme: "",
  };

  for (const token of (raw ?? "").split(",").map((part) => part.trim()).filter(Boolean)) {
    if (!token.startsWith(STRUCTURED_PREFIX)) continue;
    const body = token.slice(STRUCTURED_PREFIX.length);
    const eq = body.indexOf("=");
    if (eq === -1) continue;
    const key = body.slice(0, eq).trim();
    const value = body.slice(eq + 1).trim();
    if (key === "type") result.characterType = value;
    else if (key === "style") result.visualStyle = value;
    else if (key === "shape") result.shapeLanguage = value;
    else if (key === "energy") result.energy = value;
    else if (key === "color") result.colorTheme = value;
  }

  return result;
}
