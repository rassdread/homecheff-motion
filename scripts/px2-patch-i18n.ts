/**
 * One-shot PX.2 locale value patcher. Run: npx tsx scripts/px2-patch-i18n.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

type LocalePatch = { nl: string; en: string };

const VALUES: Record<string, LocalePatch> = {
  "nav.motion": { nl: "Animatie", en: "Animation" },
  "suite.nav.editor": { nl: "Beelden", en: "Images" },
  "suite.nav.studio": { nl: "Verhalen", en: "Stories" },
  "suite.product.editor": { nl: "Beelden", en: "Images" },
  "suite.product.studio": { nl: "Verhalen", en: "Stories" },
  "suite.product.motion": { nl: "Animatie", en: "Animation" },
  "suite.product.publish": { nl: "Video afronden", en: "Finish video" },
  "suite.home.headline": {
    nl: "Beeld, video en verhaal — in één studio.",
    en: "Images, video and story — in one studio.",
  },
  "suite.home.editor.title": { nl: "Beelden", en: "Images" },
  "suite.home.studio.title": { nl: "Verhalen", en: "Stories" },
  "suite.home.motion.title": { nl: "Animatie", en: "Animation" },
  "suite.home.publish.title": { nl: "Afronden", en: "Finish" },
  "suite.home.editor.action": { nl: "Beelden bewerken", en: "Edit images" },
  "suite.home.studio.action": { nl: "Nieuw verhaal", en: "New story" },
  "suite.home.motion.action": { nl: "Animatie starten", en: "Start animation" },
  "suite.home.publish.action": { nl: "Video afronden", en: "Finish video" },
  "marketing.positioning.tagline": {
    nl: "Beeld, video en verhaal — in één studio.",
    en: "Images, video and story — in one studio.",
  },
  "marketing.cta.startCreating": { nl: "Aan de slag", en: "Get started" },
  "marketing.createAnything.motion": { nl: "Animatie", en: "Animation" },
  "marketing.createAnything.publish": { nl: "Afronden", en: "Finish" },
  "marketing.ideaToContent.step.publish": { nl: "Afronden", en: "Finish" },
  "universe.hero.tagline": { nl: "Maak beeld en video.", en: "Make images and video." },
  "universe.hero.signedInReady": {
    nl: "Klaar om iets te maken.",
    en: "Ready to make something.",
  },
  "universe.hero.leadB": {
    nl: "Maak video, voeg stem en muziek toe, en rond het af.",
    en: "Make video, add voice and music, then finish it.",
  },
  "universe.hero.pipeline.publish": { nl: "Rond je video af.", en: "Finish your video." },
  "universe.hero.cta.startProject": {
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
  },
  "universe.hero.cta.startWithIdea": {
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
  },
  "universe.howItWorks.cta.startProject": {
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
  },
  "universe.whyStudio.cta.startProject": {
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
  },
  "universe.public.continueCreating": { nl: "Ga verder", en: "Continue" },
  "universe.public.startCreating": { nl: "Aan de slag", en: "Get started" },
  "universe.public.subheadlineAlt": {
    nl: "Van beeld naar verhaal naar animatie naar afronden — in één studio.",
    en: "From image to story to animation to finish — in one studio.",
  },
  "universe.home.gettingStarted.lead": {
    nl: "Begin met wat je wilt maken. Geavanceerde tools blijven beschikbaar.",
    en: "Start with what you want to make. Advanced tools stay available.",
  },
  "universe.home.gettingStarted.startProject": {
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
  },
  "universe.home.gettingStarted.openEditor": {
    nl: "Beelden bewerken",
    en: "Edit images",
  },
  "universe.home.gettingStarted.openLibrary": {
    nl: "Bibliotheek openen",
    en: "Open library",
  },
  "universe.howItWorks.cta.openEditor": { nl: "Beelden bewerken", en: "Edit images" },
  "universe.quick.publishVideo": { nl: "Video afronden", en: "Finish video" },
  "landing.editor.eyebrow": { nl: "Beelden", en: "Images" },
  "landing.studio.eyebrow": { nl: "Verhalen", en: "Stories" },
  "landing.studio.title": {
    nl: "Maak verhalen en video's",
    en: "Make stories and videos",
  },
  "landing.studio.subtitle": {
    nl: "Van idee naar scènes — zonder eerst de studio-architectuur te leren",
    en: "From idea to scenes — without learning Studio architecture first",
  },
  "landing.studio.primaryCta": { nl: "Nieuw verhaal", en: "New story" },
  "landing.studio.feature.storyboard": { nl: "Verhaal plannen", en: "Story planning" },
  "landing.studio.step.publish": { nl: "Afronden", en: "Finish" },
  "landing.motion.eyebrow": { nl: "Animatie", en: "Animation" },
  "landing.motion.primaryCta": { nl: "Animatie starten", en: "Start animation" },
  "landing.publish.eyebrow": { nl: "Afronden", en: "Finish" },
  "landing.publish.primaryCta": { nl: "Video afronden", en: "Finish video" },
  "landing.editor.feature.exportHandoff": {
    nl: "Doorgaan naar animatie of afronden",
    en: "Continue to animation or finish",
  },
  "studio.home.title": { nl: "Jouw studio", en: "Your studio" },
  "studio.home.subtitle": {
    nl: "Begin hier — verhalen, bestanden en recent werk op één plek.",
    en: "Start here — stories, files and recent work in one place.",
  },
  "studio.home.quick.storyboard": { nl: "Nieuw verhaal", en: "New story" },
  "studio.home.quick.character": { nl: "Nieuw personage", en: "New character" },
  "studio.home.quick.prop": { nl: "Nieuw object", en: "New object" },
  "studio.home.quick.location": { nl: "Nieuwe locatie", en: "New location" },
  "studio.home.quick.world": { nl: "Nieuwe stijlwereld", en: "New style world" },
  "studio.home.quick.library": { nl: "Bestanden openen", en: "Open files" },
  "studio.home.continueKind.character": { nl: "Personage", en: "Character" },
  "studio.home.continueKind.prop": { nl: "Object", en: "Object" },
  "studio.home.continueKind.world": { nl: "Stijlwereld", en: "Style world" },
  "studio.home.recentStoryboards": { nl: "Recente verhalen", en: "Recent stories" },
  "studio.home.allStoryboards": { nl: "Alle verhalen", en: "All stories" },
  "studio.account.privacyAnalytics": {
    nl: "Help HomeCheff Studio verbeteren met anoniem gebruik",
    en: "Help improve HomeCheff Studio with anonymous usage",
  },
  "studio.shell.newStory": { nl: "Nieuw verhaal", en: "New story" },
  "studio.shell.aiDirector": { nl: "Suggesties", en: "Suggestions" },
  "studio.start.newStory": { nl: "Nieuw verhaal", en: "New story" },
  "studio.start.myStories": { nl: "Mijn verhalen", en: "My stories" },
  "studio.feature.props.title": { nl: "Objecten", en: "Objects" },
  "studio.feature.worlds.title": { nl: "Stijlwerelden", en: "Style worlds" },
  "studio.feature.assets.title": { nl: "Bestanden", en: "Files" },
  "studio.tools.props": { nl: "Objecten", en: "Objects" },
  "studio.tools.world": { nl: "Stijlwereld", en: "Style world" },
  "studio.tools.consistency": { nl: "Zelfde stijl", en: "Same look" },
  "studio.tools.creationAssistant": { nl: "Volgende stappen", en: "Next steps" },
  "studio.tools.creativeDirector": { nl: "Suggesties", en: "Suggestions" },
  "studio.memory.tabTitle": { nl: "Kenmerken", en: "Traits" },
  "studio.directorV2.shell.title": { nl: "Suggesties", en: "Suggestions" },
  "studio.v9.right.aiDirector": { nl: "Suggesties", en: "Suggestions" },
  "assistant.title": { nl: "Hulp", en: "Help" },
  "studioCopilot.title": { nl: "Hulp", en: "Help" },
  "studioCopilot.restoreShort": { nl: "Hulp", en: "Help" },
  "studioCopilot.minimize": { nl: "Hulp minimaliseren", en: "Minimize help" },
  "studioCopilot.restore": { nl: "Hulp openen", en: "Open help" },
  "editor.v7.assistant.title": { nl: "Hulp", en: "Help" },
  "editor.v7.assistant.open": { nl: "Hulp", en: "Help" },
};

const NEW_KEYS: Record<string, LocalePatch> = {
  "studio.experience.chooser.title": {
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
  },
  "studio.experience.chooser.subtitle": {
    nl: "Kies een richting. Studio regelt de technische stappen op de achtergrond.",
    en: "Choose a direction. Studio handles the technical steps in the background.",
  },
  "studio.experience.unavailable.title": {
    nl: "Dit kunnen we nu nog niet maken",
    en: "This isn’t available yet",
  },
  "studio.experience.unavailable.generic": {
    nl: "Deze optie is nu niet beschikbaar. Kies iets anders om verder te gaan.",
    en: "This option isn’t available right now. Choose something else to continue.",
  },
  "studio.experience.unavailable.browse": {
    nl: "Kies wat je wilt maken",
    en: "Choose what you want to make",
  },
};

function setSingleLineValue(source: string, key: string, value: string): string {
  const keyLiteral = `"${key}"`;
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = new RegExp(`(${keyLiteral.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*)"(?:\\\\.|[^"\\\\])*"`);
  if (!re.test(source)) {
    throw new Error(`Could not patch single-line key: ${key}`);
  }
  return source.replace(re, `$1"${escaped}"`);
}

function insertAfterKey(source: string, afterKey: string, block: string): string {
  const keyLiteral = `"${afterKey}"`;
  const idx = source.indexOf(keyLiteral);
  if (idx < 0) throw new Error(`insertAfter missing ${afterKey}`);
  const lineEnd = source.indexOf("\n", idx);
  if (lineEnd < 0) throw new Error(`no newline after ${afterKey}`);
  return `${source.slice(0, lineEnd + 1)}${block}${source.slice(lineEnd + 1)}`;
}

function patchFile(path: string, locale: "nl" | "en") {
  let source = readFileSync(path, "utf8");
  for (const [key, pair] of Object.entries(VALUES)) {
    source = setSingleLineValue(source, key, pair[locale]);
  }
  if (!source.includes('"studio.experience.chooser.title"')) {
    const lines = Object.entries(NEW_KEYS)
      .map(([key, pair]) => `  "${key}": ${JSON.stringify(pair[locale])},`)
      .join("\n");
    source = insertAfterKey(source, "suite.start.title", `${lines}\n`);
  }
  writeFileSync(path, source);
}

patchFile("src/i18n/locales/nl.ts", "nl");
patchFile("src/i18n/locales/en.ts", "en");
console.log(`patched ${Object.keys(VALUES).length} keys + ${Object.keys(NEW_KEYS).length} new keys`);
