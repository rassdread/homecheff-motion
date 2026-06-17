import { buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata = buildPageMetadata({
  title: "Pricing",
  description: "Studio credit packs, subscriptions and per-action pricing for Motion, voice, music and publishing.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
