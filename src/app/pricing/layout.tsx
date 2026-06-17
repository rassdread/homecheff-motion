import { buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Use Studio with credits or choose a subscription for extra benefits and lower credit costs. Pay yearly and save about 17%.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
