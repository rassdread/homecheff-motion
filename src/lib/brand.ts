import { studioVisual } from "@/lib/studio-visual-tokens";

export const brand = {
  productName: "HomeCheff Motion",
  /** Primary product brand shown in app shell and marketing surfaces */
  studioProductName: "HomeCheff Studio",
  shortName: "HomeCheff",
  accentGradient: "from-[#006D52] via-[#007a5c] to-[#0067B1]",
  /** Unified cinematic page background for product routes */
  softGradientBg: studioVisual.pageBg,
  /** HomeCheff Studio brand colors */
  studioGreen: "#006D52",
  studioBlue: "#0067B1",
} as const;
