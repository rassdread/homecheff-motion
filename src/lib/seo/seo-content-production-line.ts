import type { SeoContentSection } from "@/lib/seo/seo-content-types";

export type ProductionLineContext = {
  audience: string;
  goal: string;
  painPoint: string;
  exampleProject: string;
  workflowAngle: string;
  outputType: string;
  recommendedStartingPoint: string;
  relatedUseCase: string;
  conversionReason: string;
  locale?: "en" | "nl";
};

export function buildUniqueProductionLineSection(ctx: ProductionLineContext): SeoContentSection {
  const isNl = ctx.locale === "nl";

  if (isNl) {
    return {
      heading: `Productielijn voor ${ctx.audience}`,
      paragraphs: [
        `${ctx.audience} willen ${ctx.goal} zonder elke week opnieuw te beginnen. ${ctx.painPoint} HomeCheff verbindt Idee → Wereld → Personages → Stemmen → Scènes → Video → Vertaling → Publicatie zodat ${ctx.workflowAngle} voorspelbaar wordt.`,
        `Praktisch voorbeeld: ${ctx.exampleProject}. Start in ${ctx.recommendedStartingPoint}, sla goedgekeurde assets op in Library, en exporteer ${ctx.outputType} vanuit Publish wanneer storyboard en motion kloppen.`,
        `${ctx.conversionReason} Dit sluit aan bij ${ctx.relatedUseCase} — hergebruik scènes in plaats van losse clips opnieuw te monteren.`,
      ],
      bullets: [
        "Eerst storyboard-stills goedkeuren",
        "Personages en werelden in Library",
        "Motion pas na scene-lock",
        "Ondertitels voor mobiel zonder geluid",
        "Credits vooraf op /pricing bekijken",
      ],
    };
  }

  return {
    heading: `Production line for ${ctx.audience}`,
    paragraphs: [
      `${ctx.audience} need to ${ctx.goal} without rebuilding every week. ${ctx.painPoint} HomeCheff connects Idea → World → Characters → Voices → Scenes → Video → Translation → Publishing so ${ctx.workflowAngle} stays predictable.`,
      `Practical example: ${ctx.exampleProject}. Begin in ${ctx.recommendedStartingPoint}, store approved assets in Library, and export ${ctx.outputType} from Publish once storyboard stills and motion are signed off.`,
      `${ctx.conversionReason} This aligns with ${ctx.relatedUseCase} — reuse scenes instead of re-editing one-off clips.`,
    ],
    bullets: [
      "Approve storyboard stills first",
      "Characters and worlds in Library",
      "Motion only after scene lock",
      "Subtitles for silent mobile feeds",
      "Check credits on /pricing upfront",
    ],
  };
}
