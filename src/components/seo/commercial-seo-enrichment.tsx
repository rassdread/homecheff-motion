import Link from "next/link";

type Variant = "studio" | "pricing" | "signup" | "motion";

const COMPARISON_LINKS = [
  { href: "/alternatives/runway", label: "Runway alternative" },
  { href: "/alternatives/capcut", label: "CapCut alternative" },
  { href: "/alternatives/invideo", label: "InVideo alternative" },
  { href: "/alternatives/canva", label: "Canva alternative" },
] as const;

const WORKFLOW_LINKS = [
  { href: "/workflows/marketing", label: "Marketing workflow" },
  { href: "/workflows/youtuber", label: "YouTube workflow" },
  { href: "/guides/how-to-create-marketing-videos", label: "Marketing video guide" },
] as const;

const COPY: Record<
  Variant,
  { heading: string; body: string; faqHeading?: string; faqs?: Array<{ q: string; a: string }> }
> = {
  studio: {
    heading: "Why teams choose HomeCheff Studio over clip-only AI tools",
    body: "Plan full stories in storyboards, reuse characters across campaigns, add voice and subtitles, then publish — without rebuilding assets in separate apps. Compare alternatives or open pricing before your first pilot.",
  },
  pricing: {
    heading: "Transparent credits vs surprise subscriptions",
    body: "HomeCheff charges per studio action — storyboards, motion, voice, and publish — with optional subscriptions to lower unit cost. Start free, then scale with credit packs when campaigns repeat.",
    faqHeading: "Pricing quick answers",
    faqs: [
      {
        q: "Can I try HomeCheff without subscribing?",
        a: "Yes. Create a free account and run a pilot storyboard or motion clip before buying credits.",
      },
      {
        q: "How does HomeCheff compare to Runway or CapCut?",
        a: "Clip tools excel at one-off renders. HomeCheff connects storyboards, motion, voice, and publishing in one production line.",
      },
    ],
  },
  signup: {
    heading: "Start free — ship your first AI video this week",
    body: "Sign up to access Studio storyboards, image-to-video motion, voice, subtitles, and publishing. No credit card required for your first exploration.",
    faqHeading: "Before you sign up",
    faqs: [
      {
        q: "What can I do on a free account?",
        a: "Explore Studio, run guided motion from images, and review pricing before purchasing credits.",
      },
      {
        q: "Where should I go after signup?",
        a: "Open Studio for storyboards or Image to Video for quick motion clips, then compare plans on pricing.",
      },
    ],
  },
  motion: {
    heading: "Image to video that hands off to Studio",
    body: "Generate motion from stills, then promote winning clips into storyboard scenes with shared characters, voice, and publish versions — without exporting through five tools.",
  },
};

const PRODUCT_LINKS: Record<Variant, Array<{ href: string; label: string }>> = {
  studio: [
    { href: "/animate/instant", label: "Image to video" },
    { href: "/pricing", label: "Pricing" },
    { href: "/signup", label: "Create free account" },
  ],
  pricing: [
    { href: "/studio", label: "Studio storyboards" },
    { href: "/animate/instant", label: "Image to video" },
    { href: "/signup", label: "Sign up free" },
  ],
  signup: [
    { href: "/studio", label: "Open Studio" },
    { href: "/animate/instant", label: "Try image to video" },
    { href: "/pricing", label: "View pricing" },
  ],
  motion: [
    { href: "/studio", label: "Studio storyboards" },
    { href: "/pricing", label: "Pricing" },
    { href: "/signup", label: "Sign up free" },
  ],
};

type Props = { variant: Variant };

export function CommercialSeoEnrichment({ variant }: Props) {
  const copy = COPY[variant];
  const productLinks = PRODUCT_LINKS[variant];

  return (
    <section
      className="border-t border-zinc-200 bg-zinc-50/80"
      aria-label="HomeCheff Studio product overview"
    >
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
        <h2 className="text-lg font-bold text-zinc-900">{copy.heading}</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{copy.body}</p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <nav aria-label="Product links">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Product</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-medium text-emerald-800 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Comparisons and guides">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Compare & learn
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              {COMPARISON_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-zinc-700 hover:text-emerald-800 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              {WORKFLOW_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-zinc-700 hover:text-emerald-800 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {copy.faqs && copy.faqs.length > 0 ? (
          <div className="mt-8">
            {copy.faqHeading ? (
              <h3 className="text-sm font-semibold text-zinc-900">{copy.faqHeading}</h3>
            ) : null}
            <dl className="mt-3 space-y-4">
              {copy.faqs.map((faq) => (
                <div key={faq.q}>
                  <dt className="text-sm font-medium text-zinc-900">{faq.q}</dt>
                  <dd className="mt-1 text-sm text-zinc-600">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}
