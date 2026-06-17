export type SeoContentLink = {
  href: string;
  label: string;
};

export type SeoContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoComparisonRow = {
  feature: string;
  homecheff: string;
  other: string;
};

export type SeoContentPage = {
  slug: string;
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  eyebrow: string;
  intro: string;
  sections: SeoContentSection[];
  comparisonTable?: {
    otherLabel: string;
    rows: SeoComparisonRow[];
  };
  faqs: SeoFaq[];
  internalLinks: SeoContentLink[];
  studioCta: SeoContentLink;
  disclaimers?: string[];
  locale: "en" | "nl";
  breadcrumbs: SeoContentLink[];
};
