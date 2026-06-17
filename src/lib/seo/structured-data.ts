import { HOMECHEFF_BRAND_ICON_PATHS } from "@/lib/homecheff-brand-icon";
import { getCanonicalStudioOrigin } from "@/lib/public-origin";
import { absoluteUrl } from "@/lib/seo/site-metadata";

const SITE_NAME = "HomeCheff Studio";
const ORGANIZATION_NAME = "HomeCheff";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORGANIZATION_NAME,
    url: getCanonicalStudioOrigin(),
    logo: absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source),
    brand: {
      "@type": "Brand",
      name: ORGANIZATION_NAME,
    },
    sameAs: [] as string[],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_NAME,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/help")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    image: absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source),
    description:
      "AI video production software with image-to-video generation, storyboards, voice, subtitles, translation, and publishing.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      url: absoluteUrl("/pricing"),
    },
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_NAME,
    },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFaqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/** Pricing FAQ — English canonical strings for schema (matches pricing.faq.* i18n). */
export const PRICING_FAQ_SCHEMA: Array<{ question: string; answer: string }> = [
  {
    question: "Do credits expire?",
    answer:
      "Purchased credit packs do not expire while your account is active. Subscription monthly credits follow your plan rules — see Billing for details.",
  },
  {
    question: "What does a subscription include?",
    answer:
      "Subscriptions add monthly credits, storage, and lower per-action costs on credit packs. Plans scale from Creator to Studio for teams and power users.",
  },
  {
    question: "What happens if I cancel my subscription?",
    answer:
      "You keep unused purchased credits. Monthly subscription credits stop renewing at the end of your billing period.",
  },
  {
    question: "Can I buy credits without subscribing?",
    answer: "Yes. Credit packs work on any plan, including free. Subscribers pay less per pack.",
  },
  {
    question: "Where do I see my balance and receipts?",
    answer:
      "Sign in and open Billing & credits in your account for your balance, transaction history, and subscription management.",
  },
  {
    question: "What is the difference between monthly and yearly?",
    answer:
      "Monthly billing renews each month and you can cancel anytime. Yearly billing is paid once per year at roughly 17% lower cost than twelve monthly payments.",
  },
];

export function buildHelpArticleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  categoryLabel: string;
}) {
  return [
    buildBreadcrumbJsonLd([
      { name: "Help", path: "/help" },
      { name: input.categoryLabel, path: "/help" },
      { name: input.title, path: input.path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.title,
      description: input.description,
      url: absoluteUrl(input.path),
      image: absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source),
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source),
        },
      },
      mainEntityOfPage: absoluteUrl(input.path),
    },
  ];
}

export function buildSeoLandingJsonLd(input: {
  title: string;
  description: string;
  path: string;
  breadcrumbs: Array<{ name: string; path: string }>;
  faqs?: Array<{ question: string; answer: string }>;
}) {
  const schemas: Array<Record<string, unknown>> = [
    buildBreadcrumbJsonLd(input.breadcrumbs),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: input.title,
      description: input.description,
      url: absoluteUrl(input.path),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: absoluteUrl("/"),
      },
    },
  ];
  if (input.faqs && input.faqs.length > 0) {
    schemas.push(buildFaqPageJsonLd(input.faqs));
  }
  return schemas;
}

export function buildCollectionPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
  breadcrumbs: Array<{ name: string; path: string }>;
  items: Array<{ name: string; path: string }>;
}) {
  return [
    buildBreadcrumbJsonLd(input.breadcrumbs),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: input.title,
      description: input.description,
      url: absoluteUrl(input.path),
      hasPart: input.items.map((item) => ({
        "@type": "WebPage",
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  ];
}
