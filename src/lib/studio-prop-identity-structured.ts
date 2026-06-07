/** Prop structured identity encoding in appearanceMemory (hc:key=value tokens). */

const STRUCTURED_PREFIX = "hc:";
export const PROP_IDENTITY_DETAILS_MARKER = "[identity:details]";

export type StructuredPropKeywords = {
  propType: string;
  propFunction: string;
  shapeLanguage: string;
  material: string;
  colorTheme: string;
  sizeImpression: string;
  styleId: string;
  linkedCharacterIds: string[];
  freeTags: string[];
};

export function parsePropStructuredKeywords(raw: string): StructuredPropKeywords {
  const freeTags: string[] = [];
  const out: StructuredPropKeywords = {
    propType: "",
    propFunction: "",
    shapeLanguage: "",
    material: "",
    colorTheme: "",
    sizeImpression: "",
    styleId: "",
    linkedCharacterIds: [],
    freeTags,
  };

  const structuredPart = raw.split(PROP_IDENTITY_DETAILS_MARKER)[0] ?? raw;

  for (const part of structuredPart.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)) {
    if (part.startsWith(STRUCTURED_PREFIX)) {
      const body = part.slice(STRUCTURED_PREFIX.length);
      const eq = body.indexOf("=");
      if (eq <= 0) continue;
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1);
      if (key === "type") out.propType = value;
      if (key === "func") out.propFunction = value;
      if (key === "shape") out.shapeLanguage = value;
      if (key === "mat") out.material = value.replace(/\|/g, ", ");
      if (key === "color") out.colorTheme = value;
      if (key === "size") out.sizeImpression = value;
      if (key === "style") out.styleId = value;
      if (key === "chars") {
        out.linkedCharacterIds = value.split("|").map((id) => id.trim()).filter(Boolean);
      }
    } else {
      freeTags.push(part);
    }
  }
  return out;
}

export function encodePropStructuredKeywords(structured: StructuredPropKeywords): string {
  const tokens: string[] = [];
  if (structured.propType) tokens.push(`${STRUCTURED_PREFIX}type=${structured.propType}`);
  if (structured.propFunction) tokens.push(`${STRUCTURED_PREFIX}func=${structured.propFunction}`);
  if (structured.shapeLanguage) {
    tokens.push(`${STRUCTURED_PREFIX}shape=${structured.shapeLanguage}`);
  }
  if (structured.material) {
    tokens.push(`${STRUCTURED_PREFIX}mat=${structured.material.replace(/,\s*/g, "|")}`);
  }
  if (structured.colorTheme) tokens.push(`${STRUCTURED_PREFIX}color=${structured.colorTheme}`);
  if (structured.sizeImpression) tokens.push(`${STRUCTURED_PREFIX}size=${structured.sizeImpression}`);
  if (structured.styleId) tokens.push(`${STRUCTURED_PREFIX}style=${structured.styleId}`);
  if (structured.linkedCharacterIds.length > 0) {
    tokens.push(`${STRUCTURED_PREFIX}chars=${structured.linkedCharacterIds.join("|")}`);
  }
  tokens.push(...structured.freeTags);
  return tokens.join(", ");
}

export function parsePropAppearanceDetails(raw: string): string {
  const idx = raw.indexOf(PROP_IDENTITY_DETAILS_MARKER);
  if (idx === -1) {
    const structured = parsePropStructuredKeywords(raw);
    const hasStructured = Boolean(
      structured.propType ||
        structured.propFunction ||
        structured.shapeLanguage ||
        structured.material ||
        structured.colorTheme ||
        structured.sizeImpression ||
        structured.styleId ||
        structured.linkedCharacterIds.length > 0
    );
    if (hasStructured) {
      return "";
    }
    return raw.trim();
  }
  return raw.slice(idx + PROP_IDENTITY_DETAILS_MARKER.length).trim();
}

export function buildPropAppearanceMemory(structured: StructuredPropKeywords, details: string): string {
  const encoded = encodePropStructuredKeywords(structured);
  const trimmedDetails = details.trim();
  if (!encoded && !trimmedDetails) {
    return "";
  }
  if (!encoded) {
    return trimmedDetails;
  }
  if (!trimmedDetails) {
    return encoded;
  }
  return `${encoded}\n\n${PROP_IDENTITY_DETAILS_MARKER}\n${trimmedDetails}`;
}

export function extractPropStructuredKeywordString(appearanceMemory: string): string {
  return encodePropStructuredKeywords(parsePropStructuredKeywords(appearanceMemory));
}
