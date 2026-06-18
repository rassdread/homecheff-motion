import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { brand } from "@/lib/brand";
import { buildSeoLandingJsonLd } from "@/lib/seo/structured-data";
import type { SeoContentPage } from "@/lib/seo/seo-content-types";

const CTA_PRICING = { href: "/pricing", label: "Pricing" };
const CTA_SIGNUP = { href: "/signup", label: "Create free account" };
const CTA_SIGNUP_NL = { href: "/signup", label: "Gratis account aanmaken" };
const CTA_PRICING_NL = { href: "/pricing", label: "Prijzen" };

type Props = {
  page: SeoContentPage;
};

export function SeoContentPageView({ page }: Props) {
  const isNl = page.locale === "nl";
  const pricingCta = isNl ? CTA_PRICING_NL : CTA_PRICING;
  const signupCta = isNl ? CTA_SIGNUP_NL : CTA_SIGNUP;

  const jsonLd = buildSeoLandingJsonLd({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    breadcrumbs: page.breadcrumbs.map((b) => ({ name: b.label, path: b.href })),
    faqs: page.faqs,
    sections: page.sections,
    includeArticle: page.path.startsWith("/guides/"),
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
          <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
            <ol className="flex flex-wrap items-center gap-1">
              {page.breadcrumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  <Link href={crumb.href} className="hover:text-emerald-700 hover:underline">
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <header className="mt-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              {page.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{page.h1}</h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">{page.intro}</p>
          </header>

          <div className="prose prose-zinc mt-10 max-w-none space-y-10">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-zinc-900">{section.heading}</h2>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)} className="mt-3 text-sm leading-relaxed text-zinc-700">
                    {p}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                    {section.bullets.map((b) => (
                      <li key={b.slice(0, 48)}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {page.comparisonTable ? (
              <section>
                <h2 className="text-xl font-bold text-zinc-900">
                  HomeCheff Studio vs {page.comparisonTable.otherLabel}
                </h2>
                <div className="not-prose mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <th className="px-4 py-3 font-semibold text-zinc-900">Feature</th>
                        <th className="px-4 py-3 font-semibold text-emerald-800">HomeCheff Studio</th>
                        <th className="px-4 py-3 font-semibold text-zinc-700">
                          {page.comparisonTable.otherLabel}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.comparisonTable.rows.map((row) => (
                        <tr key={row.feature} className="border-b border-zinc-100 last:border-0">
                          <td className="px-4 py-3 font-medium text-zinc-800">{row.feature}</td>
                          <td className="px-4 py-3 text-zinc-700">{row.homecheff}</td>
                          <td className="px-4 py-3 text-zinc-600">{row.other}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {page.faqs.length > 0 ? (
              <section id="faq">
                <h2 className="text-xl font-bold text-zinc-900">
                  {isNl ? "Veelgestelde vragen" : "Frequently asked questions"}
                </h2>
                <dl className="mt-4 space-y-4">
                  {page.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-4"
                    >
                      <dt className="font-semibold text-zinc-900">{faq.question}</dt>
                      <dd className="mt-2 text-sm leading-relaxed text-zinc-600">{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {page.internalLinks.length > 0 ? (
              <nav
                className="not-prose rounded-xl border border-zinc-200 bg-white p-5"
                aria-label={isNl ? "Gerelateerde pagina's" : "Related pages"}
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {isNl ? "Verder lezen" : "Read next"}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {page.internalLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {page.disclaimers?.map((d) => (
              <p key={d.slice(0, 48)} className="text-xs leading-relaxed text-zinc-500">
                {d}
              </p>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={page.studioCta.href}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              {page.studioCta.label}
            </Link>
            <Link
              href={pricingCta.href}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              {pricingCta.label}
            </Link>
            <Link
              href={signupCta.href}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              {signupCta.label}
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
