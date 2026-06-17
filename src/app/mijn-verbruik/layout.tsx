import type { Metadata } from "next";
import { buildNoIndexMetadata, buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Usage",
    description: "View your HomeCheff Studio credit usage and billing history.",
    path: "/mijn-verbruik",
  }),
  ...buildNoIndexMetadata(),
};

export default function MijnVerbruikLayout({ children }: { children: React.ReactNode }) {
  return children;
}
