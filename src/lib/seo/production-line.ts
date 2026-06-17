import type { SeoContentSection } from "@/lib/seo/seo-content-types";

export const PRODUCTION_LINE_STEPS = [
  { step: "Idee", detail: "Production brief en storyboard in Studio" },
  { step: "Wereld", detail: "Worlds, locaties en sfeer vastleggen" },
  { step: "Personages", detail: "Character identity in Library" },
  { step: "Stemmen", detail: "Voice library en character voices" },
  { step: "Scènes", detail: "Scene images en scene planning" },
  { step: "Video", detail: "Motion — image-to-video en assembly" },
  { step: "Vertaling", detail: "Ondertitels en meertalige versies" },
  { step: "Publicatie", detail: "Export en version publishing" },
] as const;

export const PRODUCTION_LINE_SECTION_EN: SeoContentSection = {
  heading: "The HomeCheff production line",
  paragraphs: [
    "HomeCheff Studio is built around one connected workflow — not a single AI clip button. You plan first, generate with consistency, then publish versions from the same project.",
  ],
  bullets: PRODUCTION_LINE_STEPS.map((s) => `${s.step}: ${s.detail}`),
};

export const PRODUCTION_LINE_SECTION_NL: SeoContentSection = {
  heading: "De HomeCheff-productielijn",
  paragraphs: [
    "HomeCheff Studio draait om één verbonden workflow — geen losse AI-clip-knop. Je plant eerst, genereert met consistentie, en publiceert versies vanuit hetzelfde project.",
  ],
  bullets: PRODUCTION_LINE_STEPS.map((s) => `${s.step}: ${s.detail}`),
};
