/**
 * HomeCheff Studio Affiliate — platform-specific explanation (SSR).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { StudioSiteFooter } from "@/components/layout/studio-site-footer";

export const metadata: Metadata = {
  title: "Studio Affiliate programma | 50% platformopbrengst · 12 maanden | HomeCheff Studio",
  description:
    "Breng een Studio-gebruiker aan en ontvang 12 maanden lang 50% van de in aanmerking komende HomeCheff Studio-platformopbrengst. Geen commissie over HC, btw of seller proceeds.",
  keywords: [
    "HomeCheff Studio affiliate",
    "Studio affiliate programma",
    "Studio referral",
    "Studio commissie",
    "geld verdienen met HomeCheff Studio",
  ],
  openGraph: {
    title: "Verdien 12 maanden mee met HomeCheff Studio",
    description:
      "50% van in aanmerking komende Studio-platformopbrengst. Niet over HC zelf. Ook Growth en Marketplace kunnen meetellen.",
    type: "website",
    locale: "nl_NL",
    url: "https://studio.homecheff.eu/affiliate",
    siteName: "HomeCheff Studio",
  },
  alternates: { canonical: "https://studio.homecheff.eu/affiliate" },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "Hoe werkt het HomeCheff Studio affiliateprogramma?",
    a: "HomeCheff Studio is het creatieve CREATE-platform van HomeCheff. Breng een Studio-gebruiker aan en ontvang 12 maanden lang 50% van de in aanmerking komende Studio-platformopbrengst.",
  },
  {
    q: "Hoeveel commissie ontvang ik?",
    a: "Je ontvangt 50% van de in aanmerking komende platformopbrengst. Btw en de waarde van HC zelf tellen niet mee.",
  },
  {
    q: "Hoe lang ontvang ik commissie?",
    a: "12 maanden vanaf de gekwalificeerde referral. Het venster reset niet bij planwissel, HC-aankoop of gebruik van andere HomeCheff-producten.",
  },
  {
    q: "Krijg ik commissie over HC?",
    a: "Nee. HC zelf genereert geen affiliatecommissie. Een HC-pakketverkoop kan wel meetellen via de in aanmerking komende platformopbrengst van die aankoop.",
  },
  {
    q: "Tellen HC-pakketten mee?",
    a: "In aanmerking komende platformopbrengsten uit HC-pakketten kunnen meetellen. Er wordt nooit 50% over de HC-waarde zelf berekend.",
  },
  {
    q: "Telt gebruik van Growth of HomeCheff Marketplace ook mee?",
    a: "Ja, binnen dezelfde 12 maanden kunnen in aanmerking komende platformopbrengsten op Growth en Marketplace meetellen.",
  },
  {
    q: "Wat gebeurt er bij een refund?",
    a: "Refunds en chargebacks kunnen je commissie corrigeren of terugdraaien.",
  },
];

export default function StudioAffiliatePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "HomeCheff Studio Affiliate",
        url: "https://studio.homecheff.eu/affiliate",
        description:
          "50% van in aanmerking komende Studio-platformopbrengst gedurende 12 maanden per aangebrachte gebruiker.",
        isPartOf: { "@type": "WebSite", name: "HomeCheff Studio", url: "https://studio.homecheff.eu" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "HomeCheff Studio", item: "https://studio.homecheff.eu" },
          { "@type": "ListItem", position: 2, name: "Affiliate", item: "https://studio.homecheff.eu/affiliate" },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "Organization",
        name: "HomeCheff",
        url: "https://homecheff.eu",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          HomeCheff Affiliate · Studio
        </p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">
          Verdien 12 maanden mee met HomeCheff Studio
        </h1>
        <p className="mt-4 text-center text-base leading-relaxed text-zinc-700">
          HomeCheff Studio is het creatieve CREATE-platform van HomeCheff. Breng een Studio-gebruiker
          aan en ontvang 12 maanden lang 50% van de in aanmerking komende Studio-platformopbrengst.
        </p>

        <section className="mt-10 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Wat telt mee?</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            <li>Studio-abonnementen (Creator, Pro, Studio) kunnen platformopbrengst genereren.</li>
            <li>
              In aanmerking komende platformopbrengsten uit HC-pakketten kunnen meetellen — niet de
              waarde van HC zelf.
            </li>
            <li>Btw, seller proceeds en HC zelf vallen buiten de commissiebasis.</li>
            <li>Refunds en chargebacks kunnen commissie corrigeren.</li>
          </ul>
          <p className="text-sm leading-relaxed text-zinc-600">
            Je ontvangt 50% van de in aanmerking komende platformopbrengst. Btw en de waarde van HC
            zelf tellen niet mee.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/account/affiliate"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Bekijk mijn affiliate-dashboard
            </Link>
            <Link
              href="/account/affiliate"
              className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Start als affiliate
            </Link>
          </div>
        </section>

        <section className="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
          <h2 className="text-lg font-semibold text-emerald-950">
            Ook verdienen op andere HomeCheff-platformen
          </h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Gebruikt jouw aangebrachte lid later ook Growth of HomeCheff Marketplace? Dan kunnen ook
            daar in aanmerking komende platformopbrengsten meetellen binnen dezelfde 12 maanden.
          </p>
          <ul className="space-y-2 text-sm font-medium">
            <li>
              <a
                href="https://growth.homecheff.eu/affiliate"
                className="text-emerald-900 underline-offset-2 hover:underline"
              >
                Affiliate verdienen met HomeCheff Growth
              </a>
            </li>
            <li>
              <a
                href="https://homecheff.eu/affiliate"
                className="text-emerald-900 underline-offset-2 hover:underline"
              >
                Affiliate verdienen op HomeCheff Marketplace
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">Veelgestelde vragen</h2>
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{f.a}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-center text-xs text-zinc-500">
          Geen gegarandeerd inkomen. Everybody Eats.
        </p>
      </main>
      <StudioSiteFooter />
    </div>
  );
}
