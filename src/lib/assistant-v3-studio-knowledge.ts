/**
 * Expanded Studio knowledge handlers for Assistant V3.5.
 */

import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

export function answerExpandedStudioKnowledge(input: {
  message: string;
  locale: "nl" | "en";
  pricingCatalog?: StudioPricingCatalogPublicEntry[];
}): string | null {
  const text = input.message.trim().toLowerCase();

  if (/verschil.*(world|wereld).*(location|locatie)|world.*vs.*location/.test(text)) {
    return nl(
      input.locale,
      "Een World is je complete setting-universum (stijl, regels, sfeer). Een Location is een concrete plek binnen die wereld, zoals een keuken, kantoor of tuin.",
      "A World is your complete setting universe (style, rules, mood). A Location is a concrete place within that world, such as a kitchen, office, or garden."
    );
  }

  if (/hoeveel credits.*morph|wat kost.*morph|morph.*cost|credits.*morph/.test(text)) {
    const imageRow = input.pricingCatalog?.find((row) => row.actionType === "image_generation");
    const credits = imageRow?.creditCost;
    if (credits != null) {
      return nl(
        input.locale,
        `Een morph in de Editor gebruikt beeldgeneratie — ongeveer ${credits} credits per variant, afhankelijk van model en complexiteit.`,
        `A morph in the Editor uses image generation — about ${credits} credits per variant, depending on model and complexity.`
      );
    }
    return nl(
      input.locale,
      "Morphs in de Editor gebruiken beeldgeneratie-credits. Bekijk /pricing voor actuele kosten.",
      "Morphs in the Editor use image generation credits. Check /pricing for current costs."
    );
  }

  if (/waarom.*render.*mislukt|render.*fail|why.*render/.test(text)) {
    return nl(
      input.locale,
      "Renders falen meestal door te lange prompts, ontbrekende assets, credit-limieten of provider-timeouts. Controleer je Motion-scènes, voice/subtitles en probeer opnieuw met een kortere prompt.",
      "Renders usually fail due to prompts that are too long, missing assets, credit limits, or provider timeouts. Check your Motion scenes, voice/subtitles, and retry with a shorter prompt."
    );
  }

  if (/hoe werken ondertitel|how do subtitles|subtitle.*work/.test(text)) {
    return nl(
      input.locale,
      "Ondertitels worden gegenereerd vanuit transcript/voice in Studio of Motion, daarna geëxporteerd bij publish. Je kunt timing en taal per export aanpassen.",
      "Subtitles are generated from transcript/voice in Studio or Motion, then exported at publish. You can adjust timing and language per export."
    );
  }

  if (/verschil.*(motion|studio)|motion.*vs.*studio/.test(text)) {
    return nl(
      input.locale,
      "Studio is je creatieve werkplaats voor personages, werelden, storyboards en assets. Motion zet die assets om in bewegende clips en renders. Editor is voor beeldbewerking, morphs en fusion.",
      "Studio is your creative workshop for characters, worlds, storyboards, and assets. Motion turns those assets into moving clips and renders. Editor is for image editing, morphs, and fusion."
    );
  }

  if (/wat is (library|bibliotheek)/.test(text) || /what is (the )?library/.test(text)) {
    return nl(
      input.locale,
      "Library bewaart al je personages, props, locaties, voice, muziek, fusion-outputs en exports — herbruikbaar in Studio, Editor en Motion.",
      "Library stores all your characters, props, locations, voice, music, fusion outputs, and exports — reusable across Studio, Editor, and Motion."
    );
  }

  if (/subscription|abonnement|credits?/.test(text) && /hoe|what|how/.test(text)) {
    return nl(
      input.locale,
      "Credits worden verbruikt bij generatie (beeld, video, voice, muziek). Abonnementen geven maandelijkse credits en toegang tot Studio-modules. Bekijk /pricing en je account.",
      "Credits are consumed for generation (image, video, voice, music). Subscriptions provide monthly credits and Studio module access. See /pricing and your account."
    );
  }

  if (/wat is (een )?character|what is (a )?character|personage/.test(text)) {
    return nl(
      input.locale,
      "Een Character is een herbruikbaar personage in Studio — met uiterlijk, stijl en consistentie voor storyboards, Motion en Editor-morphs.",
      "A Character is a reusable persona in Studio — with look, style, and consistency for storyboards, Motion, and Editor morphs."
    );
  }

  if (/wat is (een )?prop|what is (a )?prop/.test(text)) {
    return nl(
      input.locale,
      "Props zijn losse objecten (producten, gereedschap, decor) die je in scènes plaatst. Ze leven in Library en kunnen in Studio, Editor en Motion worden hergebruikt.",
      "Props are standalone objects (products, tools, decor) you place in scenes. They live in Library and can be reused in Studio, Editor, and Motion."
    );
  }

  if (/hoe werkt voice|how does voice|voice-over|voiceover/.test(text)) {
    return nl(
      input.locale,
      "Voice-over wordt gegenereerd vanuit je script of scènetekst in Studio/Motion. Kies stem, taal en stijl; de audio wordt gekoppeld aan je project en export.",
      "Voice-over is generated from your script or scene text in Studio/Motion. Pick voice, language, and style; audio is linked to your project and export."
    );
  }

  if (/hoe werkt muziek|how does music|background music/.test(text)) {
    return nl(
      input.locale,
      "Muziek wordt gegenereerd of gekozen per project in Studio/Motion. Je kunt sfeer, tempo en duur sturen; tracks landen in Library voor hergebruik.",
      "Music is generated or selected per project in Studio/Motion. You can steer mood, tempo, and length; tracks land in Library for reuse."
    );
  }

  if (/sound effect|geluidseffect|how does sound/.test(text)) {
    return nl(
      input.locale,
      "Geluidseffecten versterken scènes in Motion — denk aan overgangen, UI-klikken of sfeer. Ze worden naast voice en muziek geëxporteerd.",
      "Sound effects reinforce scenes in Motion — think transitions, UI clicks, or ambience. They export alongside voice and music."
    );
  }

  if (/vertaling|translation|locali[sz]/.test(text) && /hoe|what|how|werkt/.test(text)) {
    return nl(
      input.locale,
      "Vertalingen maken meertalige versies van script, ondertitels en voice mogelijk. Start vanuit je project in Studio en exporteer per taal.",
      "Translations enable multilingual versions of script, subtitles, and voice. Start from your project in Studio and export per language."
    );
  }

  if (/hoe publiceer|how (do i )?publish|publishing/.test(text)) {
    return nl(
      input.locale,
      "Publishing bundelt je video, ondertitels, CTA en metadata voor export of distributie. Ga via Publish nadat voice, scenes en subtitles klaar zijn.",
      "Publishing bundles your video, subtitles, CTA, and metadata for export or distribution. Go through Publish once voice, scenes, and subtitles are ready."
    );
  }

  if (/pricing|prijzen|prijs/.test(text)) {
    return nl(
      input.locale,
      "Pricing toont creditkosten per actie (beeld, video, voice, morph). Abonnementen geven maandelijkse credits — zie /pricing voor actuele tarieven.",
      "Pricing shows credit costs per action (image, video, voice, morph). Subscriptions provide monthly credits — see /pricing for current rates."
    );
  }

  return null;
}
