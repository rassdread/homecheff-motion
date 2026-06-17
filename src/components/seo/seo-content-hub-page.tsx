import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { brand } from "@/lib/brand";
import { buildCollectionPageJsonLd } from "@/lib/seo/structured-data";
import type { SeoContentLink } from "@/lib/seo/seo-content-types";

type Props = {
  title: string;
  metaDescription: string;
  path: string;
  h1: string;
  intro: string;
  items: SeoContentLink[];
  hubLabel: string;
};

export function SeoContentHubPage({ title, metaDescription, path, h1, intro, items, hubLabel }: Props) {
  const jsonLd = buildCollectionPageJsonLd({
    title,
    description: metaDescription,
    path,
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: hubLabel, path },
    ],
    items: items.map((i) => ({ name: i.label, path: i.href })),
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10">
          <header className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">{hubLabel}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{h1}</h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">{intro}</p>
          </header>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm font-medium text-zinc-800 transition hover:border-emerald-300 hover:shadow-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/studio"
              className="inline-flex rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Open Studio
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Pricing
            </Link>
            <Link
              href="/signup"
              className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Sign up
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
