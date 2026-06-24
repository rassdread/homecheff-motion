import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";
import type { StudioV11DirectorSuggestions } from "@/types/studio-v11-director-wizard";
import type { StudioV10NarrativeMode } from "@/types/studio-v10-story-planning";

function localeFrom(input?: string): "nl" | "en" {
  return input?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

function extractProperNames(idea: string): string[] {
  const matches = idea.match(/\b[A-Z][a-zà-ü]+(?:\s+[A-Z][a-zà-ü]+)?\b/g) ?? [];
  const stop = new Set(["Maak", "Video", "Van", "De", "Het", "Een", "In", "Rotterdam", "Nederland"]);
  return [...new Set(matches.filter((m) => !stop.has(m.split(" ")[0]!)))];
}

function mascotCount(idea: string): number {
  const lower = idea.toLowerCase();
  const digit = lower.match(/(\d+)\s*(mascot|mascotte)/);
  if (digit) return Math.min(5, Number(digit[1]) || 3);
  if (/drie mascotte|three mascot|3 mascotte/.test(lower)) return 3;
  if (/twee mascotte|two mascot|2 mascotte/.test(lower)) return 2;
  if (/mascot|mascotte/.test(lower)) return 3;
  return 0;
}

function defaultMascotNames(locale: "nl" | "en", count: number): string[] {
  const nl = ["Chef Mascotte", "Garden Mascotte", "Designer Mascotte", "Host Mascotte", "Community Mascotte"];
  const en = ["Chef Mascot", "Garden Mascot", "Designer Mascot", "Host Mascot", "Community Mascot"];
  const pool = locale === "nl" ? nl : en;
  return pool.slice(0, Math.max(1, count));
}

function rotterdamLocations(locale: "nl" | "en"): string[] {
  if (locale === "nl") {
    return ["Markthal Rotterdam", "Erasmus Universiteit", "Lijnbaan", "Stadhuisplein", "Rotterdam Blaak"];
  }
  return ["Markthal Rotterdam", "Erasmus University", "Lijnbaan", "City Hall Square", "Rotterdam Blaak"];
}

function genericLocations(locale: "nl" | "en"): string[] {
  return locale === "nl"
    ? ["Stadscentrum", "Marktplein", "Waterkant", "Hoofdkantoor"]
    : ["City center", "Market square", "Waterfront", "Main office"];
}

export function buildDirectorFieldSuggestions(input: {
  idea: string;
  selections: StudioProductionBriefSelections;
  brief?: StudioProductionBrief;
  locale?: string;
}): StudioV11DirectorSuggestions {
  const locale = localeFrom(input.locale);
  const idea = input.idea.trim();
  const lower = idea.toLowerCase();
  const names = extractProperNames(idea);
  const hero = names.find((n) => !/mascot/i.test(n)) ?? (lower.includes("sergio") ? "Sergio" : locale === "nl" ? "Hoofdpersoon" : "Lead");
  const mascots = mascotCount(idea);
  const characters = [
    hero,
    ...defaultMascotNames(locale, mascots > 0 ? mascots : lower.includes("mascot") ? 3 : 0),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const locations =
    lower.includes("rotterdam")
      ? rotterdamLocations(locale)
      : input.brief?.recommendedLocations.map((l) => l.name).slice(0, 4) ?? genericLocations(locale);

  const products =
    input.brief?.recommendedProps.map((p) => p.name).slice(0, 3) ??
    (lower.includes("product") || lower.includes("app")
      ? locale === "nl"
        ? ["HomeCheff app", "Platform highlight"]
        : ["HomeCheff app", "Platform highlight"]
      : []);

  const goalKey = input.selections.goals[0] ?? "promote";
  const goalMapNl: Record<string, string> = {
    sell: "Product verkopen",
    explain: "Concept uitleggen",
    promote: "Merk promoten",
    story: "Verhaal vertellen",
    social: "Social bereik vergroten",
    education: "Educatie",
  };
  const goalMapEn: Record<string, string> = {
    sell: "Sell product",
    explain: "Explain concept",
    promote: "Promote brand",
    story: "Tell a story",
    social: "Grow social reach",
    education: "Educate",
  };

  const audienceMapNl: Record<string, string> = {
    consumers: "Consumenten",
    business: "Ondernemers",
    youth: "Jonge makers",
    seniors: "Community builders",
    general: "Breed publiek",
  };
  const audienceMapEn: Record<string, string> = {
    consumers: "Consumers",
    business: "Entrepreneurs",
    youth: "Young creators",
    seniors: "Community builders",
    general: "General audience",
  };

  const narrativeNl =
    lower.includes("documentair") || lower.includes("documentary")
      ? "Documentair"
      : lower.includes("uitleg") || goalKey === "explain"
        ? "Uitleg"
        : lower.includes("community") || mascots > 0
          ? "Community verhaal"
          : goalKey === "sell"
            ? "Reclame"
            : "Verhaal";
  const narrativeEn =
    lower.includes("documentary")
      ? "Documentary"
      : goalKey === "explain"
        ? "Explainer"
        : mascots > 0
          ? "Community story"
          : goalKey === "sell"
            ? "Commercial"
            : "Story";

  const emotionKey = input.selections.tones[0] ?? "energetic";
  const emotionNl: Record<string, string> = {
    emotional: "Emotioneel",
    inspiring: "Inspirerend",
    funny: "Luchtig",
    serious: "Serieus",
    energetic: "Energiek",
    luxury: "Premium",
  };

  const lengthKey = input.selections.length[0] ?? "medium";
  const durationByLength: Record<string, { label: string; seconds: number }> =
    locale === "nl"
      ? {
          short: { label: "30 sec", seconds: 30 },
          medium: { label: "60 sec", seconds: 60 },
          long: { label: "90 sec", seconds: 90 },
          extended_3: { label: "3 min", seconds: 180 },
          extended_5: { label: "5 min", seconds: 300 },
          extended_10: { label: "10 min", seconds: 600 },
        }
      : {
          short: { label: "30 sec", seconds: 30 },
          medium: { label: "60 sec", seconds: 60 },
          long: { label: "90 sec", seconds: 90 },
          extended_3: { label: "3 min", seconds: 180 },
          extended_5: { label: "5 min", seconds: 300 },
          extended_10: { label: "10 min", seconds: 600 },
        };
  const duration = durationByLength[lengthKey] ?? durationByLength.medium!;

  const narrativeMode: StudioV10NarrativeMode =
    input.selections.narrative[0] === "narrator"
      ? "voice_over_only"
      : input.selections.narrative[0] === "characters"
        ? "dialogue_only"
        : input.selections.narrative[0] === "both"
          ? "voice_over_and_dialogue"
          : "voice_over_and_dialogue";

  const cta =
    goalKey === "sell"
      ? locale === "nl"
        ? "Product kopen"
        : "Buy product"
      : goalKey === "social"
        ? locale === "nl"
          ? "Registreren"
          : "Sign up"
        : locale === "nl"
          ? "Meer ontdekken"
          : "Discover more";

  return {
    characters: characters.slice(0, 6),
    locations: locations.slice(0, 5),
    products,
    goal: (locale === "nl" ? goalMapNl : goalMapEn)[goalKey] ?? goalKey,
    audience: (locale === "nl" ? audienceMapNl : audienceMapEn)[input.selections.audience[0] ?? "general"]!,
    cta,
    narrativeType: locale === "nl" ? narrativeNl : narrativeEn,
    emotion: emotionNl[emotionKey] ?? emotionKey,
    durationLabel: duration.label,
    durationSeconds: duration.seconds,
    dialogueMode: narrativeMode,
  };
}
