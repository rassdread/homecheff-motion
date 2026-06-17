export const HELP_CENTER_CATEGORIES = [
  "getting_started",
  "credits_billing",
  "motion",
  "studio",
  "voice",
  "music",
  "publishing",
  "faq",
] as const;

export type HelpCenterCategory = (typeof HELP_CENTER_CATEGORIES)[number];

export type HelpArticle = {
  slug: string;
  category: HelpCenterCategory;
  titleKey: string;
  descriptionKey: string;
  bodyKeys: string[];
  /** When set, article renders live pricing catalog instead of static body keys. */
  pricingCatalog?: boolean;
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "what-are-studio-credits",
    category: "credits_billing",
    titleKey: "help.articles.whatAreStudioCredits.title",
    descriptionKey: "help.articles.whatAreStudioCredits.description",
    bodyKeys: [
      "help.articles.whatAreStudioCredits.body1",
      "help.articles.whatAreStudioCredits.body2",
    ],
  },
  {
    slug: "how-subscriptions-work",
    category: "credits_billing",
    titleKey: "help.articles.howSubscriptionsWork.title",
    descriptionKey: "help.articles.howSubscriptionsWork.description",
    bodyKeys: [
      "help.articles.howSubscriptionsWork.body1",
      "help.articles.howSubscriptionsWork.body2",
    ],
  },
  {
    slug: "do-credits-expire",
    category: "credits_billing",
    titleKey: "help.articles.doCreditsExpire.title",
    descriptionKey: "help.articles.doCreditsExpire.description",
    bodyKeys: ["help.articles.doCreditsExpire.body1"],
  },
  {
    slug: "what-happens-when-i-cancel",
    category: "credits_billing",
    titleKey: "help.articles.whatHappensWhenICancel.title",
    descriptionKey: "help.articles.whatHappensWhenICancel.description",
    bodyKeys: ["help.articles.whatHappensWhenICancel.body1"],
  },
  {
    slug: "how-much-do-studio-actions-cost",
    category: "credits_billing",
    titleKey: "help.articles.howMuchDoActionsCost.title",
    descriptionKey: "help.articles.howMuchDoActionsCost.description",
    bodyKeys: ["help.articles.howMuchDoActionsCost.body1"],
    pricingCatalog: true,
  },
  {
    slug: "how-motion-pricing-works",
    category: "motion",
    titleKey: "help.articles.howMotionPricingWorks.title",
    descriptionKey: "help.articles.howMotionPricingWorks.description",
    bodyKeys: [
      "help.articles.howMotionPricingWorks.body1",
      "help.articles.howMotionPricingWorks.body2",
    ],
    pricingCatalog: true,
  },
  {
    slug: "how-campaign-codes-work",
    category: "credits_billing",
    titleKey: "help.articles.howCampaignCodesWork.title",
    descriptionKey: "help.articles.howCampaignCodesWork.description",
    bodyKeys: ["help.articles.howCampaignCodesWork.body1"],
  },
  {
    slug: "credits-vs-subscriptions",
    category: "credits_billing",
    titleKey: "help.articles.creditsVsSubscriptions.title",
    descriptionKey: "help.articles.creditsVsSubscriptions.description",
    bodyKeys: [
      "help.articles.creditsVsSubscriptions.body1",
      "help.articles.creditsVsSubscriptions.body2",
    ],
  },
  {
    slug: "monthly-vs-yearly-billing",
    category: "credits_billing",
    titleKey: "help.articles.monthlyVsYearly.title",
    descriptionKey: "help.articles.monthlyVsYearly.description",
    bodyKeys: [
      "help.articles.monthlyVsYearly.body1",
      "help.articles.monthlyVsYearly.body2",
    ],
  },
  {
    slug: "getting-started-with-studio",
    category: "getting_started",
    titleKey: "help.articles.gettingStarted.title",
    descriptionKey: "help.articles.gettingStarted.description",
    bodyKeys: [
      "help.articles.gettingStarted.body1",
      "help.articles.gettingStarted.body2",
    ],
  },
];

export function getHelpArticle(slug: string): HelpArticle | null {
  return HELP_ARTICLES.find((a) => a.slug === slug) ?? null;
}

export function listHelpArticlesByCategory(category: HelpCenterCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category);
}

export function helpCategoryLabelKey(category: HelpCenterCategory): string {
  return `help.category.${category}`;
}
