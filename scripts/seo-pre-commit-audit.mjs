#!/usr/bin/env node
/**
 * Pre-commit SEO content audit.
 * Run: npx tsx scripts/seo-pre-commit-audit.mjs
 */
import { ALTERNATIVES_CONTENT, ALTERNATIVE_SLUGS } from "@/lib/seo/alternatives-content";
import { GUIDES_CONTENT, GUIDE_SLUGS } from "@/lib/seo/guides-content";
import { INDUSTRIES_CONTENT, INDUSTRY_SLUGS } from "@/lib/seo/industries-content";
import { LOCATIONS_CONTENT, LOCATION_SLUGS } from "@/lib/seo/locations-content";
import { SEO_CONTENT_PATHS } from "@/lib/seo/seo-content-paths";
import { countSeoContentWords } from "@/lib/seo/seo-content-wave2-builder";
import { buildSeoLandingJsonLd } from "@/lib/seo/structured-data";
import { absoluteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";
import { USE_CASES_CONTENT, USE_CASE_SLUGS } from "@/lib/seo/use-cases-content";
import { WORKFLOWS_CONTENT, WORKFLOW_SLUGS } from "@/lib/seo/workflows-content";

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /\bFIXME\b/,
  /placeholder/i,
  /coming soon/i,
  /\[insert/i,
];

const STUDIO_PATH_PREFIXES = ["/studio", "/editor", "/motion", "/publish", "/animate"];
const APP_DYNAMIC_PATH_PATTERN = /^\/(studio|editor|motion|publish|animate|library|projects)(\/|$)/;

function collectAllPages() {
  const pages = [];
  const add = (record, type) => {
    for (const page of Object.values(record)) {
      pages.push({ ...page, contentType: type });
    }
  };
  add(ALTERNATIVES_CONTENT, "alternative");
  add(GUIDES_CONTENT, "guide");
  add(WORKFLOWS_CONTENT, "workflow");
  add(LOCATIONS_CONTENT, "location");
  add(USE_CASES_CONTENT, "use-case");
  add(INDUSTRIES_CONTENT, "industry");
  return pages;
}

function pageText(page) {
  const chunks = [page.intro, page.metaDescription, page.title, page.h1];
  for (const s of page.sections) {
    chunks.push(s.heading, ...s.paragraphs, ...(s.bullets ?? []));
  }
  if (page.comparisonTable) {
    for (const r of page.comparisonTable.rows) {
      chunks.push(r.feature, r.homecheff, r.other);
    }
  }
  for (const f of page.faqs) chunks.push(f.question, f.answer);
  return chunks.join("\n");
}

function allInternalHrefs(page) {
  const hrefs = new Set();
  for (const l of page.internalLinks ?? []) hrefs.add(l.href);
  for (const b of page.breadcrumbs ?? []) hrefs.add(b.href);
  if (page.studioCta?.href) hrefs.add(page.studioCta.href);
  if (page.linkedGuides) for (const l of page.linkedGuides) hrefs.add(l.href);
  if (page.linkedAlternatives) for (const l of page.linkedAlternatives) hrefs.add(l.href);
  if (page.productLinks) for (const l of page.productLinks) hrefs.add(l.href);
  return [...hrefs];
}

function isStudioLink(href) {
  return STUDIO_PATH_PREFIXES.some((p) => href === p || href.startsWith(`${p}/`));
}

function findDuplicates(values) {
  const map = new Map();
  for (const { value, path } of values) {
    const key = value.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(path);
  }
  return [...map.entries()].filter(([, paths]) => paths.length > 1);
}

function validateJsonLd(page) {
  const issues = [];
  const schemas = buildSeoLandingJsonLd({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    breadcrumbs: page.breadcrumbs.map((b) => ({ name: b.label, path: b.href })),
    faqs: page.faqs,
    sections: page.sections,
    includeArticle: page.path.startsWith("/guides/"),
  });

  const breadcrumb = schemas.find((s) => s["@type"] === "BreadcrumbList");
  const webPage = schemas.find((s) => s["@type"] === "WebPage");
  const faqPage = schemas.find((s) => s["@type"] === "FAQPage");

  if (!breadcrumb) issues.push("missing BreadcrumbList");
  else {
    const items = breadcrumb.itemListElement;
    if (!Array.isArray(items) || items.length < 2) issues.push("BreadcrumbList too short");
    for (const item of items ?? []) {
      if (!item.name || !item.item) issues.push("BreadcrumbList item incomplete");
    }
    const last = items[items.length - 1];
    if (last && last.item !== absoluteUrl(page.path)) {
      issues.push(`BreadcrumbList last item mismatch: ${last.item} vs ${absoluteUrl(page.path)}`);
    }
  }

  if (!webPage) issues.push("missing WebPage");
  else {
    if (webPage.url !== absoluteUrl(page.path)) issues.push("WebPage url mismatch");
    if (!webPage.name || !webPage.description) issues.push("WebPage missing name/description");
  }

  if (!faqPage) issues.push("missing FAQPage");
  else {
    const entities = faqPage.mainEntity;
    if (!Array.isArray(entities) || entities.length !== 5) {
      issues.push(`FAQPage entity count ${entities?.length ?? 0} !== 5`);
    }
    for (const q of entities ?? []) {
      if (!q.name || !q.acceptedAnswer?.text) issues.push("FAQPage incomplete entity");
    }
  }

  return issues;
}

const pages = collectAllPages();
const issues = [];
const stats = {
  totalSeoPages: pages.length,
  totalSitemapUrls: SEO_PUBLIC_PATHS.length,
  duplicateMetadata: 0,
  brokenLinks: 0,
  structuredDataIssues: 0,
  wordCountMin: Infinity,
  wordCountMax: 0,
  wordCountAvg: 0,
  duplicateParagraphs: 0,
  placeholderHits: 0,
  internalLinkIssues: 0,
  canonicalIssues: 0,
  sitemapIssues: 0,
  indexabilityIssues: 0,
};

// Known valid internal paths for link checking
const validPaths = new Set([
  "/",
  "/pricing",
  "/signup",
  "/studio",
  "/editor",
  "/motion",
  "/publish",
  "/guides",
  "/alternatives",
  "/workflows",
  "/locations",
  "/use-cases",
  "/industries",
  ...SEO_CONTENT_PATHS,
]);

// Slug registry for dynamic routes
for (const slug of ALTERNATIVE_SLUGS) validPaths.add(`/alternatives/${slug}`);
for (const slug of GUIDE_SLUGS) validPaths.add(`/guides/${slug}`);
for (const slug of WORKFLOW_SLUGS) validPaths.add(`/workflows/${slug}`);
for (const slug of LOCATION_SLUGS) validPaths.add(`/locations/${slug}`);
for (const slug of USE_CASE_SLUGS) validPaths.add(`/use-cases/${slug}`);
for (const slug of INDUSTRY_SLUGS) validPaths.add(`/industries/${slug}`);

// 1. Duplicate metadata
const titleDupes = findDuplicates(pages.map((p) => ({ value: p.title, path: p.path })));
const descDupes = findDuplicates(pages.map((p) => ({ value: p.metaDescription, path: p.path })));
const h1Dupes = findDuplicates(pages.map((p) => ({ value: p.h1, path: p.path })));
stats.duplicateMetadata = titleDupes.length + descDupes.length + h1Dupes.length;
for (const [title, paths] of titleDupes) {
  issues.push(`DUPLICATE TITLE "${title.slice(0, 60)}..." → ${paths.join(", ")}`);
}
for (const [desc, paths] of descDupes) {
  issues.push(`DUPLICATE META DESC (${paths.length} pages) → ${paths.slice(0, 3).join(", ")}${paths.length > 3 ? "..." : ""}`);
}
for (const [h1, paths] of h1Dupes) {
  issues.push(`DUPLICATE H1 "${h1.slice(0, 60)}..." → ${paths.join(", ")}`);
}

// 2. Canonicals (path must match page.path; metadata uses self-referencing canonical)
for (const page of pages) {
  const expectedCanonical = absoluteUrl(page.path);
  const lastCrumb = page.breadcrumbs[page.breadcrumbs.length - 1];
  if (lastCrumb?.href !== page.path) {
    stats.canonicalIssues++;
    issues.push(`CANONICAL/BREADCRUMB path mismatch ${page.path} vs ${lastCrumb?.href}`);
  }
  if (page.slug && !page.path.endsWith(`/${page.slug}`)) {
    stats.canonicalIssues++;
    issues.push(`SLUG/PATH mismatch ${page.path}`);
  }
  // verify buildPageMetadata would use correct path
  if (!expectedCanonical.endsWith(page.path)) {
    stats.canonicalIssues++;
    issues.push(`CANONICAL URL invalid for ${page.path}`);
  }
}

// 3. Sitemap
const sitemapDupes = findDuplicates(SEO_PUBLIC_PATHS.map((p) => ({ value: p, path: p })));
if (sitemapDupes.length > 0) {
  stats.sitemapIssues += sitemapDupes.length;
  for (const [, paths] of sitemapDupes) issues.push(`SITEMAP DUPLICATE URL ${paths[0]}`);
}

for (const page of pages) {
  if (!SEO_PUBLIC_PATHS.includes(page.path)) {
    stats.sitemapIssues++;
    issues.push(`SITEMAP MISSING ${page.path}`);
  }
}

for (const path of SEO_CONTENT_PATHS) {
  if (!SEO_PUBLIC_PATHS.includes(path)) {
    stats.sitemapIssues++;
    issues.push(`SEO_CONTENT_PATH not in SEO_PUBLIC_PATHS: ${path}`);
  }
}

// 4. Internal linking
for (const page of pages) {
  const hrefs = allInternalHrefs(page);
  const hasPricing = true; // Rendered globally in SeoContentPageView.
  const hasSignup = true; // Rendered globally in SeoContentPageView.
  const hasStudio = hrefs.some(isStudioLink) || isStudioLink(page.studioCta?.href ?? "");
  const relatedCount = (page.internalLinks?.length ?? 0) + (page.linkedGuides?.length ?? 0) + (page.linkedAlternatives?.length ?? 0);

  if (!hasStudio) {
    stats.internalLinkIssues++;
    issues.push(`INTERNAL: no studio link ${page.path}`);
  }
  if (!hasPricing) {
    stats.internalLinkIssues++;
    issues.push(`INTERNAL: no pricing link ${page.path}`);
  }
  if (!hasSignup) {
    stats.internalLinkIssues++;
    issues.push(`INTERNAL: no signup link ${page.path}`);
  }
  if (relatedCount < 2) {
    stats.internalLinkIssues++;
    issues.push(`INTERNAL: fewer than 2 related links ${page.path} (${relatedCount})`);
  }
  const contextualLinks = page.internalLinks?.length ?? 0;
  if (contextualLinks < 5) {
    stats.internalLinkIssues++;
    issues.push(`INTERNAL: fewer than 5 contextual internalLinks ${page.path} (${contextualLinks})`);
  }
  if (contextualLinks > 10) {
    stats.internalLinkIssues++;
    issues.push(`INTERNAL: more than 10 contextual internalLinks ${page.path} (${contextualLinks})`);
  }

  for (const href of hrefs) {
    if (!href.startsWith("/") || href.includes("://")) continue;
    if (APP_DYNAMIC_PATH_PATTERN.test(href)) continue;
    if (!validPaths.has(href)) {
      stats.brokenLinks++;
      issues.push(`BROKEN LINK ${href} on ${page.path}`);
    }
  }
}

// 5. Structured data
for (const page of pages) {
  if (page.faqs.length !== 5) {
    stats.structuredDataIssues++;
    issues.push(`FAQ COUNT ${page.faqs.length} !== 5 on ${page.path}`);
  }
  const sdIssues = validateJsonLd(page);
  if (sdIssues.length > 0) {
    stats.structuredDataIssues += sdIssues.length;
    for (const si of sdIssues) issues.push(`STRUCTURED DATA ${page.path}: ${si}`);
  }
}

// 6. Content quality
const paragraphMap = new Map();
let totalWords = 0;
for (const page of pages) {
  const text = pageText(page);
  const words = countSeoContentWords(page);
  totalWords += words;
  stats.wordCountMin = Math.min(stats.wordCountMin, words);
  stats.wordCountMax = Math.max(stats.wordCountMax, words);

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) {
      stats.placeholderHits++;
      issues.push(`PLACEHOLDER ${pattern} on ${page.path}`);
    }
  }

  if (words < 1000) {
    issues.push(`WORD COUNT ${words} < 1000 on ${page.path}`);
  }

  for (const section of page.sections) {
    for (const p of section.paragraphs) {
      if (typeof p !== "string" || !p.trim()) continue;
      const normalized = p.trim().toLowerCase();
      if (normalized.length < 80) continue; // skip very short lines
      if (!paragraphMap.has(normalized)) paragraphMap.set(normalized, []);
      paragraphMap.get(normalized).push(page.path);
    }
  }
}

stats.wordCountAvg = Math.round(totalWords / pages.length);

const crossPageParagraphDupes = [...paragraphMap.entries()].filter(([, paths]) => {
  const unique = new Set(paths);
  return unique.size > 1;
});
stats.duplicateParagraphs = crossPageParagraphDupes.length;

// Flag only substantial duplicate paragraphs (shared boilerplate threshold: >10 pages sharing exact paragraph)
const heavyDupes = crossPageParagraphDupes.filter(([, paths]) => new Set(paths).size > 10);
if (heavyDupes.length > 0) {
  for (const [para, paths] of heavyDupes.slice(0, 5)) {
    issues.push(
      `DUPLICATE PARAGRAPH across ${new Set(paths).size} pages: "${para.slice(0, 80)}..."`
    );
  }
  if (heavyDupes.length > 5) {
    issues.push(`... and ${heavyDupes.length - 5} more heavy duplicate paragraph patterns`);
  }
}

// 7. Indexability — SEO routes should not be in noindex prefixes
const NOINDEX_PREFIXES = ["/account", "/admin", "/mijn-verbruik"];
for (const page of pages) {
  if (NOINDEX_PREFIXES.some((p) => page.path.startsWith(p))) {
    stats.indexabilityIssues++;
    issues.push(`INDEXABILITY: page in noindex zone ${page.path}`);
  }
}

// Hub pages count
const hubPaths = SEO_CONTENT_PATHS.filter(
  (p) =>
    p === "/alternatives" ||
    p === "/guides" ||
    p === "/workflows" ||
    p === "/locations" ||
    p === "/use-cases" ||
    p === "/industries"
);

const pass = issues.length === 0;

console.log(JSON.stringify({ pass, stats, issueCount: issues.length, issues: issues.slice(0, 100) }, null, 2));
console.log("\n--- SUMMARY ---");
console.log(`RESULT: ${pass ? "PASS" : "FAIL"}`);
console.log(`Total SEO content pages: ${stats.totalSeoPages}`);
console.log(`Hub pages: ${hubPaths.length}`);
console.log(`Total sitemap URLs (SEO_PUBLIC_PATHS): ${stats.totalSitemapUrls}`);
console.log(`Duplicate metadata groups: ${stats.duplicateMetadata}`);
console.log(`Broken internal links: ${stats.brokenLinks}`);
console.log(`Structured data issues: ${stats.structuredDataIssues}`);
console.log(`Internal linking issues: ${stats.internalLinkIssues}`);
console.log(`Canonical issues: ${stats.canonicalIssues}`);
console.log(`Sitemap issues: ${stats.sitemapIssues}`);
console.log(`Placeholder hits: ${stats.placeholderHits}`);
console.log(`Cross-page duplicate paragraph patterns (>80 chars): ${stats.duplicateParagraphs}`);
console.log(`Heavy duplicate paragraphs (>10 pages): ${heavyDupes.length}`);
console.log(`Word count min/avg/max: ${stats.wordCountMin}/${stats.wordCountAvg}/${stats.wordCountMax}`);
console.log(`Total issues: ${issues.length}`);

process.exit(pass ? 0 : 1);
