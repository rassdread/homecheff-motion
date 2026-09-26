/**
 * Compact Studio entry into the canonical HomeCheff affiliate proposition.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { StudioSiteFooter } from "@/components/layout/studio-site-footer";

const CANONICAL = "https://homecheff.eu/affiliate?product=studio#commissies";

export const metadata: Metadata = {
  title: "Verdien met Studio | HomeCheff",
  description:
    "Studio hoort bij het HomeCheff-affiliateprogramma. Bekijk de commissies op homecheff.eu. Geen gegarandeerd inkomen.",
  openGraph: {
    title: "Verdien met Studio",
    description:
      "Hetzelfde HomeCheff-affiliateprogramma, met Studio-commissies. Geen gegarandeerd inkomen.",
    type: "website",
    locale: "nl_NL",
    url: CANONICAL,
    siteName: "HomeCheff Studio",
  },
  alternates: { canonical: "https://homecheff.eu/affiliate?product=studio" },
  robots: { index: false, follow: true },
};

export default function StudioAffiliatePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          HomeCheff Affiliate
        </p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">Verdien met Studio</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-zinc-700">
          Studio hoort bij hetzelfde HomeCheff-affiliateprogramma. Je verdient mee wanneer een klant
          die jij aanbrengt kwalificerend gebruikmaakt van HomeCheff. Geen gegarandeerd inkomen.
        </p>
        <p className="mt-6 text-center">
          <a
            href={CANONICAL}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Bekijk de Studio-commissies
          </a>
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/account/affiliate" className="font-semibold text-zinc-800 underline-offset-2 hover:underline">
            Ga naar mijn Studio-affiliate
          </Link>
        </p>
      </main>
      <StudioSiteFooter />
    </div>
  );
}
