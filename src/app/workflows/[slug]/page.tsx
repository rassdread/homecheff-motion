import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { brand } from "@/lib/brand";
import { buildSeoLandingJsonLd } from "@/lib/seo/structured-data";
import { WORKFLOW_SLUGS, getWorkflow } from "@/lib/seo/workflows-content";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return WORKFLOW_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getWorkflow(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    locale: page.locale,
  });
}

function WorkflowPageView({ slug }: { slug: string }) {
  const page = getWorkflow(slug);
  if (!page) return null;

  const hubJsonLd = buildSeoLandingJsonLd({
    title: page.title,
    description: page.metaDescription,
    path: page.path,
    breadcrumbs: page.breadcrumbs.map((b) => ({ name: b.label, path: b.href })),
    faqs: page.faqs,
    sections: page.sections,
    includeArticle: false,
  });

  return (
    <>
      <JsonLd data={hubJsonLd} />
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
          <div className="mt-10 space-y-8 text-sm text-zinc-700">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-zinc-900">{section.heading}</h2>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-3 leading-relaxed">
                    {p}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
            {page.linkedGuides.length > 0 ? (
              <nav className="rounded-xl border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Gidsen</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {page.linkedGuides.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {page.linkedAlternatives.length > 0 ? (
              <nav className="rounded-xl border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Vergelijkingen
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {page.linkedAlternatives.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {page.productLinks.length > 0 ? (
              <nav className="rounded-xl border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Product</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {page.productLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {page.internalLinks.length > 0 ? (
              <nav
                className="rounded-xl border border-zinc-200 bg-white p-5"
                aria-label={page.locale === "nl" ? "Gerelateerde pagina's" : "Related pages"}
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {page.locale === "nl" ? "Verder lezen" : "Read next"}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {page.internalLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {page.faqs.length > 0 ? (
              <section id="faq">
                <h2 className="text-xl font-bold text-zinc-900">Veelgestelde vragen</h2>
                <dl className="mt-4 space-y-4">
                  {page.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-4"
                    >
                      <dt className="font-semibold text-zinc-900">{faq.question}</dt>
                      <dd className="mt-2 leading-relaxed text-zinc-600">{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={page.studioCta.href}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {page.studioCta.label}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Prijzen
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Gratis account
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}

export default async function WorkflowPage({ params }: Props) {
  const { slug } = await params;
  if (!getWorkflow(slug)) notFound();
  return <WorkflowPageView slug={slug} />;
}
