import { buildPageMetadata } from "@/lib/seo/site-metadata";

export const metadata = buildPageMetadata({
  title: "Studio",
  description: "Design characters, storyboards and production assets in HomeCheff Studio.",
  path: "/studio",
});

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
