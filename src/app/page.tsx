import type { Metadata } from "next";
import { HomePage } from "@/components/landing/home-page";
import { StudioEntityBrief } from "@/components/seo/studio-entity-brief";
import { maybeSilentHydrateWhenEcosystemSessionLikely } from "@/lib/identity/sso/ecosystem-epoch-hydrate";
import { getTranslator } from "@/i18n";
import { resolveStudioRequestLocale } from "@/i18n/request-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveStudioRequestLocale();
  const t = getTranslator(locale);
  return {
    title: t("seo.home.title"),
    description: t("seo.home.description"),
    openGraph: {
      title: t("seo.home.title"),
      description: t("seo.home.description"),
      locale: locale === "nl" ? "nl_NL" : "en_GB",
    },
  };
}

/**
 * SEO 0 — public marketing homepage for cold anonymous / crawlers.
 * If hc_eco_epoch indicates a HomeCheff IdP session → silent Studio auto-entry.
 */
export default async function Home() {
  await maybeSilentHydrateWhenEcosystemSessionLikely("/");
  return (
    <>
      <HomePage />
      <StudioEntityBrief />
    </>
  );
}
