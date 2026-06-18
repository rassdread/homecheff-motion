import type { SeoContentLink, SeoContentPage } from "@/lib/seo/seo-content-types";
import {
  ALL_ALTERNATIVE_SLUGS,
  ALL_GUIDE_SLUGS,
  ALL_INDUSTRY_SLUGS,
  ALL_LOCATION_SLUGS,
  ALL_USE_CASE_SLUGS,
  ALL_WORKFLOW_SLUGS,
  seoLink,
} from "@/lib/seo/seo-slug-labels";

export type SeoContentKind =
  | "alternative"
  | "guide"
  | "workflow"
  | "location"
  | "use-case"
  | "industry";

const COMMERCIAL_EN: SeoContentLink[] = [
  seoLink("/studio"),
  seoLink("/animate/instant"),
  seoLink("/pricing"),
  seoLink("/signup"),
];

const COMMERCIAL_NL: SeoContentLink[] = [
  seoLink("/studio", "Studio storyboards"),
  seoLink("/animate/instant", "Image to video"),
  seoLink("/pricing", "Prijzen"),
  seoLink("/signup", "Gratis account"),
];

const ALTERNATIVE_CLUSTER_GUIDES: Record<string, string[]> = {
  canva: ["how-to-create-marketing-videos", "how-to-make-social-ads", "social-media-video-maker-ai"],
  capcut: ["how-to-make-tiktok-videos", "how-to-make-reels", "how-to-make-shorts"],
  runway: ["how-to-animate-photos", "ai-video-generator-online", "cinematic-video-ai"],
  pika: ["how-to-animate-photos", "photo-to-video-ai", "animate-image-with-ai"],
  invideo: ["how-to-create-explainer-videos", "how-to-create-marketing-videos", "marketing-video-maker-ai"],
  synthesia: ["how-to-create-explainer-videos", "how-to-make-education-videos"],
  heygen: ["how-to-create-explainer-videos", "how-to-create-marketing-videos"],
  descript: ["how-to-create-podcast-videos", "how-to-create-youtube-intros"],
  "premiere-pro": ["how-to-create-marketing-videos", "cinematic-video-for-brands"],
  "after-effects": ["how-to-animate-logos", "cinematic-video-ai"],
  photoshop: ["how-to-animate-photos", "how-to-create-product-videos"],
  elevenlabs: ["how-to-add-voiceover-to-videos", "how-to-create-explainer-videos"],
  kling: ["photo-to-video-ai", "cinematic-video-ai"],
  veed: ["how-to-make-shorts", "how-to-add-subtitles-to-videos"],
};

const WORKFLOW_CLUSTER_GUIDES: Record<string, string[]> = {
  marketing: ["how-to-create-marketing-videos", "how-to-create-explainer-videos", "marketing-video-maker-ai"],
  teacher: ["how-to-make-education-videos", "how-to-create-explainer-videos"],
  restaurant: ["how-to-make-restaurant-videos", "how-to-create-ai-food-videos"],
  "real-estate-agent": ["how-to-make-real-estate-videos", "photo-to-video-for-real-estate"],
  youtuber: ["how-to-make-shorts", "how-to-create-youtube-intros"],
  "tiktok-creator": ["how-to-make-tiktok-videos", "ai-video-for-tiktok"],
  musician: ["how-to-create-ai-music-videos", "cinematic-video-trailer"],
  "local-business-owner": ["how-to-create-local-business-videos", "local-commercial-video"],
  "marketing-agency": ["how-to-create-marketing-videos", "marketing-video-ab-testing"],
  charity: ["how-to-make-charity-videos", "story-video-for-nonprofits"],
  filmmaker: ["cinematic-video-ai", "van-verhaal-naar-video"],
  writer: ["van-verhaal-naar-video", "van-boek-naar-film"],
  artist: ["breng-je-tekeningen-tot-leven", "how-to-animate-illustrations"],
};

function pickByPrefix(map: Record<string, string[]>, slug: string): string[] {
  for (const [prefix, items] of Object.entries(map)) {
    if (slug.startsWith(prefix) || slug.includes(prefix)) {
      return items;
    }
  }
  return [];
}

function guideSiblings(slug: string, limit: number): string[] {
  const prefixes = [
    slug.split("-").slice(0, 3).join("-"),
    slug.split("-").slice(0, 2).join("-"),
    slug.split("-")[0] ?? slug,
  ];
  const out: string[] = [];
  for (const prefix of prefixes) {
    if (!prefix) continue;
    for (const s of ALL_GUIDE_SLUGS) {
      if (s !== slug && s.startsWith(prefix) && !out.includes(s)) {
        out.push(s);
      }
      if (out.length >= limit) return out;
    }
  }
  return out.slice(0, limit);
}

function mergeLinks(...groups: SeoContentLink[][]): SeoContentLink[] {
  const seen = new Set<string>();
  const out: SeoContentLink[] = [];
  for (const group of groups) {
    for (const link of group) {
      if (!link.href.startsWith("/") || seen.has(link.href)) continue;
      seen.add(link.href);
      out.push(link);
    }
  }
  return out;
}

function linksFromSlugs(base: string, slugs: string[]): SeoContentLink[] {
  return slugs.map((slug) => seoLink(`${base}/${slug}`));
}

function hubForKind(kind: SeoContentKind): SeoContentLink {
  const hubs: Record<SeoContentKind, SeoContentLink> = {
    alternative: seoLink("/alternatives"),
    guide: seoLink("/guides"),
    workflow: seoLink("/workflows"),
    location: seoLink("/locations"),
    "use-case": seoLink("/use-cases"),
    industry: seoLink("/industries"),
  };
  return hubs[kind];
}

function filterExisting(slugs: string[], pool: string[]): string[] {
  return slugs.filter((s) => pool.includes(s));
}

function enrichGuide(page: SeoContentPage): SeoContentLink[] {
  const slug = page.slug;
  const isNl = page.locale === "nl";
  const commercial = isNl ? COMMERCIAL_NL : COMMERCIAL_EN;

  const altSlugs = filterExisting(
    [
      ...pickByPrefix(
        {
          "ai-video": ["runway", "invideo", "capcut"],
          "ai-animation": ["runway", "pika", "luma"],
          "photo-to-video": ["runway", "pika", "capcut"],
          "marketing-video": ["canva", "invideo"],
          "commercial-video": ["invideo", "canva"],
          "social-media-video": ["canva", "capcut"],
          "product-video": ["pictory", "invideo"],
          "cinematic-video": ["runway", "luma"],
        },
        slug
      ),
    ],
    ALL_ALTERNATIVE_SLUGS
  );

  const wfSlugs = filterExisting(
    pickByPrefix(
      {
        "photo-to-video": ["photographer", "wedding-creator"],
        "marketing-video": ["marketing", "marketing-agency"],
        "social-media-video": ["tiktok-creator", "instagram-creator"],
        "how-to-make-restaurant": ["restaurant"],
        "how-to-make-real-estate": ["real-estate-agent"],
        "maak-je": ["creator-dreams", "artist"],
        "van-": ["writer", "filmmaker"],
      },
      slug
    ),
    ALL_WORKFLOW_SLUGS
  );

  const indSlugs = filterExisting(
    pickByPrefix(
      {
        "marketing-video": ["saas", "retail"],
        "product-video": ["retail", "technology"],
        "how-to-make-restaurant": ["food"],
        "how-to-make-real-estate": ["real-estate"],
      },
      slug
    ),
    ALL_INDUSTRY_SLUGS
  );

  const ucSlugs = filterExisting(
    pickByPrefix(
      {
        "marketing-video": ["for-ecommerce", "for-startups"],
        "social-media-video": ["for-creators"],
        "how-to-make-restaurant": ["for-restaurants"],
        "how-to-make-education": ["for-schools"],
      },
      slug
    ),
    ALL_USE_CASE_SLUGS
  );

  const relatedGuides = linksFromSlugs(
    "/guides",
    filterExisting([...guideSiblings(slug, 3)], ALL_GUIDE_SLUGS)
  );

  return mergeLinks(
    [hubForKind("guide")],
    relatedGuides,
    linksFromSlugs("/alternatives", altSlugs.slice(0, 2)),
    linksFromSlugs("/workflows", wfSlugs.slice(0, 2)),
    linksFromSlugs("/industries", indSlugs.slice(0, 1)),
    linksFromSlugs("/use-cases", ucSlugs.slice(0, 1)),
    slug.includes("local") ?
      linksFromSlugs("/locations", filterExisting(["amsterdam", "rotterdam"], ALL_LOCATION_SLUGS)) :
      [],
    commercial.slice(0, 2),
    page.internalLinks
  ).slice(0, 10);
}

function enrichAlternative(page: SeoContentPage): SeoContentLink[] {
  const slug = page.slug;
  const guideSlugs = filterExisting(
    ALTERNATIVE_CLUSTER_GUIDES[slug] ?? ["how-to-create-marketing-videos", "how-to-create-explainer-videos"],
    ALL_GUIDE_SLUGS
  );

  const videoTools = ["runway", "pika", "kling", "luma", "leonardo"];
  const editTools = ["canva", "capcut", "veed", "kapwing", "adobe-express"];
  const peerPool = videoTools.includes(slug) ? videoTools : editTools.includes(slug) ? editTools : [];
  const peerAlts = peerPool.filter((s) => s !== slug && ALL_ALTERNATIVE_SLUGS.includes(s)).slice(0, 1);

  return mergeLinks(
    [hubForKind("alternative")],
    linksFromSlugs("/guides", guideSlugs.slice(0, 3)),
    linksFromSlugs(
      "/workflows",
      filterExisting(["marketing", "marketing-agency", "youtuber"], ALL_WORKFLOW_SLUGS).slice(0, 2)
    ),
    linksFromSlugs("/industries", filterExisting(["saas", "retail"], ALL_INDUSTRY_SLUGS)),
    linksFromSlugs("/use-cases", filterExisting(["for-ecommerce", "for-creators"], ALL_USE_CASE_SLUGS)),
    linksFromSlugs("/alternatives", peerAlts),
    COMMERCIAL_EN,
    page.internalLinks
  ).slice(0, 10);
}

function enrichWorkflow(page: SeoContentPage): SeoContentLink[] {
  const slug = page.slug;
  const isNl = page.locale === "nl";
  const commercial = isNl ? COMMERCIAL_NL : COMMERCIAL_EN;
  const guideSlugs = filterExisting(
    WORKFLOW_CLUSTER_GUIDES[slug] ?? ["how-to-create-marketing-videos", "how-to-create-explainer-videos"],
    ALL_GUIDE_SLUGS
  );

  const altMap: Record<string, string[]> = {
    restaurant: ["canva", "capcut"],
    youtuber: ["capcut", "descript"],
    "tiktok-creator": ["capcut", "opus-clip"],
    musician: ["runway", "pika"],
    teacher: ["synthesia", "invideo"],
    "marketing-agency": ["canva", "invideo", "runway"],
    "real-estate-agent": ["canva", "pictory"],
  };

  return mergeLinks(
    [hubForKind("workflow")],
    linksFromSlugs("/guides", guideSlugs.slice(0, 3)),
    linksFromSlugs("/alternatives", filterExisting(altMap[slug] ?? ["canva", "runway"], ALL_ALTERNATIVE_SLUGS).slice(0, 2)),
    pickIndustryForWorkflow(slug),
    pickUseCaseForWorkflow(slug),
    commercial.slice(0, 2),
    page.internalLinks
  ).slice(0, 10);
}

function pickIndustryForWorkflow(slug: string): SeoContentLink[] {
  const map: Record<string, string[]> = {
    restaurant: ["food", "hospitality"],
    teacher: ["education"],
    "real-estate-agent": ["real-estate"],
    youtuber: ["technology"],
    charity: ["consulting"],
  };
  return linksFromSlugs(
    "/industries",
    filterExisting(map[slug] ?? ["saas", "retail"], ALL_INDUSTRY_SLUGS).slice(0, 1)
  );
}

function pickUseCaseForWorkflow(slug: string): SeoContentLink[] {
  const map: Record<string, string[]> = {
    restaurant: ["for-restaurants"],
    teacher: ["for-schools"],
    charity: ["for-nonprofits"],
    youtuber: ["for-creators"],
    "local-business-owner": ["for-ecommerce"],
  };
  return linksFromSlugs(
    "/use-cases",
    filterExisting(map[slug] ?? ["for-creators", "for-startups"], ALL_USE_CASE_SLUGS).slice(0, 1)
  );
}

function enrichLocation(page: SeoContentPage): SeoContentLink[] {
  return mergeLinks(
    [hubForKind("location")],
    linksFromSlugs(
      "/guides",
      filterExisting(
        ["how-to-create-local-business-videos", "local-commercial-video", "social-media-video-maker-ai"],
        ALL_GUIDE_SLUGS
      ).slice(0, 2)
    ),
    linksFromSlugs(
      "/workflows",
      filterExisting(["local-business-owner", "restaurant", "marketing"], ALL_WORKFLOW_SLUGS).slice(0, 2)
    ),
    linksFromSlugs(
      "/use-cases",
      filterExisting(["for-restaurants", "for-hotels", "for-local-governments"], ALL_USE_CASE_SLUGS).slice(0, 2)
    ),
    linksFromSlugs("/industries", filterExisting(["hospitality", "retail", "food"], ALL_INDUSTRY_SLUGS).slice(0, 1)),
    linksFromSlugs("/alternatives", filterExisting(["canva", "capcut"], ALL_ALTERNATIVE_SLUGS)),
    COMMERCIAL_EN.slice(0, 2),
    page.internalLinks
  ).slice(0, 10);
}

function enrichUseCase(page: SeoContentPage): SeoContentLink[] {
  const slug = page.slug;
  const industryMap: Record<string, string> = {
    "for-schools": "education",
    "for-universities": "education",
    "for-restaurants": "food",
    "for-hotels": "hospitality",
    "for-ecommerce": "retail",
    "for-startups": "saas",
    "for-churches": "consulting",
    "for-museums": "education",
  };
  const industry = industryMap[slug];

  return mergeLinks(
    [hubForKind("use-case")],
    linksFromSlugs("/industries", filterExisting(industry ? [industry] : ["saas", "education"], ALL_INDUSTRY_SLUGS)),
    linksFromSlugs(
      "/workflows",
      filterExisting(["marketing", "local-business-owner", "teacher"], ALL_WORKFLOW_SLUGS).slice(0, 2)
    ),
    linksFromSlugs(
      "/guides",
      filterExisting(["how-to-create-marketing-videos", "how-to-create-explainer-videos"], ALL_GUIDE_SLUGS)
    ),
    linksFromSlugs("/alternatives", filterExisting(["canva", "invideo"], ALL_ALTERNATIVE_SLUGS)),
    COMMERCIAL_EN.slice(0, 2),
    page.internalLinks
  ).slice(0, 10);
}

function enrichIndustry(page: SeoContentPage): SeoContentLink[] {
  const slug = page.slug;
  const useCaseMap: Record<string, string> = {
    food: "for-restaurants",
    education: "for-schools",
    hospitality: "for-hotels",
    retail: "for-ecommerce",
    saas: "for-startups",
    gaming: "for-creators",
  };
  const uc = useCaseMap[slug];

  return mergeLinks(
    [hubForKind("industry")],
    linksFromSlugs(
      "/use-cases",
      filterExisting(uc ? [uc] : ["for-ecommerce", "for-startups"], ALL_USE_CASE_SLUGS)
    ),
    linksFromSlugs(
      "/guides",
      filterExisting(
        ["how-to-create-marketing-videos", "marketing-video-maker-ai", "commercial-video-production-ai"],
        ALL_GUIDE_SLUGS
      ).slice(0, 2)
    ),
    linksFromSlugs("/workflows", filterExisting(["marketing", "marketing-agency"], ALL_WORKFLOW_SLUGS)),
    linksFromSlugs("/alternatives", filterExisting(["canva", "runway", "invideo"], ALL_ALTERNATIVE_SLUGS).slice(0, 2)),
    COMMERCIAL_EN.slice(0, 2),
    page.internalLinks
  ).slice(0, 10);
}

export function enrichSeoContentPage(page: SeoContentPage, kind: SeoContentKind): SeoContentPage {
  let links: SeoContentLink[];
  switch (kind) {
    case "guide":
      links = enrichGuide(page);
      break;
    case "alternative":
      links = enrichAlternative(page);
      break;
    case "workflow":
      links = enrichWorkflow(page);
      break;
    case "location":
      links = enrichLocation(page);
      break;
    case "use-case":
      links = enrichUseCase(page);
      break;
    case "industry":
      links = enrichIndustry(page);
      break;
    default:
      links = page.internalLinks;
  }

  if (links.length < 5) {
    links = mergeLinks(links, COMMERCIAL_EN, [
      seoLink("/guides"),
      seoLink("/alternatives"),
      seoLink("/workflows"),
    ]).slice(0, 10);
  }

  return { ...page, internalLinks: links };
}

export function buildInboundLinkStats(pages: SeoContentPage[]) {
  const inbound = new Map<string, number>();
  for (const p of pages) inbound.set(p.path, 0);

  const add = (href: string) => {
    if (inbound.has(href)) inbound.set(href, (inbound.get(href) ?? 0) + 1);
  };

  for (const page of pages) {
    for (const link of page.internalLinks) add(link.href);
    if (page.studioCta?.href) add(page.studioCta.href);
    for (const b of page.breadcrumbs) add(b.href);
    for (const link of page.linkedGuides ?? []) add(link.href);
    for (const link of page.linkedAlternatives ?? []) add(link.href);
    for (const link of page.productLinks ?? []) add(link.href);
  }

  return inbound;
}
