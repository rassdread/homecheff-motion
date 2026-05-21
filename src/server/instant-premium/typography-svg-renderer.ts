import sharp from "sharp";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";
import {
  analyzeTypographyStyleProfile,
  applyTextTransform,
  parseTypographyStyleProfile,
  resolveTypographyCssFontFamily,
  type TypographyRenderQuality,
  type TypographyStyleProfile,
  typographyRenderScale,
  type TypographyFitResult,
} from "@/lib/typography-style-profile";
import { mirrorPaddingForRtl } from "@/lib/typography-smart-fit";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function snapSubpixel(value: number, enabled: boolean): number {
  return enabled ? Math.round(value * 2) / 2 : value;
}

function gradientDef(id: string, profile: TypographyStyleProfile): string {
  if (!profile.gradient) {
    return "";
  }
  const angle = profile.gradient.angle;
  return `<linearGradient id="${id}" gradientTransform="rotate(${angle})">
    <stop offset="0%" stop-color="${profile.gradient.from}"/>
    <stop offset="100%" stop-color="${profile.gradient.to}"/>
  </linearGradient>`;
}

function filterDef(id: string, profile: TypographyStyleProfile): string {
  const parts: string[] = [];
  if (profile.shadow) {
    parts.push(
      `<feDropShadow dx="${profile.shadow.offsetX}" dy="${profile.shadow.offsetY}" stdDeviation="${profile.shadow.blur / 2}" flood-color="${profile.shadow.color}"/>`
    );
  }
  if (profile.glow) {
    parts.push(
      `<feGaussianBlur stdDeviation="${profile.glow.blur / 2}" result="glow"/>
       <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>`
    );
  }
  if (parts.length === 0) {
    return "";
  }
  return `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%">${parts.join("")}</filter>`;
}

export function buildTypographyLayerSvg(params: {
  layer: LanguageTextLayerRecord;
  languageCode: string;
  canvasWidth: number;
  canvasHeight: number;
  fit: TypographyFitResult;
  quality: TypographyRenderQuality;
}): string {
  const profile =
    parseTypographyStyleProfile(params.layer.typography) ??
    analyzeTypographyStyleProfile({
      sourceText: params.layer.sourceText,
      fontSize: params.layer.fontSize,
      color: params.layer.color,
      textAlign: params.layer.textAlign,
      languageCode: params.languageCode,
    });
  const scale = typographyRenderScale(params.quality);
  const width = Math.round(params.canvasWidth * scale);
  const height = Math.round(params.canvasHeight * scale);
  const regionW = Math.round((params.layer.width ?? 0.55) * width);
  const regionH = Math.round((params.layer.height ?? 0.14) * height);
  const anchorX = profile.compositing.motionAnchor.x ?? params.layer.x;
  const anchorY = profile.compositing.motionAnchor.y ?? params.layer.y;
  const isRtl = profile.compositing.direction === "rtl" || params.languageCode === "ar";
  const padding = isRtl ? mirrorPaddingForRtl(profile.padding) : profile.padding;

  const left = snapSubpixel(
    (anchorX - (params.layer.width ?? 0.55) / 2) * width,
    profile.compositing.subpixelSnap
  );
  const top = snapSubpixel(anchorY * height, profile.compositing.subpixelSnap);

  const fontFamily = resolveTypographyCssFontFamily(params.languageCode, profile.fontFamilyStyle);
  const fontSize = params.fit.fontSize * scale;
  const lineHeight = params.fit.lineHeightPx * scale;
  const textAnchor =
    profile.textAlign === "left" ? "start" : profile.textAlign === "right" ? "end" : "middle";
  const textX =
    profile.textAlign === "left"
      ? left + padding.left
      : profile.textAlign === "right"
        ? left + regionW - padding.right
        : left + regionW / 2;

  const displayLines = params.fit.lines.map((line) =>
    applyTextTransform(line, profile.textTransform)
  );
  const filterId = `f-${params.layer.id.replace(/[^a-z0-9]/gi, "")}`;
  const gradId = `g-${params.layer.id.replace(/[^a-z0-9]/gi, "")}`;

  const bgShape =
    profile.background?.shape === "pill"
      ? Math.min(regionH, 9999) / 2
      : profile.background?.shape === "comic-bubble"
        ? 22
        : profile.background?.borderRadius ?? 12;

  const bgRect =
    profile.background != null
      ? `<rect x="${left}" y="${top}" width="${regionW}" height="${regionH}" rx="${bgShape * scale}" fill="${profile.background.color}" fill-opacity="${profile.background.opacity}"/>`
      : "";

  const strokeAttr = profile.stroke
    ? `stroke="${profile.stroke.color}" stroke-width="${profile.stroke.width * scale}" paint-order="stroke fill"`
    : "";

  const fillAttr = profile.gradient
    ? `fill="url(#${gradId})"`
    : `fill="${profile.fillColor}"`;

  const tspans = displayLines
    .map((line, index) => {
      const dy = index === 0 ? padding.top + fontSize : lineHeight;
      return `<tspan x="${textX}" dy="${index === 0 ? dy : lineHeight}" direction="${isRtl ? "rtl" : "ltr"}" unicode-bidi="${isRtl ? "embed" : "normal"}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${gradientDef(gradId, profile)}
    ${filterDef(filterId, profile)}
  </defs>
  ${bgRect}
  <text
    filter="url(#${filterId})"
    font-family="${escapeXml(fontFamily)}"
    font-size="${fontSize}"
    font-weight="${profile.fontWeight}"
    letter-spacing="${profile.letterSpacing * scale}em"
    text-anchor="${textAnchor}"
    dominant-baseline="alphabetic"
    opacity="${profile.opacity}"
    ${fillAttr}
    ${strokeAttr}
    direction="${isRtl ? "rtl" : "ltr"}"
    unicode-bidi="${isRtl ? "plaintext" : "normal"}"
  >
    ${tspans}
  </text>
</svg>`;
}

export async function rasterizeTypographyLayerPng(params: {
  svg: string;
  canvasWidth: number;
  canvasHeight: number;
  quality: TypographyRenderQuality;
}): Promise<Buffer> {
  const scale = typographyRenderScale(params.quality);
  const width = Math.round(params.canvasWidth * scale);
  const height = Math.round(params.canvasHeight * scale);
  return sharp(Buffer.from(params.svg), { density: 144 * scale })
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 6, quality: 100 })
    .toBuffer();
}

export async function renderTypographyPreviewDataUrl(params: {
  layer: LanguageTextLayerRecord;
  languageCode: string;
  canvasWidth: number;
  canvasHeight: number;
  fit: TypographyFitResult;
  quality?: TypographyRenderQuality;
}): Promise<string> {
  const previewW = 640;
  const previewH = Math.round((params.canvasHeight / params.canvasWidth) * previewW);
  const svg = buildTypographyLayerSvg({
    ...params,
    canvasWidth: previewW,
    canvasHeight: previewH,
    quality: "standard",
  });
  const png = await sharp(Buffer.from(svg))
    .resize(previewW, previewH)
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
