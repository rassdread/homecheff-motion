import { HelpCenterHome } from "@/components/help/help-center-pages";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata = buildPageMetadata({
  title: "Knowledge Center",
  description:
    "Use Studio with credits or choose a subscription for extra benefits and lower credit costs.",
  path: "/help",
});

export default function HelpPage() {
  return <HelpCenterHome />;
}
