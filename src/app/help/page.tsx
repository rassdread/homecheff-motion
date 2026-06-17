import { HelpCenterHome } from "@/components/help/help-center-pages";
import { buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata = buildPageMetadata({
  title: "Knowledge Center",
  description:
    "Guides for Studio credits, billing, Motion, voice, music and publishing — in English and Dutch.",
  path: "/help",
});

export default function HelpPage() {
  return <HelpCenterHome />;
}
