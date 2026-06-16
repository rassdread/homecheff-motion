export type AdminAssistantRecommendationCategory =
  | "trending"
  | "new"
  | "recommended"
  | "seasonal";

export type AdminAssistantRecommendation = {
  id: string;
  title: string;
  description: string;
  assistantPrompt: string;
  priority: number;
  route: string;
  active: boolean;
  category: AdminAssistantRecommendationCategory;
};

export const ADMIN_ASSISTANT_RECOMMENDATIONS: AdminAssistantRecommendation[] = [
  {
    id: "admin_seasonal_goal",
    title: "Doelpuntviering trending",
    description: "Maak een sportclip met je bestaande personage.",
    assistantPrompt: "Maak een doelpuntviering met mijn personage",
    priority: 90,
    route: "/animate/instant",
    active: true,
    category: "trending",
  },
  {
    id: "admin_new_mascot_motion",
    title: "Nieuw: mascotte animeren",
    description: "Zet een mascotte uit je bibliotheek in beweging.",
    assistantPrompt: "Maak een animatie van mijn mascotte",
    priority: 80,
    route: "/studio/characters/motion-ready",
    active: true,
    category: "new",
  },
  {
    id: "admin_publish_tiktok",
    title: "TikTok export",
    description: "Bereid een verticale export voor.",
    assistantPrompt: "Klaarzetten voor TikTok",
    priority: 70,
    route: "/publish",
    active: true,
    category: "recommended",
  },
  {
    id: "admin_seasonal_summer",
    title: "Zomer campagne",
    description: "Seizoensgebonden promotievideo starten.",
    assistantPrompt: "Maak een zomer promotievideo",
    priority: 60,
    route: "/studio/storyboards/new",
    active: false,
    category: "seasonal",
  },
];

export function listActiveAdminRecommendations(route?: string): AdminAssistantRecommendation[] {
  return ADMIN_ASSISTANT_RECOMMENDATIONS.filter((row) => {
    if (!row.active) {
      return false;
    }
    if (!route) {
      return true;
    }
    return route === "/" || row.route.startsWith(route) || route.startsWith(row.route);
  }).sort((a, b) => b.priority - a.priority);
}
